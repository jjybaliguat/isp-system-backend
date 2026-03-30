import { Request, Response } from "express";
import {UAParser} from "ua-parser-js"
import { getLocalDate } from "../../../utils/getTimeOffset";
import { startOfYear, endOfYear, formatDate } from "date-fns";
import { BillingStatus, BillingType, PrismaClient } from "@prisma/client";
import { validate as isUuid } from "uuid";
import { sendInvoiceReminderEmail } from "../../../jobs/sendInvoiceReminderEmail";
import { decrypt } from "../../../utils/hasher";
import { sendPaymentConfirmation } from "../../../jobs/sendPaymentConfirmation";
import { sendSms } from "../../../jobs/sendSms";
import { emailIsConfigured } from "../../../helpers/emailIsConfirgured";
import prisma from "../../../utils/prisma";

export const createBilling = async (req: Request, res: Response) => {
    const {
        period,
        description,
        amount,
        clientId,
        dueDate
    } = req.body
    
    const {providerId} = req.user as {id: string, providerId: string}

    try {
        const billDuedate = dueDate ? new Date(dueDate) : null
        if(billDuedate && isNaN(billDuedate.getTime())){
            return res.status(400).json({ dueDate: 'installationDate must be a valid date' });
        }
        if(!period){
            res.status(400).json({message: "Bill Period is required"})
        }
        const client = await prisma.client.findUnique({
            where: { id: clientId },
            include: {
                servicePlan: true
            }
        })

        if(!client) {
            return res.status(404).json({ message: 'Client not found' });
        }

        const provider = await prisma.provider.findUnique({
        where: { id: providerId },
        select: { settings: true },
        });

        const settings = provider?.settings as
        | { 
            billing?: { invoiceGenerationDaysBeforeDue?: number },
            invoiceDocument?: {
                numberPrefix: string,
                startingNumber: number,
                includeTax: boolean,
                taxRate: number,
                companyLogoUrl: string,
                footerMessage: string
            }
            }
        | undefined;

        const today = new Date()
        const prefix = settings?.invoiceDocument?.numberPrefix || 'INV-';
        const invoiceNumber = `${prefix}${today.getFullYear().toString().slice(2)}${Math.floor(Math.random()*1e10).toString().padStart(10,'0')}`;

        let defaultDescription;
        if(!description){
            defaultDescription = `Bill-Period-${period}-Acc-${client.accountNumber}`
        }

        const account = await prisma.accounts.findFirst({
            where: {
                clientId
            },
            select: {
                id: true
            }
        })

        const billing = await prisma.billing.create({
            data: {
                invoiceNumber: invoiceNumber || `${Date.now().toString().slice(-10)}`,
                clientId,
                accountId: account?.id!,
                amount: amount  || client.servicePlan?.monthlyFee!,
                dueDate: billDuedate || new Date(new Date().setDate(client.billingDay!)),
                period,
                description: description || defaultDescription
            }
        })


        return res.status(201).json(billing);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

export const createBillingForAccount = async (req: Request, res: Response) => {
  const {
    period,
    description,
    amount,
    accountId,
    dueDate,
    discounts = [],
    billingType,
    remarks,
    billingCharges = [],
  } = req.body;

  const { id: userId, providerId } = req.user as { id: string; providerId: string };

  try {
    const billDuedate = dueDate ? new Date(dueDate) : null;
    if (billDuedate && isNaN(billDuedate.getTime())) {
      return res.status(400).json({ dueDate: "dueDate must be a valid date" });
    }

    if (!period) {
      return res.status(400).json({ message: "Bill Period is required" });
    }

    const account = await prisma.accounts.findUnique({
      where: { id: accountId },
      include: {
        servicePlan: true,
      },
    });

    if (!account) {
      return res.status(404).json({ message: "Account not found" });
    }

    // Fetch provider settings
    const provider = await prisma.provider.findUnique({
      where: { id: providerId },
      select: { 
        companyName: true,
        settings: true,
        semaphoreApiKey: true,
        smsIntegrationSettings: true
      },
    });

    const settings =
      provider?.settings as
        | {
            billing?: { invoiceGenerationDaysBeforeDue?: number };
            invoiceDocument?: {
              numberPrefix: string;
              startingNumber: number;
              includeTax: boolean;
              taxRate: number;
              companyLogoUrl: string;
              footerMessage: string;
            };
          }
        | undefined;

    // Generate invoice number
    const today = new Date();
    const prefix = settings?.invoiceDocument?.numberPrefix || "INV-";
    const invoiceNumber = `${prefix}${today
      .getFullYear()
      .toString()
      .slice(2)}${Math.floor(Math.random() * 1e10)
      .toString()
      .padStart(10, "0")}`;

    // Default description
    const defaultDescription = description
      ? description
      : `Bill-Period-${period}-Acc-${account.accountNumber}`;

    // Compute total discount
    const totalDiscount = discounts.reduce((sum: number, d: any) => {
      const val = Number(d.amount);
      return sum + (isNaN(val) ? 0 : val);
    }, 0);

    // // Base amount from service plan if user doesn’t override it
    // const baseAmount = amount || account.servicePlan?.monthlyFee || 0;

    // // Final amount = base amount – total discount
    // const finalAmount = amount? amount : Math.max(baseAmount - totalDiscount, 0);

    // Create billing with nested discount create
    const billing = await prisma.billing.create({
      data: {
        invoiceNumber,
        clientId: account.clientId,
        accountId,
        amount,
        dueDate: billDuedate || new Date(new Date().setDate(account.billingDay!)),
        period,
        description: defaultDescription,
        billingType,
        remarks,
        // --- NEW: nested Prisma create for discounts ---
        discounts: {
          create: discounts.map((d: any) => ({
            description: d.description || null,
            amount: Number(d.amount) || 0,
          })),
        },
        billingCharges: {
          create: billingCharges.map((bc: any) => ({
            name: bc.name,
            amount: Number(bc.amount) || 0,
            description: bc.description || null
          }))
        }
      },
      include: {
        discounts: true, // return discounts in response
        account: true,
        client: true
      },
    });

    // ---- LOG ACTION (non-blocking) ----
      prisma.log
        .create({
          data: {
            action: "CREATE",
            entity: "Billing",
            userId,
            message: `Bill generated for client ${billing.client.fullName} for period ${period}`,
            providerId,
          },
        })
        .catch(console.error);

    if(provider?.smsIntegrationSettings?.sendWhenBillIsMade){
      setImmediate(async () => {
        try {
          const decryptedKey = decrypt(provider.semaphoreApiKey!);
          const messageTemplate = provider.smsIntegrationSettings?.sendWhenBillIsMadeTemplate || ""
          await sendSms(
            billing.client.phoneNumber!,
            messageTemplate,
            {
              name: billing.client.fullName,
              amount: billing.amount.toString(),
              accNum: account.accountNumber,
              dueDate: billing.dueDate.toLocaleDateString(),
              period: billing.period!,
              companyName: provider.companyName || "",
              link: `https://sierracommunication.net/checkout/payment/${billing.id}`,
              websiteLink: process.env.WEBSITE_LINK!,
              email: billing.client.email || "",
              phone: billing.client.phoneNumber || "",
              billingDay: billing.client.billingDay?.toString()!
            },
            decryptedKey
          );
        } catch (error) {
          console.error("Error sending billing SMS:", error);
        }
    })
  }

    return res.status(201).json(billing);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const updateBillingForAccount = async (req: Request, res: Response) => {
  const { id } = req.params as { id: string }
  const { accountId, period, amount, dueDate, discounts, billingCharges, BillingType, remarks } = req.body

  if (!isUuid(id)) {
    return res.status(400).json({ message: "Invalid Billing ID format (UUID required)" })
  }

  try {
    const billDuedate = dueDate ? new Date(dueDate) : null;
    const result = await prisma.$transaction(async (tx) => {
      // 1️⃣ Update the billing info
      await tx.billing.update({
        where: {
          id,
          accountId
        },
        data: {
          period,
          amount,
          dueDate: billDuedate!,
          billingType: BillingType,
          remarks
        }
      })

      // 2️⃣ Delete old discounts
      await tx.discount.deleteMany({
        where: { billingId: id }
      })

      await tx.billingCharges.deleteMany({
        where: { billingId: id }
      })

      // 3️⃣ Insert new discounts
      if (Array.isArray(discounts) && discounts.length > 0) {
        await tx.discount.createMany({
          data: discounts.map((d: any) => ({
            billingId: id,
            description: d.description || null,
            amount: Number(d.amount) || 0
          }))
        })
      }
      if (Array.isArray(billingCharges) && billingCharges.length > 0) {
        await tx.billingCharges.createMany({
          data: billingCharges.map((bc: any) => ({
            billingId: id,
            name: bc.name,
            amount: Number(bc.amount) || 0,
            description: bc.description || null
          }))
        })
      }

      // 4️⃣ Fetch final updated billing with relations + discounts
      const finalBilling = await tx.billing.findUnique({
        where: { id },
        include: {
          account: {
            include: {
              client: true
            }
          },
          discounts: true,
          billingCharges: true
        }
      })

      return finalBilling
    })

    return res.status(200).json(result)
  } catch (error) {
    console.error(error)
    return res.status(500).json({ message: "Internal server error" })
  }
}



export const getBillingByAccountNumber = async (req: Request, res: Response) => {
    const { accountNumber } = req.params as { accountNumber: string }

    try {
        const client = await prisma.client.findUnique({
            where: {
                accountNumber
            }
        })

        if(!client) {
            res.status(404).json({message: "Client not found"})
        }

        const bill = await prisma.billing.findMany({
          where: {
            client: {
              accountNumber: accountNumber,
            },
            OR: [
              { status: "PENDING" },
              { status: "OVERDUE" },
              { status: "PARTIALLY_PAID" },
            ],
          },
          include: {
            account: {
              include: {
                client: true,
              },
            },
            client: true,
            discounts: true,
          },
        });


        return res.status(200).json(bill)
    } catch (error) {
        console.log(error)
        return res.status(500).json({message: "Internal Server Error"})
    }
}

export const getBillings = async (req: Request, res: Response) => {
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

            whereClause.dueDate = {
                gte: startDate,
                lte: endDate,
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
            invoiceNumber: { contains: search, mode: "insensitive" },
            },
        ];
        }

        // Query + count in parallel
        const [bills, total] = await Promise.all([
        prisma.billing.findMany({
            where: whereClause,
            include: {
                discounts: true,
                billingCharges: true,
                account: {
                    include: {
                        servicePlan: true,
                        client: {
                            select: {
                                id: true,
                                fullName: true,
                                accountNumber: true,
                                provider: {
                                    select: {
                                        settings: true,
                                        companyName: true,
                                        companyAddress: true,
                                        companyLogoUrl: true,
                                        email: true,
                                        phoneNumber: true
                                    }
                                }
                            },
                        },
                    }
                },
                client: {
                    select: {
                    id: true,
                    fullName: true,
                    accountNumber: true,
                    provider: {
                        select: {
                            settings: true,
                            companyName: true,
                            companyAddress: true,
                            companyLogoUrl: true,
                            email: true,
                            phoneNumber: true
                        }
                    }
                    },
                },
            },
            orderBy: { billingDate: "desc" },
            skip,
            take: limit,
        }),
        prisma.billing.count({ where: whereClause }),
        ]);

        return res.status(200).json({
        data: bills,
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

export const getUnpaidBillingById = async (req: Request, res: Response) => {
    const { id } = req.params as { id: string }

    try {
        const bill = await prisma.billing.findUnique({
            where: {
                id,
                status: {
                  in: ["PENDING", "OVERDUE", "PARTIALLY_PAID"]
                }
            },
            include: {
                client: true,
                account: {
                    include: {
                        client: true
                    }
                },
                billingCharges: true,
                discounts: true
            }
        })

        if(!bill){
            return res.status(404).json({message: "Bill not found"})
        }

        const outstandingBalance = bill.amount - bill.paidAmount

        return res.status(200).json({
          ...bill,
          outstandingBalance
        })
    } catch (error) {
        console.log(error)
        return res.status(500).json({message: "Internal Server Error"})
    }
}
export const getBillingById = async (req: Request, res: Response) => {
    const { id } = req.params as { id: string }

    try {
        const bill = await prisma.billing.findUnique({
            where: {
                id
            },
            include: {
                client: true,
                account: {
                    include: {
                        client: true
                    }
                },
                billingCharges: true,
                discounts: true
            }
        })

        if(!bill){
            return res.status(404).json({message: "Bill not found"})
        }

        // console.log(bill)

        return res.status(200).json(bill)
    } catch (error) {
        console.log(error)
        return res.status(500).json({message: "Internal Server Error"})
    }
}

export const getFullYearBillingById = async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };

  const year = new Date().getFullYear();

  if (!isUuid(id)) {
    return res.status(400).json({ message: "Invalid client ID format (UUID required)" });
  }

  try {
    const accounts = await prisma.accounts.findMany({
      where: { clientId: id },
      select: { id: true },
    });

    const accountIds = accounts.map(a => a.id);

    const billings = await prisma.billing.findMany({
      where: {
        accountId: { in: accountIds },
        dueDate: {
          gte: startOfYear(new Date(year, 0, 1)),
          lte: endOfYear(new Date(year, 11, 31)),
        },
      },
      include: {
        payments: true,
      },
      orderBy: {
        billingDate: "asc",
      },
    });

    return res.status(200).json(billings);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};



export const deleteBilling = async (req: Request, res: Response) => {
    const {id} = req.params
    const {id: userId, providerId} = req.user as {id: string, providerId: string}

    if(!id) return res.status(400).json({message: "Missing required id field"})

    try {
        const user = await prisma.user.findUnique({
            where: {
                id: userId
            },
            include: {
                employee: true,
                provider: {
                    select: {
                        name: true
                    }
                }
            }
        })
        const bill = await prisma.billing.findUnique({
            where: {
                id
            }
        })
        await prisma.billing.delete({
            where: {
                id,
                client: {
                    providerId
                }
            }
        })

        // ---- LOG ACTION (non-blocking) ----
      prisma.log
        .create({
          data: {
            action: "DELETE",
            entity: "Billing",
            userId,
            message: `Bill with invoice no. ${bill?.invoiceNumber} deleted by ${user?.employee?.fullName || user?.provider.name || 'Unknown'}`,
            providerId,
          },
        })
        .catch(console.error);

        return res.status(200).json({message: "Bill deleted successfully"})
    } catch (error) {
        console.log(error)
        return res.status(500).json({message: "Internal Server Error"})
    }
}

export const confirmPayment = async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const {
    amount,
    paymentDate,
    paymentMethod,
    referenceNumber,
    remarks,
    sendReceipt,
  } = req.body;

  const { id: userId, providerId } = req.user as {
    id: string;
    providerId: string;
  };

  // ---- VALIDATIONS ----
  if (!amount || !paymentDate || !paymentMethod || !referenceNumber) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  const payDate = new Date(paymentDate);
  if (isNaN(payDate.getTime())) {
    return res.status(400).json({ message: "Invalid payment date" });
  }

  // Parse user agent
  const ua = UAParser(req.headers["user-agent"] || "");
  const deviceInfo = `${ua.browser.name || "Browser"} on ${
    ua.os.name || "OS"
  } (${ua.device.model || "Desktop"}) from ${req.socket.remoteAddress}`;

  try {
    // Pull user + bill in parallel
    const [user, bill] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        include: {
          employee: true,
          provider: { select: { name: true, settings: true, companyName: true, smsIntegrationSettings: true, semaphoreApiKey: true } },
        },
      }),

      prisma.billing.findUnique({
        where: { id },
        include: {
          client: true,
          account: { include: { client: true } },
        },
      }),
    ]);

    if (!bill)
      return res.status(404).json({ message: `Bill with id ${id} not found` });

    // Check reference number
    const isPaymentExists = await prisma.payment.findFirst({
      where: {
        referenceId: referenceNumber,
        client: { providerId },
      },
    });

    if (isPaymentExists)
      return res.status(400).json({ message: "Reference number already exists" });

    // ---- CREATE PAYMENT ----
    const payment = await prisma.payment.create({
      data: {
        billingId: id,
        clientId: bill.clientId,
        accountId: bill.accountId,
        amount,
        status: "PAID",
        paymentMethod,
        paymentChannel: paymentMethod,
        recordedBy: `Recorded By ${user?.employee?.fullName || user?.provider.name}`,
        referenceId: referenceNumber,
        remarks,
        paidAt: payDate,
      },
    });

    // ---- UPDATE BILL ----
    const newStatus =
      amount === 0
        ? "PENDING"
        : amount + bill.paidAmount < bill.amount
        ? "PARTIALLY_PAID"
        : "PAID";

    const updatedBill = await prisma.billing.update({
      where: { id },
      data: {
        status: newStatus,
        paidAmount: { increment: amount },
        paidAt: newStatus === "PAID" ? payDate : null,
      },
      include: {
        client: true,
        account: true
      }
    });

    // ---- LOG ACTION (non-blocking) ----
    prisma.log
      .create({
        data: {
          action: "Confirm Payment",
          entity: "Billing",
          userId,
          message: `Pay bills ${bill.client.fullName}(${bill.client.accountNumber}) Period ${bill.period} recorded from ${deviceInfo}`,
          providerId,
        },
      })
      .catch(console.error);
    
    const settings =  user?.provider?.settings as {
            notifications?: {
                enabled: boolean;
                emailUser?: string;
                emailPass?: string;
                emailHost?: string;
                senderName?: string;
                emailPort?: number;
                paymentConfirmationTemplate?: string;
            };
            } | undefined;

    const IsEmailConfirgured = emailIsConfigured(settings?.notifications);

    if (sendReceipt && IsEmailConfirgured) {
      setImmediate(() =>
        sendPaymentConfirmation(
          settings?.notifications?.paymentConfirmationTemplate!,
          {
            emailHost: settings?.notifications?.emailHost!,
            emailPass: settings?.notifications?.emailPass!,
            emailUser: settings?.notifications?.emailUser!,
            emailPort: settings?.notifications?.emailPort!,
            senderName: settings?.notifications?.senderName!,
          },
          bill.account?.client.email!,
          "Payment Confirmation",
          {
            clientName: bill.account?.client.fullName!,
            invoiceNumber: bill.invoiceNumber,
            amount: bill.amount,
            paymentDate: formatDate(payDate, "MMMM-dd-yyyy"),
            paymentMethod,
            receiptUrl: `https://sierracommunication.net/payment/${payment.id}`,
          }
        )
      );
    }

    // Send sms notification
    if(user && user.provider?.smsIntegrationSettings?.sendWhenPaymentIsMade){
        // console.log("Scheduling SMS notification for confirm payment...");
        setImmediate(async () => {
            try {
              const decryptedKey = decrypt(user.provider.semaphoreApiKey!);
              const messageTemplate = user.provider.smsIntegrationSettings?.sendWhenPaymentIsMadeTemplate || ""
              await sendSms(
                updatedBill.client.phoneNumber!,
                messageTemplate,
                {
                  name: updatedBill.client.fullName || "",
                  accNum: updatedBill.account?.accountNumber || "",
                  billingDay: updatedBill.account?.billingDay!.toString() || "",
                  companyName: user.provider.companyName || "",
                  email: updatedBill.client.email || "",
                  phone: updatedBill.client.phoneNumber || "",
                  amount: amount.toString(),
                  period: updatedBill.period || "",
                  websiteLink: process.env.WEBSITE_LINK!
                },
                decryptedKey
              );
            } catch (error) {
              console.error("Error sending billing SMS:", error);
            }
        })
    }

    // ---- FAST RESPONSE ----
    return res.status(200).json(updatedBill);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const sendPaymentConfirmationEmail = async(req: Request, res: Response) => {
    const {id: userId, providerId} = req.user
    const {id} = req.params as {id: string}

    if (!isUuid(id)) {
        return res.status(400).json({ message: "Invalid Billing ID format (UUID required)" });
    }

    try {
      const [user, bill] = await Promise.all([
        prisma.user.findUnique({
          where: { id: userId },
          include: {
            employee: true,
            provider: { select: { name: true, settings: true, companyName: true, smsIntegrationSettings: true, semaphoreApiKey: true } },
          },
        }),

        prisma.billing.findUnique({
          where: { id, status: "PAID" },
          include: {
            client: true,
            account: { include: { client: true } },
            payments: {
              select: {
                amount: true,
                paymentMethod: true,
                paidAt: true,
                id: true
              }
            }
          },
        }),
      ]);

    if (!bill)
      return res.status(404).json({ message: `Bill with id ${id} not found` });

      const settings =  user?.provider?.settings as {
            notifications?: {
                enabled: boolean;
                emailUser?: string;
                emailPass?: string;
                emailHost?: string;
                senderName?: string;
                emailPort?: number;
                paymentConfirmationTemplate?: string;
            };
            } | undefined;

    const IsEmailConfirgured = emailIsConfigured(settings?.notifications);
    if(!IsEmailConfirgured){
        return res.status(400).json({ message: "Email notification settings are incomplete. Please contact your provider." });
    }
    setImmediate(() =>
      sendPaymentConfirmation(
          settings?.notifications?.paymentConfirmationTemplate!,
          {
            emailHost: settings?.notifications?.emailHost!,
            emailPass: settings?.notifications?.emailPass!,
            emailUser: settings?.notifications?.emailUser!,
            emailPort: settings?.notifications?.emailPort!,
            senderName: settings?.notifications?.senderName!,
          },
          bill.account?.client.email!,
          "Payment Confirmation",
          {
            clientName: bill.account?.client.fullName!,
            invoiceNumber: bill.invoiceNumber,
            amount: bill.amount,
            paymentDate: formatDate(bill.paidAt!, "MMMM-dd-yyyy"),
            paymentMethod: bill.payments[0]?.paymentMethod!,
            receiptUrl: `https://sierracommunication.net/payment/${bill.payments[0]?.id}`,
          }
      )
    )

    return res.status(200).json({message: "Payment confirmation email sent"})
    } catch (error) {
      console.log(error)
      return res.status(500).json({message: "Internal Server Error"})
    }
}



export const sendEmailReminder = async(req: Request, res: Response) => {
    const {id: userId, providerId} = req.user
    const {id} = req.params as {id: string}

    if (!isUuid(id)) {
        return res.status(400).json({ message: "Invalid Billing ID format (UUID required)" });
    }
    
    try {
        const billing = await prisma.billing.findUnique({
            where: {
                id
            },
            include: {
                account: {
                    include: {
                        client: true
                    }
                }
            }
        })
        const provider = await prisma.provider.findUnique({
            where: {
                id: providerId
            },
            select: {
                settings: true
            }
        })

        const settings = provider?.settings as {
            notifications?: {
                enabled: boolean;
                emailUser?: string;
                emailPass?: string;
                emailHost?: string;
                senderName?: string;
                emailPort?: number;
                invoiceReminderTemplate?: string;
            };
            } | undefined;

            if (
            !settings?.notifications ||
            settings.notifications.emailUser == null ||
            settings.notifications.emailPass == null ||
            settings.notifications.emailHost == null ||
            settings.notifications.senderName == null ||
            settings.notifications.emailPort == null ||
            settings.notifications.invoiceReminderTemplate == null
            ) {
            return res
                .status(400)
                .json({ message: "Email notification settings are incomplete." });
            }

        const clientEmail = billing?.account?.client.email || ''
        
        
        sendInvoiceReminderEmail(
            settings.notifications.invoiceReminderTemplate,
            {
                emailHost: settings.notifications.emailHost,
                emailPass: settings.notifications.emailPass,
                emailUser: settings.notifications.emailUser,
                emailPort: settings.notifications.emailPort,
                senderName: settings.notifications.senderName
            },
            clientEmail,
            "Billing Reminder",
            {
                clientName: billing?.account?.client.fullName!,
                invoiceNumber: billing?.invoiceNumber!,
                amount: billing?.amount!,
                dueDate: billing?.dueDate.toLocaleDateString()!,
                paymentUrl: `http://localhost:3000/checkout/payment/${billing?.id}`
              }
        )
        // ---- LOG ACTION (non-blocking) ----
        prisma.log
        .create({
            data: {
            action: "EMAIL_REMINDER",
            entity: "Billing",
            userId,
            message: `Billing reminder sent for invoice ${billing?.invoiceNumber}`,
            providerId,
            },
        })
        .catch(console.error);

        return res.status(200).json({message: "Billing reminder sent"})
    } catch (error) {
        console.log(error)
        return res.status(500).json({message: "Internal Server Error"})
    }
}

export const sendSmsReminder = async(req: Request, res: Response) => {
    const {id: userId, providerId} = req.user
    const {id} = req.params as {id: string}

    if (!isUuid(id)) {
        return res.status(400).json({ message: "Invalid Billing ID format (UUID required)" });
    }

    try {
        const provider = await prisma.provider.findUnique({
            where: {
                id: providerId
            },
            select: {
                semaphoreApiKey: true,
                companyName: true
            }
        })

        const billing = await prisma.billing.findUnique({
            where: { id },
            select: {
                invoiceNumber: true,
                amount: true,
                dueDate: true,
                account: {
                    select: {
                        accountNumber: true,
                        client: {
                        select: {
                            phoneNumber: true,
                            fullName: true,
                        },
                        },
                    },
                },
            },
        });

        const decryptedKey = decrypt(provider?.semaphoreApiKey!)
        const message = `
            Internet Payment reminder invoice ${billing?.invoiceNumber} for account ${billing?.account?.accountNumber} amounting to ₱${billing?.amount} is due on ${new Date(billing?.dueDate!).toLocaleDateString("en-PH")}.
            Please settle your payment to avoid service interruption.
            – ${provider?.companyName}
        `.trim();

        const response: any = await fetch(`https://api.semaphore.co/api/v4/messages?apikey=${decryptedKey}&number=${billing?.account?.client.phoneNumber}&message=${message}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            }
        })

        const data = await response.json()

        if(data.apikey) return res.status(400).json({message: "Invalid SMS Api Key"})
        
        // ---- LOG ACTION (non-blocking) ----
        prisma.log
        .create({
            data: {
            action: "REMINDER_SMS",
            entity: "Billing",
            userId,
            message: `SMS reminder sent for billing ${billing?.invoiceNumber}`,
            providerId,
            },
        })
        .catch(console.error);

        return res.status(200).json({message: "Message sent"})
    } catch (error) {
        
    }
}

const MONTH_MAP: Record<string, number> = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12
}


export const generateBillingForAllAccounts = async (req: Request, res: Response) => {
  const { month, year, startDay, endDay } = req.body
  const { id: userId, providerId } = req.user as { id: string, providerId: string }

  if (!month || !year) {
    return res.status(400).json({ message: "Month and year are required" })
  }

  const monthNumber = MONTH_MAP[month.toLowerCase()]
  if (!monthNumber) {
    return res.status(400).json({ message: "Invalid month name" })
  }

  const period = `${month} ${year}`

  const provider = await prisma.provider.findUnique({
        where: { id: providerId },
        select: { settings: true, smsIntegrationSettings: true, semaphoreApiKey: true, companyName: true },
        });

        const settings = provider?.settings as
        | { 
            billing?: { invoiceGenerationDaysBeforeDue?: number },
            invoiceDocument?: {
                numberPrefix: string,
                startingNumber: number,
                includeTax: boolean,
                taxRate: number,
                companyLogoUrl: string,
                footerMessage: string
            }
            }
        | undefined;

  try {
    const accounts = await prisma.accounts.findMany({
      where: {
        status: "ACTIVE",
        client: {
          providerId,
          status: "ACTIVE"
        },
        billingDay: {
          gte: startDay ? Number(startDay) : 1,
          lte: endDay ? Number(endDay) : 31
        }
      },
      include: {
        servicePlan: true,
        billings: {
          where: { period }
        }
      }
    })

    const billingsToCreate = accounts
      .filter(account => account.billings.length === 0) // ✅ prevent duplicate
      .map(account => {
        const dueDate = new Date(
          Number(year),
          monthNumber - 1,
          account.billingDay ?? 1
        )

        const defaultDescription = `Bill-Period-${period}-Acc-${account.accountNumber}`;
         // Generate invoice number
        const today = new Date();
        const prefix = settings?.invoiceDocument?.numberPrefix || "INV-";
        const invoiceNumber = `${prefix}${today
          .getFullYear()
          .toString()
          .slice(2)}${Math.floor(Math.random() * 1e10)
          .toString()
          .padStart(10, "0")}`;

        return {
          invoiceNumber,
          clientId: account.clientId,
          accountId: account.id,
          billingDate: new Date(),
          period,
          dueDate,
          description: defaultDescription,
          amount: account.servicePlan.monthlyFee,
          status: BillingStatus.PENDING,
          billingType: BillingType.REGULAR,
          account
        }
      })

    if (billingsToCreate.length === 0) {
      return res.json({ message: "Billing already generated for this period" })
    }
    
    await prisma.$transaction(
      billingsToCreate.map(b => {
        const fee = Number(b.account.servicePlan!.monthlyFee || 0)

        return prisma.billing.create({
          data: {
            invoiceNumber: b.invoiceNumber,
            clientId: b.clientId,
            accountId: b.accountId,
            billingDate: b.billingDate,
            period: b.period,
            dueDate: b.dueDate,
            description: b.description,
            amount: fee,
            status: b.status,
            billingType: b.billingType,
            billingCharges: {
              create: [
                {
                  name: b.account.servicePlan!.name,
                  amount: fee,
                },
              ],
            },
          },
        })
      })
    )

    if(provider?.smsIntegrationSettings?.sendWhenBillIsMade){
        setImmediate(async () => {
          try {
            const decryptedKey = decrypt(provider.semaphoreApiKey!);
            const messageTemplate = provider.smsIntegrationSettings?.sendWhenBillIsMadeTemplate || ""
            for(const billingData of billingsToCreate){
                const account = await prisma.accounts.findUnique({
                    where: { id: billingData.accountId },
                });
              const billing = await prisma.billing.findFirst({
                  where: {
                      accountId: billingData.accountId,
                      period: billingData.period
                  },
                  include: {
                      client: true
                  }
              })
              await sendSms(
                billing!.client.phoneNumber!,
                messageTemplate,
                {
                  name: billing!.client.fullName,
                  amount: billing!.amount.toString(),
                  accNum: account!.accountNumber,
                  dueDate: billing!.dueDate.toLocaleDateString(),
                  period: billing!.period!,
                  companyName: provider.companyName || "",
                  link: `https://sierracommunication.net/checkout/payment/${billing!.id}`,
                  websiteLink: process.env.WEBSITE_LINK!,
                  email: billing!.client.email || "",
                  phone: billing!.client.phoneNumber || "",
                  billingDay: billing?.client.billingDay?.toString()!
                },
                decryptedKey
              );
            }
          } catch (error) {
            console.error("Error sending billing SMS:", error);
          }
      })
    }

    // ---- LOG ACTION (non-blocking) ----
        prisma.log
        .create({
            data: {
            action: "GENERATE",
            entity: "Billing",
            userId,
            message: `Billing generated for period ${period}, range day ${startDay || '1'} to ${endDay || '31'}`,
            providerId,
            },
        })
        .catch(console.error);

    return res.json({
      message: "Billing generated successfully",
      period,
      generated: billingsToCreate.length
    })

  } catch (error) {
    console.error(error)
    return res.status(500).json({ message: "Failed to generate billing" })
  }
}

