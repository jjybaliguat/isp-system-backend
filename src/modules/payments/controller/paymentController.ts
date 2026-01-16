import { Request, Response } from "express";
import { Xendit } from "xendit-node";
import { decrypt } from "../../../utils/hasher";

import { PrismaClient } from "@prisma/client";
import { sendSms } from "../../../jobs/sendSms";

const prisma = new PrismaClient();

export const getPayments = async(req: Request, res: Response) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
  const status =
  typeof req.query.status === "string" && req.query.status !== "ALL"
    ? req.query.status
    : undefined;
  const month = typeof req.query.month === "string" ? req.query.month : undefined;
  const year = typeof req.query.year === "string" ? req.query.year : undefined;
  const providerId = req.user.providerId;
  const skip = (page - 1) * limit;
  
  try {
    const whereClause: any = {
      client: {
          providerId,
      },
      };
      // Optional filters
      if (status) whereClause.status = status;
      if (month && year) {
          const startDate = new Date(Number(year), Number(month) - 1, 1)
          const endDate = new Date(Number(year), Number(month), 0, 23, 59, 59)
          whereClause.billing = {
              dueDate: {
                gte: startDate,
                lte: endDate,
              }
          }
          }
      if (search) {
      whereClause.OR = [
          {
          client: {
              fullName: { contains: search, mode: "insensitive" },
          },
          },
          {
          client: {
              accountNumber: { contains: search, mode: "insensitive" },
          },
          },
          {
          referenceId: { contains: search, mode: "insensitive" },
          },
      ];
      }
      
      const [payments, total] = await Promise.all([
        prisma.payment.findMany({
            where: whereClause,
            include: {
            client: {
                select: {
                id: true,
                fullName: true,
                accountNumber: true,
                },
            },
            account: {
              include: {
                  client: {
                    select: {
                    id: true,
                    fullName: true,
                    accountNumber: true,
                  },
                },
              }
            },
            billing: {
              select: {
                id: true,
                period: true,
                status: true
              }
            }
            },
            orderBy: { createdAt: "desc" },
            skip,
            take: limit,
        }),
        prisma.payment.count({ where: whereClause }),
        ]);

        return res.status(200).json({
          data: payments,
          pagination: {
              total,
              page,
              limit,
              totalPages: Math.ceil(total / limit),
          },
          });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

export const createPayment = async (req: Request, res: Response) => {
  const { billingId } = req.params as { billingId: string };

  try {
    const billing = await prisma.billing.findUnique({
      where: { id: billingId },
      include: { client: true },
    });
    
    if (!billing) {
      return res.status(404).json({ error: "Billing not found" });
    }
    
    const provider = await prisma.provider.findUnique({
      where: {
        id: billing.client.providerId
      }
    })

    const xenditKey = provider?.xenditApiKey
    if(!xenditKey) return res.status(400).json({message: "This provider is not accepting e-payments as of now"})

    const decryptedKey = decrypt(xenditKey);

    const xenditClient = new Xendit({
      secretKey: decryptedKey!,
    })

    const { Invoice } = xenditClient;

    const outstandingAmount = Math.max(
      billing.amount - billing.paidAmount,
      0
    );

    // Fully paid already
    if (outstandingAmount === 0) {
      return res.status(200).json({
        message: "Billing already fully paid",
      });
    }

    const existingPayment = await prisma.payment.findFirst({
      where: {
        billingId,
        paymentMethod: "XENDIT",
        status: "PENDING",
      },
      orderBy: { createdAt: "desc" },
    });

    // ✅ Reuse ONLY if amount still matches outstanding balance
    if (existingPayment && Number(existingPayment.amount) === (outstandingAmount + provider.paymentConvenienceFee)) {
      return res.status(200).json({
        message: "Payment already exists",
        payment: existingPayment,
        xenditInvoiceUrl: existingPayment.xenditPaymentUrl,
      });
    }

    // ❌ Invalidate old pending payment if amount mismatch
    if (existingPayment) {
      await prisma.payment.update({
        where: { id: existingPayment.id },
        data: {
          status: "CANCELLED",
          recordedBy: "Outstanding amount changed",
        },
      });
    }

    // Create Xendit Invoice
    const invoiceDuration =
      (provider.invoiceDurationDays ?? 1) * 24 * 60 * 60;
    const invoice = await Invoice.createInvoice({
        data: {
          externalId: `${billing.invoiceNumber}-${Date.now()}`,
          payerEmail: billing.client.email,
          description: billing.description || `Payment for billing #${billing.client.accountNumber}`,
          amount: outstandingAmount + provider.paymentConvenienceFee,
          invoiceDuration,
          shouldSendEmail: true,
          successRedirectUrl: `https://sierracommunication.net/client-portal/payment/success?id=${billing.id}`,
          failureRedirectUrl: "https://sierracommunication.net/client-portal/payment/failure",
        }
    });

    // Create Payment record in DB
    const payment = await prisma.payment.create({
      data: {
        billingId: billing.id!,
        clientId: billing.clientId!,
        accountId: billing.accountId!,
        amount: outstandingAmount + provider.paymentConvenienceFee,
        paymentMethod: "XENDIT",
        xenditInvoiceId: invoice.id!,
        xenditPaymentUrl: invoice.invoiceUrl!,
        status: "PENDING"
      },
    });

    return res.status(201).json({
      message: "Payment created successfully",
      payment,
      xenditInvoiceUrl: invoice.invoiceUrl,
    });
  } catch (error: any) {
      // 🛡️ HANDLE DUPLICATE RACE CONDITION
      if (error.code === "P2002") {
        const payment = await prisma.payment.findFirst({
          where: {
            billingId,
            paymentMethod: "XENDIT",
          },
        });

        return res.status(200).json({
          message: "Payment already exists",
          payment,
          xenditInvoiceUrl: payment?.xenditPaymentUrl,
        });
      }

       console.error(error);
       return res.status(500).json({ error: "Failed to create payment" });
    }
};

export const xenditWebhook = async (req: Request, res: Response) => {

  // Defensive: ensure req.body is an object
  if (!req.body || typeof req.body !== 'object') {
    return res.status(400).json({ message: "Missing or invalid request body" });
  }

  // Extract fields with fallback to undefined
  const xenditInvoiceId = req.body.id;
  const status = req.body.status;
  const amount = req.body.amount;
  const external_id = req.body.external_id;
  const paid_at = req.body.paid_at;
  const payment_channel = req.body.payment_channel;

  // Validate required fields for all webhook events
  if (!xenditInvoiceId || typeof xenditInvoiceId !== 'string') {
    return res.status(400).json({ message: "Missing or invalid 'id' in webhook payload" });
  }
  if (!status || typeof status !== 'string') {
    return res.status(400).json({ message: "Missing or invalid 'status' in webhook payload" });
  }

  // For PAID status, require additional fields
  if (status === 'PAID') {
    if (!paid_at || typeof paid_at !== 'string') {
      return res.status(400).json({ message: "Missing or invalid 'paid_at' for PAID status" });
    }
    if (!payment_channel || typeof payment_channel !== 'string') {
      return res.status(400).json({ message: "Missing or invalid 'payment_channel' for PAID status" });
    }
  }

  try {

    const payment = await prisma.payment.findUnique({ where: { xenditInvoiceId } });

    if (!payment) {
      // Gateway behavior: forward to legacy webhook URL if payment not found locally
      const forwardUrl = 'https://sierracommunication.com/xendit/payinvoice';
      try {
        // Build headers to forward (only string values)
        const forwardHeaders: Record<string, string> = {};
        for (const [k, v] of Object.entries(req.headers)) {
          if (!v) continue;
          if (typeof v === 'string') forwardHeaders[k] = v;
          else if (Array.isArray(v)) forwardHeaders[k] = v.join(',');
          else forwardHeaders[k] = String(v);
        }

        // Ensure content-type present
        if (!forwardHeaders['content-type']) forwardHeaders['content-type'] = 'application/json';

        // Use global fetch if available (Node 18+), otherwise fall back to a simple https request
        if ((globalThis as any).fetch) {
          const resp = await (globalThis as any).fetch(forwardUrl, {
            method: 'POST',
            headers: forwardHeaders,
            body: JSON.stringify(req.body),
          });
          const text = await resp.text();
          return res.status(resp.status).send(text);
        } else {
          // fallback using https module
          const https = require('https');
          const url = require('url');
          const u = url.parse(forwardUrl);
          const options = {
            hostname: u.hostname,
            port: u.port || 443,
            path: u.path,
            method: 'POST',
            headers: forwardHeaders,
          };

          await new Promise<void>((resolve, reject) => {
            const reqForward = https.request(options, (r: any) => {
              const chunks: Buffer[] = [];
              r.on('data', (c: Buffer) => chunks.push(c));
              r.on('end', () => {
                const respText = Buffer.concat(chunks).toString('utf8');
                res.status(r.statusCode || 200).send(respText);
                resolve();
              });
            });
            reqForward.on('error', (err: any) => reject(err));
            reqForward.write(JSON.stringify(req.body));
            reqForward.end();
          });
          return;
        }
      } catch (err) {
        console.error('Failed to forward webhook to legacy endpoint', err);
        return res.status(502).json({ message: 'Payment not found locally; failed to forward to legacy webhook' });
      }
    }

    if (payment.status !== "PENDING") {
      return res.status(200).json({
        message: "Payment already finalized",
        status: payment.status,
      });
    }

    switch (status) {
      case "EXPIRED": {
        await prisma.payment.update({
          where: { xenditInvoiceId },
          data: {
            status: "EXPIRED",
            recordedBy: "Xendit Webhook",
          },
        });

        return res.status(200).json({ message: "Payment expired" });
      }

      case "FAILED": {
        await prisma.payment.update({
          where: { xenditInvoiceId },
          data: {
            status: "FAILED",
            recordedBy: "Xendit Webhook",
          },
        });

        return res.status(200).json({ message: "Payment failed" });
      }

      case "CANCELLED": {
        await prisma.payment.update({
          where: { xenditInvoiceId },
          data: {
            status: "CANCELLED",
            recordedBy: "Xendit Webhook",
          },
        });

        return res.status(200).json({ message: "Payment cancelled" });
      }

      case "PAID":
        break; // continue to paid flow

      default:
        return res.status(200).json({
          message: "Ignored status",
          status,
        });
    }

    // ─────────────────────────────────────────────
    // 5️⃣ PAID FLOW (only place billing is touched)
    // ─────────────────────────────────────────────
    if (!paid_at || !payment_channel) {
      return res.status(400).json({
        message: "Missing paid payment details",
      });
    }

    const updatedPayment = await prisma.payment.update({
      where: { xenditInvoiceId },
      data: {
        status: "PAID",
        paidAt: paid_at,
        paymentChannel: payment_channel,
        referenceId: external_id,
        recordedBy: "Xendit Webhook",
      },
      include: {
        account: true,
        billing: { select: { period: true } },
        client: {
          include: {
            provider: {
              include: { smsIntegrationSettings: true },
            },
          },
        },
      },
    });

    // ─────────────────────────────────────────────
    // 6️⃣ Update billing totals (PAID only)
    // ─────────────────────────────────────────────
    const billing = await prisma.billing.findUnique({
      where: { id: updatedPayment.billingId },
      include: {
        payments: { where: { status: "PAID" } },
      },
    });

    if (!billing) {
      return res.status(200).json({ message: "Billing not found" });
    }

    const totalPaid = billing.payments.reduce(
      (sum, p) => sum + Number(p.amount),
      0
    );

    const cappedPaidAmount = Math.min(totalPaid, billing.amount);

    await prisma.billing.update({
      where: { id: billing.id },
      data: {
        paidAmount: cappedPaidAmount,
        paidAt:
          cappedPaidAmount >= billing.amount
            ? updatedPayment.paidAt
            : null,
        status:
          cappedPaidAmount >= billing.amount
            ? "PAID"
            : cappedPaidAmount > 0
            ? "PARTIALLY_PAID"
            : "PENDING",
      },
    });

    // ─────────────────────────────────────────────
    // 7️⃣ Send SMS (once, PAID only)
    // ─────────────────────────────────────────────
    if (
      updatedPayment.client.provider?.smsIntegrationSettings
        ?.sendWhenPaymentIsMade
    ) {
      setImmediate(async () => {
        try {
          const decryptedKey = decrypt(
            updatedPayment.client.provider.semaphoreApiKey!
          );

          await sendSms(
            updatedPayment.client.phoneNumber!,
            updatedPayment.client.provider.smsIntegrationSettings
              ?.sendWhenPaymentIsMadeTemplate || "",
            {
              name: updatedPayment.client.fullName || "",
              accNum: updatedPayment.account?.accountNumber || "",
              billingDay:
                updatedPayment.account?.billingDay?.toString() || "",
              companyName:
                updatedPayment.client.provider.companyName || "",
              email: updatedPayment.client.email || "",
              phone: updatedPayment.client.phoneNumber || "",
              period: updatedPayment.billing?.period || "",
              amount: amount?.toString() || "",
            },
            decryptedKey
          );
        } catch (error) {
          console.error("Error sending payment SMS:", error);
        }
      });
    }

    return res.status(200).json({ message: "Payment processed" });
  } catch (error) {
    console.error("Xendit webhook error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
