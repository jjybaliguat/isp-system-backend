import { Request, Response } from "express";
import {UAParser} from "ua-parser-js"
import { getLocalDate } from "../../../utils/getTimeOffset";
import { startOfYear, endOfYear } from "date-fns";
import { PrismaClient } from "@prisma/client";
import { validate as isUuid } from "uuid";

const prisma = new PrismaClient();

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
        const account = await prisma.accounts.findUnique({
            where: { id: accountId },
            include: {
                servicePlan: true
            }
        })

        if(!account) {
            return res.status(404).json({ message: 'Account not found' });
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
            defaultDescription = `Bill-Period-${period}-Acc-${account.accountNumber}`
        }

        const billing = await prisma.billing.create({
            data: {
                invoiceNumber: invoiceNumber || `${Date.now().toString().slice(-10)}`,
                clientId: account.clientId,
                accountId,
                amount: amount  || account.servicePlan?.monthlyFee!,
                dueDate: billDuedate || new Date(new Date().setDate(account.billingDay!)),
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
                    accountNumber
                },
                status: "PENDING"
            },
            include: {
                client: true
            }
        })

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

export const getBillingById = async (req: Request, res: Response) => {
    const { id } = req.params as { id: string }

    try {
        const bill = await prisma.billing.findUnique({
            where: {
                id,
                status: "PENDING"
            },
            include: {
                client: true
            }
        })

        if(!bill){
            return res.status(404).json({message: "Bill not found"})
        }

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
        await prisma.log.create({
            data: {
                action: "DELETE",
                entity: "Billing",
                userId,
                providerId,
                message: `Bill with invoice no. ${bill?.invoiceNumber} deleted by ${user?.employee?.fullName || user?.provider.name || 'Unknown'}`
            }
        })

        return res.status(200).json({message: "Bill deleted successfully"})
    } catch (error) {
        console.log(error)
        return res.status(500).json({message: "Internal Server Error"})
    }
}

export const confirmPayment =  async (req: Request, res: Response) => {
    const {id} = req.params as {id: string}
    const {
        amount,
        paymentDate,
        paymentMethod,
        referenceNumber,
        remarks
    } = req.body
    const {id: userId, providerId} = req.user as {id: string, providerId: string}

    const ip = req.socket.remoteAddress

    const ua = UAParser(req.headers["user-agent"] || "")
    const browser = ua.browser.name || "Unknown Browser"
    const os = ua.os.name || "Unknown OS"
    const device = ua.device.model || "Desktop"

    const deviceInfo = `${browser} on ${os} (${device}) from ${ip}`

    if(!amount || !paymentDate || !paymentMethod || !referenceNumber){
        return res.status(400).json({message: "Missing required fields"})
    }

    const payDate = new Date(paymentDate);

    if(isNaN(payDate.getTime())){
        return res.status(400).json({message: "Payment Date is is not a valid date"})
    }

    try {
        const user = await prisma.user.findUnique(
            {
                where: {id: userId},
                include: {
                employee: true,
                provider: {
                    select: {
                        name: true
                    }
                }
            }
            }
        )
        const bill = await prisma.billing.findUnique({
            where: {
                id
            },
            include: {
                client: true
            }
        })

        if(!bill) return res.status(400).json({message: `Bill with id ${id} not found`})

        const isPaymentExists = await prisma.payment.findFirst({
            where: {
                referenceId: referenceNumber,
                client: {
                    providerId
                }
            },
        })

        if(isPaymentExists) return res.status(400).json({message: "Reference number already exists"})

        await prisma.payment.create({
            data: {
                billingId: id,
                clientId: bill.clientId,
                accountId: bill.accountId,
                amount,
                status: "PAID",
                paymentMethod,
                paymentChannel: paymentMethod,
                recordedBy: `Recorded By ${user?.employee?.fullName || user?.provider.name || 'Unknown'}`,
                referenceId: referenceNumber,
                remarks,
                paidAt: payDate
            }
        })

        const billStatus = amount == 0 ? "PENDING" : (amount + bill.paidAmount) < bill.amount ? "PARTIALLY_PAID" : "PAID"

        const updatedBill = await prisma.billing.update({
            where: {
                id
            },
            data: {
                status: billStatus,
                paidAmount: {
                    increment: amount
                }
            }
        })
        

        // implement sending receipt to client

        await prisma.log.create({
            data: {
                action: "Confirm Payment",
                entity: "Billing",
                userId: userId,
                message: `Pay bills ${bill.client.fullName}(${bill.client.accountNumber}) Period ${bill.period} recorded from ${deviceInfo}`,
                providerId
            }
        })

        return res.status(200).json(updatedBill)
    } catch (error) {
        console.log(error)
        return res.status(500).json({message: "Internal Server Error"})
    }
}