export const getPaymentProofs = async (req: Request, res: Response) => {
  const { providerId } = req.user;

  console.log("Fetching payment proofs for provider:", providerId);

  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const search =
    typeof req.query.search === "string" ? req.query.search.trim() : "";
  const month =
    typeof req.query.month === "string" ? Number(req.query.month) : undefined;
  const year =
    typeof req.query.year === "string" ? Number(req.query.year) : undefined;

  const skip = (page - 1) * limit;

  try {
    const where: any = {
      providerId,
      billing: {
        client: {
          providerId,
        },
      },
    };

    if (search) {
      where.OR = [
        {
          billing: {
            invoiceNumber: {
              contains: search,
              mode: "insensitive",
            },
          },
        },
        {
          billing: {
            client: {
              fullName: {
                contains: search,
                mode: "insensitive",
              },
            },
          },
        },
      ];
    }

    if (month || year) {
      where.createdAt = {};

      if (year) {
        where.createdAt.gte = new Date(`${year}-01-01`);
        where.createdAt.lte = new Date(`${year}-12-31`);
      }

      if (month && year) {
        const start = new Date(year, month - 1, 1);
        const end = new Date(year, month, 0, 23, 59, 59);

        where.createdAt = {
          gte: start,
          lte: end,
        };
      }
    }

    const [paymentProofs, total] = await Promise.all([
      prisma.paymentProofs.findMany({
        where,
        include: {
          billing: {
            include: {
              client: true,
              account: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: limit,
      }),

      prisma.paymentProofs.count({
        where,
      }),
    ]);

    return res.status(200).json({
      data: paymentProofs,
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
};