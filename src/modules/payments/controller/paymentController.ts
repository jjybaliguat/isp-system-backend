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
            orderBy: { paidAt: "desc" },
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
  const { amount } = req.body

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

    // Create Xendit Invoice
    const invoice = await Invoice.createInvoice({
        data: {
          externalId: billing.invoiceNumber,
          payerEmail: billing.client.email,
          description: billing.description || `Payment for billing #${billing.client.accountNumber}`,
          amount: Number(amount || billing.amount),
          shouldSendEmail: true,
          successRedirectUrl: "https://inventory.bitwisepctrading.com",
          failureRedirectUrl: "https://logpay.bitwisepctrading.com"
        }
    });

    // Create Payment record in DB
    const payment = await prisma.payment.create({
      data: {
        billingId: billing.id!,
        clientId: billing.clientId!,
        amount: billing.amount!,
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
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to create payment" });
  }
};

export const xenditWebhook = async (req: Request, res: Response) => {
    const {
      id,
      status,
      amount,
      paid_amount,
      paid_at,
      payment_channel
    } = req.body;

    try {
      
      if(!status || !amount || !paid_amount || !paid_at || !payment_channel) {
          return res.status(400).json({ message: "Invalid webhook payload" });
      }

      // Update payment status in DB
      const payment = await prisma.payment.updateMany({
        where: { xenditInvoiceId: id },
        data: {
          status: status.toUpperCase(),
          paidAt: status === "PAID" ? paid_at : null,
          paymentChannel: status === "PAID" ? payment_channel : null,
          recordedBy: "Payment Webhook Trigger"
        },
      });

      // If payment is successful, update billing status to PAID
      if (status === "PAID") {
        const updatedPayment = await prisma.payment.findFirst({
          where: { xenditInvoiceId: id },
          include: {
            account: true,
            billing: {
              select: {
                period: true
              }
            },
            client: {
              include: {
                provider: {
                  include: {
                    smsIntegrationSettings: true
                  }
                }
              }
            }
          },
        });

        if (updatedPayment) {
          await prisma.billing.update({
            where: { id: updatedPayment.billingId },
            data: { status: "PAID", paidAt: status === "PAID" ? paid_at : null },
          });

          if(updatedPayment.client.provider?.smsIntegrationSettings?.sendWhenPaymentIsMade){
              // console.log("Scheduling SMS notification for new client added...");
              setImmediate(async () => {
                  try {
                    const decryptedKey = decrypt(updatedPayment.client.provider.semaphoreApiKey!);
                    const messageTemplate = updatedPayment.client.provider.smsIntegrationSettings?.sendWhenPaymentIsMadeTemplate || ""
                    await sendSms(
                      updatedPayment.client.phoneNumber!,
                      messageTemplate,
                      {
                        name: updatedPayment.client.fullName || "",
                        accNum: updatedPayment.account?.accountNumber || "",
                        billingDay: updatedPayment.account?.billingDay!.toString() || "",
                        companyName: updatedPayment.client.provider.companyName || "",
                        email: updatedPayment.client.email || "",
                        phone: updatedPayment.client.phoneNumber || "",
                        period: updatedPayment.billing?.period || "",
                        amount: amount.toString(),
                      },
                      decryptedKey
                    );
                  } catch (error) {
                    console.error("Error sending billing SMS:", error);
                  }
              })
          }
        }
      }

      res.status(200).json({ message: "Payment status updated", payment });
    } catch (error) {
      console.error("Error processing Xendit webhook:", error);
      res.status(500).json({ message: "Internal server error" });
    }
}