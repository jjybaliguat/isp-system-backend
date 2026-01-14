import { BillingType, PrismaClient, UserRole } from "@prisma/client";
import { Request, Response } from "express";
import { logTransaction } from "../../../utils/logger";
import { addMonths, startOfMonth, endOfMonth, setDate, addDays, format } from "date-fns";
import { validate as isUuid } from "uuid";
import { decrypt } from "../../../utils/hasher";
import { sendSms } from "../../../jobs/sendSms";
import bcrypt from "bcryptjs";


const prisma = new PrismaClient();

export const getClients = async (req: Request, res: Response) => {
  const { id: userId, providerId } = req.user;
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
  const billingYear = Number(req.query.billingYear) || new Date().getFullYear();
  const coverageId =
    typeof req.query.coverageId === "string" && req.query.coverageId !== "All"
      ? req.query.coverageId
      : undefined;

  const status =
    typeof req.query.status === "string" && req.query.status !== "All"
      ? req.query.status
      : undefined;

  if (!providerId) {
    return res.status(401).json({ message: "Provider ID not found in token" });
  }

  const skip = (page - 1) * limit;

  try {
    const whereClause: any = {
      providerId,
      ...(coverageId && { coverageId }),
      ...(status && { status }),
      ...(search && {
        OR: [
          { fullName: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
          { phoneNumber: { contains: search, mode: "insensitive" } },
          {
            accounts: {
                some: {
                    accountNumber: { contains: search, mode: "insensitive" }
                }
            }
          }
        ],
      }),
    };

    const [clients, total] = await Promise.all([
      prisma.client.findMany({
        where: whereClause,
        include: {
            servicePlan: true,
            clientType: true,
            coverage: true,
            odpPort: {
            include: { odp: true }
            },
            accounts: { 
            include: {
                servicePlan: {
                select: { name: true, monthlyFee: true }
                },
                coverage: {
                select: { name: true }
                },
                odpPort: {
                include: { odp: true }
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
                }
                },
                billings: {
                    include: {
                        discounts: true,
                        billingCharges: true,
                        account: {
                            include: {
                                servicePlan: true
                            }
                        }
                    }
                }
            }
            }
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit
        }),
      prisma.client.count({ where: whereClause }),
    ]);

    // Filter billings per account by billingYear
    const clientsWithFilteredBillings = clients.map((client) => {
      const accounts = client.accounts.map((account) => {
        const filteredBillings = account.billings.filter(
          (billing) => billing.dueDate.getFullYear() === billingYear
        );
        return { ...account, billings: filteredBillings };
      });
      return { ...client, accounts };
    });

    return res.status(200).json({
      data: clientsWithFilteredBillings,
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


export const getAccounts = async(req: Request, res: Response) => {
    const { id: userId, providerId } = req.user;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    // console.log(search)
    const coverageId =
    typeof req.query.coverageId === "string" && req.query.coverageId !== "All"
      ? req.query.coverageId
      : undefined;

    const status =
    typeof req.query.status === "string" && req.query.status !== "All"
      ? req.query.status
      : undefined;

    if (!providerId) {
        return res.status(401).json({ message: "Provider ID not found in token" });
    }

    const skip = (page - 1) * limit;

    try {
        const whereClause: any = {
        client: {
            providerId
        },
        ...(coverageId && {coverageId}),
        ...(status && { status }),
        ...(search && {
            OR: [
            { client: { fullName: { contains: search, mode: "insensitive" } } },
            { client: { email: { contains: search, mode: "insensitive" } } },
            { client: { phoneNumber: { contains: search, mode: "insensitive" } } },
            { accountNumber: { contains: search, mode: "insensitive" } },
            ]
        }),
        };


        // Query + total count in parallel
        const [accounts, total] = await Promise.all([
            prisma.accounts.findMany({
                where: whereClause,
                include: {
                    servicePlan: true,
                    clientType: true,
                    coverage: true,
                    odpPort: true,
                    client: {
                        include: {
                            servicePlan: {
                                select: {
                                    name: true,
                                    monthlyFee: true
                                }
                            },
                            coverage: {
                                select: {
                                    name: true
                                }
                            },
                            odpPort: {
                                include: {
                                    odp: true
                                }
                            }
                        }
                    }
                },
                orderBy: { createdAt: "desc" },
                skip,
                take: limit,
            }),
            prisma.accounts.count({ where: whereClause }),
        ]);

        return res.status(200).json({
        data: accounts,
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

export const getClientsAnalytics = async(req: Request, res: Response) => {
    const {id: userId, providerId} = req.user;

    if(!providerId) {
        return res.status(401).json({ message: "Provider id not found in token" });
    }

    try {
        const chartData = []

        const endDate = new Date() // today
        endDate.setUTCHours(23, 59, 59, 999)

        const startDate = new Date()
        startDate.setUTCHours(0, 0, 0, 0)
        startDate.setFullYear(endDate.getFullYear() - 1) // 12 months ago

        let currentDate = new Date(startDate)

        while (currentDate <= endDate) {
            const dayStart = new Date(currentDate)
            dayStart.setUTCHours(0, 0, 0, 0)

            const dayEnd = new Date(currentDate)
            dayEnd.setUTCHours(23, 59, 59, 999)

            const dateStr = dayStart.toISOString().split("T")[0]

            // Count new clients installed on this date
            const newCount = await prisma.client.count({
            where: {
                providerId,
                installationDate: {
                    gte: dayStart,
                    lte: dayEnd,
                },
                status: "ACTIVE", // or your "NEW" equivalent
            },
            })

            // Count clients terminated on this date
            const terminatedCount = await prisma.client.count({
            where: {
                providerId,
                terminationDate: {
                    gte: dayStart,
                    lte: dayEnd,
                },
                status: "TERMINATED",
            },
            })

            chartData.push({
            date: dateStr,
            new: newCount,
            terminated: terminatedCount,
            })

            // console.log(dayEnd)

            // increment by 1 day (safe from DST issues)
            currentDate.setUTCDate(currentDate.getUTCDate() + 1)
        }

        // console.log(chartData)

        res.status(200).json(chartData)
        } catch (err) {
        console.error(err)
        res.status(500).json({ error: "Internal Server Error" })
        }

}

export const getPortalData = async (req: Request, res: Response) => {
  const { id } = req.user

  try {
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        client: {
          include: {
            accounts: {
              include: {
                servicePlan: true,
                billings: true,
              },
            },
          },
        },
      },
    })

    if (!user?.client) {
      return res.status(404).json({ message: "Client not found" })
    }

    // Map each account
    const accounts = user.client.accounts.map((account) => {
      // Calculate outstanding balance
      const outstandingBalance = account.billings.reduce((sum, bill) => {
        const paid = bill.paidAmount ?? 0
        return sum + (bill.amount - paid)
      }, 0)

      // Find next due date
      const upcomingBill = account.billings
        .filter((b) => !b.paidAt || (b.paidAmount ?? 0) < b.amount)
        .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())[0]

      return {
        id: account.id,
        accountNumber: account.accountNumber,
        activePlan: account.servicePlan?.name || "N/A",
        nextDueDate: upcomingBill
                ? upcomingBill.dueDate.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                })
                : "N/A",
        outstandingBalance,
        serviceStatus: account.status,
      }
    })

    res.json({ accounts })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Internal server error" })
  }
}


export const getClientsCount = async(req: Request, res: Response) => {
    const {id: userId, providerId} = req.user;

    if(!providerId) {
        return res.status(401).json({ message: "Provider id not found in token" });
    }

    try {
        const [total, active, partiallyDisconnected, terminated] = await Promise.all([
            prisma.client.count({ where: { providerId } }),
            prisma.client.count({ where: { providerId, status: "ACTIVE" } }),
            prisma.client.count({ where: { providerId, status: "PARTIALLY_DISCONNECTED" } }),
            prisma.client.count({ where: { providerId, status: "TERMINATED" } }),
        ]);
        return res.status(200).json({
            total,
            active,
            partiallyDisconnected,
            terminated
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

export const getClientById = async(req: Request, res: Response) => {
    const { id } = req.params as { id: string };

    const {providerId} = req.user;

    try {
        const client = await prisma.client.findUnique({
            where: {
                id,
                providerId
            }
        })

        if(!client) {
            return res.status(404).json({ error: 'Client not found' });
        }

        res.status(200).json(client);
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

export const createClient = async(req: Request, res: Response) => {
    const {
        code,
        fullName,
        email,
        phoneNumber,
        address,
        installationDate,
        accountNumber,
        mikrotikAccount,
        billingDay,
        servicePlanId,
        clientTypeId,
        coverageId,
        notes,
        proRatedDays,
        createBill,
        odpPortId
    } = req.body;
    
    const userId = req.user?.id
    const providerId = req.user?.providerId
    const role = req.user?.role

    if(!userId || !providerId) return res.status(401).json({message: "Unauthorized"})
    if((role !== UserRole.SUPERADMIN) && (role !== UserRole.ADMIN)) return res.status(403).json({message: "Forbidden"})
    
      const requiredFields: Record<string, unknown> = {
        code,
        fullName,
        email,
        phoneNumber,
        address,
        installationDate,
        accountNumber,
        mikrotikAccount,
        billingDay,
        servicePlanId,
        clientTypeId
    };

    const installDate = new Date(installationDate);
    if (isNaN(installDate.getTime())) {
        return res.status(400).json({ installationDate: 'installationDate must be a valid date' });
    }

        // Check for missing fields
    const missingFields = Object.entries(requiredFields)
        .filter(([_, value]) => value === undefined || value === null || value === "")
        .map(([key]) => key);

    if (missingFields.length > 0) {
        const errors: Record<string, string> = {};

        missingFields.forEach(field => {
            errors[field] = `${field} is required`;
        });

        return res.status(400).json({ ...errors });
    }

    
  const [isEmailExisting, isCodeExisting, accountNumberExisting, phoneNumberExisting] = await Promise.all([
    prisma.client.findUnique({ where: { email } }),
    prisma.client.findUnique({ where: { code } }),
    prisma.client.findUnique({ where: { accountNumber } }),
    prisma.client.findUnique({ where: { phoneNumber } }),
  ]);

  if(isEmailExisting) return res.status(400).json({ error: 'Email already exists' });
  if(isCodeExisting) return res.status(400).json({ error: 'Code already exists' });
  if(accountNumberExisting) return res.status(400).json({ error: 'Account Number already exists' });
  if(phoneNumberExisting) return res.status(400).json({ error: 'Phone Number already exists' });

    try {
        const provider = await prisma.provider.findUnique({
            where: { id: providerId },
            select: { settings: true, smsIntegrationSettings: true, companyName: true, semaphoreApiKey: true},
        });


        const result = await prisma.$transaction(async (tx) => {
            const client = await tx.client.create({
                data: {
                code,
                fullName,
                email,
                phoneNumber,
                address,
                installationDate: installDate,
                accountNumber,
                mikrotikAccount,
                servicePlanId,
                providerId,
                clientTypeId,
                coverageId,
                billingDay: Number(billingDay),
                notes,
                },
                include: {
                clientType: true,
                servicePlan: true,
                },
            });

            const account = await tx.accounts.create({
                data: {
                clientId: client.id,
                servicePlanId,
                clientTypeId,
                coverageId,
                accountNumber,
                billingDay: Number(billingDay),
                notes,
                mikrotikAccount,
                installationDate: installDate,
                address,
                },
            });

            const hashedPassword = await bcrypt.hash("admin123456", 10);

            const user = await tx.user.create({
                data: {
                email: client.email,
                password: hashedPassword,
                fullName: client.fullName,
                clientId: client.id,
                providerId,
                role: "CLIENT",
                },
            });

            return { client, account, user };
            });


        const nextMonth = addMonths(new Date(), 1);
        const dueDate = format(
        setDate(
            nextMonth,
            Math.min(
            result.account.billingDay!,
            endOfMonth(nextMonth).getDate()
            )
        ),
        "MMMM dd, yyyy"
        );

        if (provider?.smsIntegrationSettings?.sendWhenCustomerAdded) {

            try {
                const decryptedKey = decrypt(provider.semaphoreApiKey!);

                const messageTemplate =
                provider.smsIntegrationSettings?.sendWhenCustomerAddedTemplate || "";

                await sendSms(
                result.client.phoneNumber!,
                messageTemplate,
                {
                    name: result.client.fullName,
                    accNum: result.account.accountNumber,
                    billingDay: result.account.billingDay?.toString() || "",
                    companyName: provider.companyName || "",
                    email: result.client.email || "",
                    phone: result.client.phoneNumber || "",
                    amount: result.client.servicePlan?.monthlyFee.toString() || "",
                    link: "https://sierracommunication.net",
                    password: "admin123456",
                    websiteLink: process.env.WEBSITE_LINK!,
                    dueDate
                },
                decryptedKey
                );

                console.log("SMS sent successfully.");
            } catch (error) {
                console.error("Error sending billing SMS:", error);
            }
            }

        
        if(odpPortId && odpPortId !== ""){
            await prisma.odpPort.update({
                where: {
                    id: odpPortId
                },
                data: {
                    clientId: result.client.id,
                    accountId: result.account.id,
                    status: "OCCUPIED"
                }
            })
        }

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

        if(createBill) {
        // Fetch monthly payment from service plan
        const servicePlan = await prisma.servicePlan.findUnique({ where: { id: servicePlanId } });
        if(!servicePlan) throw new Error("Service plan not found");
        const monthlyPayment = servicePlan.monthlyFee;

        const today = new Date();
        const prefix = settings?.invoiceDocument?.numberPrefix || 'INV-';

        switch(createBill) {
            case "Full": {
                for (let i = 1; i <= 12; i++) {
                const billMonth = addMonths(today, i);
                const start = startOfMonth(billMonth);
                const period = `${billMonth.toLocaleString("default", { month: "long" })} ${billMonth.getFullYear()}`;

                // Generate 12-digit invoice number starting with last 2 digits of year
                const invoiceNumber = `${prefix}${billMonth.getFullYear().toString().slice(2)}${Math.floor(Math.random() * 1e10)
                .toString()
                .padStart(10, "0")}`;

                await prisma.billing.create({
                data: {
                    clientId: result.client.id,
                    accountId: result.account.id,
                    invoiceNumber,
                    billingDate: start,          // billing date = first day of month
                    dueDate: addDays(start, (result.client.billingDay!)),
                    period,
                    amount: monthlyPayment,
                    description: `Monthly bill for ${billMonth.toLocaleString("default", { month: "long" })}-Acc-${result.client.accountNumber}`,
                    billingType: BillingType.REGULAR,
                    billingCharges: {
                        create: [
                            {
                                name: servicePlan.name,
                                amount: servicePlan.monthlyFee,
                            }
                        ]
                    }
                }
                });
            }
            break;
            }
            case "ThisMonth": {
            const start = startOfMonth(today);
            const period = `${start.toLocaleString("default", { month: "long" })} ${start.getFullYear()}`;
            const invoiceNumber = `${prefix}${today.getFullYear().toString().slice(2)}${Math.floor(Math.random()*1e10).toString().padStart(10,'0')}`;
            await prisma.billing.create({
                data: {
                clientId: result.client.id,
                accountId: result.account.id,
                invoiceNumber,
                billingDate: today,
                dueDate: addDays(start, (result.client.billingDay! - 1)),
                period,
                amount: monthlyPayment,
                description: `Monthly bill for ${start.toLocaleString("default", { month: "long" })}-Acc-${result.client.accountNumber}`,
                billingType: BillingType.REGULAR,
                billingCharges: {
                    create: [
                        {
                            name: servicePlan.name,
                            amount: servicePlan.monthlyFee,
                        }
                    ]
                }
                }
            });
            break;
            }

            case "NextMonth": {
            const nextMonth = addMonths(today, 1);
            const start = startOfMonth(nextMonth);
            const period = `${nextMonth.toLocaleString("default", { month: "long" })} ${nextMonth.getFullYear()}`;
            const invoiceNumber = `${prefix}${today.getFullYear().toString().slice(2)}${Math.floor(Math.random()*1e10).toString().padStart(10,'0')}`;
            await prisma.billing.create({
                data: {
                clientId: result.client.id,
                accountId: result.account.id,
                invoiceNumber,
                billingDate: start,
                dueDate: addDays(start, (result.client.billingDay!)),
                period,
                amount: monthlyPayment,
                description: `Monthly bill for ${nextMonth.toLocaleString("default", { month: "long" })}-Acc-${result.client.accountNumber}`,
                billingType: BillingType.REGULAR,
                billingCharges: {
                    create: [
                        {
                            name: servicePlan.name,
                            amount: servicePlan.monthlyFee,
                        }
                    ]
                }
                }
            });
            break;
            }

            case "ProRated": {
            const amount = (monthlyPayment / 30) * Number(proRatedDays);
            const period = `Prorated`;
            const invoiceNumber = `${prefix}${today.getFullYear().toString().slice(2)}${Math.floor(Math.random()*1e10).toString().padStart(10,'0')}`;

            const dueDate = new Date(
                today.getFullYear(),
                today.getMonth() + 1,
                Number(result.client.billingDay)
            )
            await prisma.billing.create({
                data: {
                clientId: result.client.id,
                accountId: result.account.id,
                invoiceNumber,
                billingDate: today,
                dueDate: dueDate,
                period,
                amount,
                description: `ProRated bill for ${proRatedDays} days Acc-${result.client.accountNumber}`,
                billingType: BillingType.PRORATED,
                billingCharges: {
                    create: [
                        {
                            name: `ProRated - ${proRatedDays} days`,
                            amount: amount,
                        }
                    ]
                }
                }
            });
            break;
            }
        }
        }

        const user = await prisma.user.findUnique({
            where: { id: userId, providerId: providerId },
            include: {
                employee: true,
                provider: {
                    select: {
                        name: true
                    }
                }
            }
        })
        
        logTransaction({
            action: 'CREATE',
            entity: 'Client',
            userId: userId,
            providerId: providerId,
            message: `Client "${fullName}" created by user ${user?.employee?.fullName || user?.provider.name || 'Unknown'} ${createBill? `with created bill ${createBill}` : ""}`
        });

        res.status(201).json(result.client);
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

export const createAccount = async(req: Request, res: Response) => {
    const {
        clientId,
        address,
        installationDate,
        accountNumber,
        mikrotikAccount,
        billingDay,
        servicePlanId,
        clientTypeId,
        coverageId,
        notes,
        proRatedDays,
        generateBill,
        odpPortId
    } = req.body;
    
    const userId = req.user?.id
    const providerId = req.user?.providerId
    const role = req.user?.role

    if(!userId || !providerId) return res.status(401).json({message: "Unauthorized"})
    if((role !== UserRole.SUPERADMIN) && (role !== UserRole.ADMIN)) return res.status(403).json({message: "Forbidden"})
    
      const requiredFields: Record<string, unknown> = {
        address,
        installationDate,
        accountNumber,
        mikrotikAccount,
        billingDay,
        servicePlanId,
        clientTypeId
    };

    const installDate = new Date(installationDate);
    if (isNaN(installDate.getTime())) {
        return res.status(400).json({ installationDate: 'installationDate must be a valid date' });
    }

        // Check for missing fields
    const missingFields = Object.entries(requiredFields)
        .filter(([_, value]) => value === undefined || value === null || value === "")
        .map(([key]) => key);

    if (missingFields.length > 0) {
        const errors: Record<string, string> = {};

        missingFields.forEach(field => {
            errors[field] = `${field} is required`;
        });

        return res.status(400).json({ ...errors });
    }
    try {
        const result = await prisma.$transaction(async (tx) => {
            // 1. Create account
            const account = await tx.accounts.create({
                data: {
                clientId,
                address,
                installationDate: installDate,
                accountNumber,
                mikrotikAccount,
                servicePlanId,
                clientTypeId,
                coverageId,
                billingDay: Number(billingDay),
                notes,
                },
                include: {
                servicePlan: {
                    select: {
                    name: true,
                    monthlyFee: true,
                    },
                },
                coverage: {
                    select: {
                    name: true,
                    },
                },
                clientType: true,
                client: true,
                odpPort: {
                    include: {
                    odp: true,
                    },
                },
                },
            });

            // 2. Assign ODP Port if provided
            if (odpPortId && odpPortId !== "") {
                await tx.odpPort.update({
                where: { id: odpPortId },
                data: {
                    accountId: account.id,
                    status: "OCCUPIED",
                },
                });
            }

            // 3. Return updated account with latest ODP port
            const updatedAccount = await tx.accounts.findUnique({
                where: { id: account.id },
                include: {
                    servicePlan: {
                        select: {
                        name: true,
                        monthlyFee: true,
                        },
                    },
                    coverage: {
                        select: {
                        name: true,
                        },
                    },
                    clientType: true,
                    client: true,
                    odpPort: {
                        include: {
                        odp: true,
                        },
                    },
                },
            });

            return updatedAccount;
            });
        const provider = await prisma.provider.findUnique({
        where: { id: providerId },
        select: { settings: true, smsIntegrationSettings: true, companyName: true, semaphoreApiKey: true},
        });

        if(result && provider?.smsIntegrationSettings?.sendWhenCustomerAdded){
            // console.log("Scheduling SMS notification for new client added...");
            setImmediate(async () => {
                try {
                  const decryptedKey = decrypt(provider.semaphoreApiKey!);
                  const messageTemplate = provider.smsIntegrationSettings?.sendWhenCustomerAddedTemplate || ""
                  await sendSms(
                    result?.client.phoneNumber!,
                    messageTemplate,
                    {
                      name: result?.client.fullName || "",
                      accNum: result?.accountNumber || "",
                      billingDay: result?.billingDay!.toString() || "",
                      companyName: provider.companyName || "",
                      email: result?.client.email || "",
                      phone: result?.client.phoneNumber || ""
                    },
                    decryptedKey
                  );
                } catch (error) {
                  console.error("Error sending billing SMS:", error);
                }
            })
        }

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

        if(generateBill && result) {
            // Fetch monthly payment from service plan
            console.log("Account Created:", result.accountNumber, " - id", result.id)
            const servicePlan = await prisma.servicePlan.findUnique({ where: { id: servicePlanId } });
            if(!servicePlan) throw new Error("Service plan not found");
            const monthlyPayment = servicePlan.monthlyFee;

            const today = new Date();
            const prefix = settings?.invoiceDocument?.numberPrefix || 'INV-';

            switch(generateBill) {
                case "Full": {
                    for (let i = 1; i <= 12; i++) {
                    const billMonth = addMonths(today, i);
                    const start = startOfMonth(billMonth);
                    const period = `${billMonth.toLocaleString("default", { month: "long" })} ${billMonth.getFullYear()}`;

                    // Generate 12-digit invoice number starting with last 2 digits of year
                    const invoiceNumber = `${prefix}${billMonth.getFullYear().toString().slice(2)}${Math.floor(Math.random() * 1e10)
                    .toString()
                    .padStart(10, "0")}`;

                    await prisma.billing.create({
                        data: {
                            clientId: result?.clientId!,
                            accountId: result?.id!,
                            invoiceNumber,
                            billingDate: start,          // billing date = first day of month
                            dueDate: addDays(start, (result?.billingDay!)),
                            period,
                            amount: monthlyPayment,
                            description: `Monthly bill for ${billMonth.toLocaleString("default", { month: "long" })}-Acc-${result?.accountNumber!}`
                        }
                    });
                }
                break;
                }
                case "ThisMonth": {
                const start = startOfMonth(today);
                const period = `${start.toLocaleString("default", { month: "long" })} ${start.getFullYear()}`;
                const invoiceNumber = `${prefix}${today.getFullYear().toString().slice(2)}${Math.floor(Math.random()*1e10).toString().padStart(10,'0')}`;
                await prisma.billing.create({
                    data: {
                    clientId: result?.clientId!,
                    accountId: result?.id!,
                    invoiceNumber,
                    billingDate: today,
                    dueDate: addDays(start, (result?.billingDay! - 1)),
                    period,
                    amount: monthlyPayment,
                    description: `Monthly bill for ${start.toLocaleString("default", { month: "long" })}-Acc-${result?.accountNumber!}`
                    }
                });
                break;
                }

                case "NextMonth": {
                    const nextMonth = addMonths(today, 1)
                    const start = startOfMonth(nextMonth)

                    const billingDay = result.billingDay ?? 1

                    const dueDate = addDays(start, billingDay - 1)

                    const period = `${nextMonth.toLocaleString("default", { month: "long" })} ${nextMonth.getFullYear()}`
                    const invoiceNumber = `${prefix}${today
                        .getFullYear()
                        .toString()
                        .slice(2)}${Math.floor(Math.random() * 1e10)
                        .toString()
                        .padStart(10, "0")}`

                    await prisma.billing.create({
                        data: {
                        clientId: result.clientId,
                        accountId: result.id,
                        invoiceNumber,
                        billingDate: today,
                        dueDate,
                        period,
                        amount: monthlyPayment,
                        description: `Monthly bill for ${nextMonth.toLocaleString("default", {
                            month: "long",
                        })}-Acc-${result.accountNumber}`,
                        },
                    })

                    break
                    }
                case "ProRated": {
                const amount = (monthlyPayment / 30) * Number(proRatedDays);
                const period = `Prorated`;;
                const invoiceNumber = `${prefix}${today.getFullYear().toString().slice(2)}${Math.floor(Math.random()*1e10).toString().padStart(10,'0')}`;
                await prisma.billing.create({
                    data: {
                    clientId: result?.clientId,
                    accountId: result?.id,
                    invoiceNumber,
                    billingDate: today,
                    dueDate: addDays(today, (result?.billingDay! - 1)),
                    period,
                    amount,
                    description: `ProRated bill for ${proRatedDays} days Acc-${result?.accountNumber}`
                    }
                });
                break;
                }
            }
        }

        const user = await prisma.user.findUnique({
            where: { id: userId, providerId: providerId },
            include: {
                employee: true,
                provider: {
                    select: {
                        name: true
                    }
                }
            }
        })
        
        logTransaction({
            action: 'CREATE',
            entity: 'Client',
            userId: userId,
            providerId: providerId,
            message: `New Account for client ${result?.client.fullName} created by user ${user?.employee?.fullName || user?.provider.name || 'Unknown'} ${generateBill? `with created bill ${generateBill}` : ""}`
        });

        res.status(201).json(result);
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

export const updateClientAccount = async(req: Request, res: Response) => {
    const {id} = req.params as {id: string}
    const {
        address,
        installationDate,
        mikrotikAccount,
        billingDay,
        servicePlanId,
        clientTypeId,
        coverageId,
        odpPortId,
        status,
        notes,
    } = req.body

    if (!isUuid(id)) {
        return res.status(400).json({ message: "Invalid Account ID format (UUID required)" });
      }

    const installDate = new Date(installationDate);
    if (isNaN(installDate.getTime())) {
        return res.status(400).json({ installationDate: 'installationDate must be a valid date' });
    }
    
    try {
        const updatedAccount = await prisma.$transaction(async (tx) => {
            const existingAccount = await tx.accounts.findUnique({
                where: { id },
                include: { odpPort: true },
            });

            if (!existingAccount) throw new Error("Account not found");

            const account = await tx.accounts.update({
                where: { id },
                data: {
                address,
                mikrotikAccount,
                billingDay: Number(billingDay),
                notes,
                status,
                installationDate: installDate,
                servicePlan: { connect: { id: servicePlanId } },
                ...(clientTypeId && { clientType: { connect: { id: clientTypeId } } }),
                ...(coverageId && { coverage: { connect: { id: coverageId } } }),
                ...(odpPortId && { odpPort: { connect: { id: odpPortId } } }),
                },
                include: {
                    servicePlan: { select: { name: true, monthlyFee: true } },
                    coverage: { select: { name: true } },
                    clientType: true,
                    client: true,
                    odpPort: { include: { odp: true } },
                },
            });

            if (odpPortId) {
                const portUpdates = [];

                if (existingAccount.odpPort && existingAccount.odpPort.id !== odpPortId) {
                    portUpdates.push(
                        tx.odpPort.update({
                        where: { id: existingAccount.odpPort.id },
                        data: { status: "AVAILABLE", accountId: null },
                        })
                    );
                }

                portUpdates.push(
                    tx.odpPort.update({
                        where: { id: odpPortId },
                        data: { status: "OCCUPIED", accountId: account.id },
                    })
                );

                await Promise.all(portUpdates);
            }

            return account;
            });



        return res.status(200).json(updatedAccount)
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

export const deleteClientAccount = async(req: Request, res: Response) => {
    const {id} = req.params as {id: string}
    try {
        const account = await prisma.accounts.findUnique({
            where: {
                id
            },
            include: {
                odpPort: true
            }
        })

        await prisma.accounts.delete({
            where: {
                id
            }
        })

        if(account?.odpPort){
            await prisma.odpPort.update({
                where: {
                    id: account.odpPort.id
                },
                data: {
                    status: "AVAILABLE"
                }
            })
        }

        return res.status(200).json({message: "Client account deleted successfully"})
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

export const updateClient = async(req: Request, res: Response) => {
    const { id } = req.params as { id: string };
    const {id: userId, providerId} = req.user

    const {
        fullName,
        email,
        phoneNumber,
        address,
        mikrotikAccount,
        installationDate,
        billingDay,
        status,
        servicePlanId,
        clientTypeId,
        coverageId
    } = req.body;

    try {
        const user = await prisma.user.findUnique({
            where: { id: userId, providerId: providerId },
            include: {
                employee: true,
                provider: {
                    select: {
                        name: true
                    }
                }
            }
        })

        const installDate = new Date(installationDate)
        if (isNaN(installDate.getTime())) {
            return res.status(400).json({ installationDate: 'installationDate must be a valid date' });
        }

        const existingClient = await prisma.client.findUnique({
            where: {
                id,
                providerId
            }
        })

        if(!existingClient) {
            return res.status(404).json({ error: 'Client not found' });
        }

        const updatedClient = await prisma.client.update({
            where: {
                id
            },
            data: {
                fullName: fullName || existingClient.fullName,
                email: email || existingClient.email,
                phoneNumber: phoneNumber || existingClient.phoneNumber,
                address: address || existingClient.address,
                mikrotikAccount: mikrotikAccount || existingClient.mikrotikAccount,
                installationDate: installDate,
                billingDay: billingDay || existingClient.billingDay,
                status: status || existingClient.status,
                servicePlanId: servicePlanId || existingClient.servicePlanId,
                clientTypeId: clientTypeId || existingClient.clientTypeId,
                coverageId: coverageId || existingClient.coverageId,
                terminationDate: status === "TERMINATED" ? new Date() : null
            },
            include: {
                    servicePlan: true,
                    clientType: true,
                    coverage: true,
                    odpPort: true,
                    accounts: {
                        include: {
                            servicePlan: {
                                select: {
                                    name: true,
                                    monthlyFee: true
                                }
                            },
                            coverage: {
                                select: {
                                    name: true
                                }
                            },
                            odpPort: {
                                include: {
                                    odp: true
                                }
                            }
                        },
                        orderBy: {
                            createdAt: "desc"
                        }
                    }
                },
        })

        logTransaction({
            action: 'UPDATE',
            entity: 'Client',
            userId: userId,
            providerId: providerId,
            message: `Client "${existingClient.fullName}" updated by user ${user?.employee?.fullName || user?.provider.name || 'Unknown'}`
        });

        res.status(200).json(updatedClient);
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

export const deleteClient = async(req: Request, res: Response) => {
    const { id } = req.params as { id: string };
    
    const { id: userId, providerId } = req.user

    try {
        const user = await prisma.user.findUnique({
            where: { id: userId, providerId: providerId },
            include: {
                employee: true,
                provider: {
                    select: {
                        name: true
                    }
                }
            }
        })

        const existingClient = await prisma.client.findUnique({
            where: { id, providerId
        }})

        if(!existingClient) {
            return res.status(404).json({ error: 'Unable to delete, client not found' });
        }

        await prisma.client.delete({
            where: {
                id,
                providerId
            }
        })

        logTransaction({
            action: 'DELETE',
            entity: 'Client',
            userId: userId,
            providerId: providerId,
            message: `Client "${existingClient.fullName}" deleted by user ${user?.employee?.fullName || user?.provider.name || 'Unknown'}`
        });

        res.status(204).send();
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

export const getClientsPhoneNumbers = async(req: Request, res: Response) => {
    const {providerId} = req.user
    const coverageId = typeof req.query.coverageId === "string" && req.query.coverageId.trim() !== "" 
    ? req.query.coverageId.trim() 
    : null;

    const whereClause: any = { providerId }

    if (coverageId) {
    whereClause.coverageId = coverageId;
    }


    try {
        let phoneNumbers: string[] = []

        const clients = await prisma.client.findMany({
            where: whereClause,
            select: {
                phoneNumber: true
            }
        })

        clients.map((client)=>{
            phoneNumbers.push(client.phoneNumber)
        })

        return res.status(200).json(phoneNumbers)
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

export const generateSoaReport = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query;

    if (!id) {
      return res.status(400).json({ message: "Client ID is required" });
    }

    // Convert query params to Date objects
    const start = startDate ? new Date(startDate as string) : new Date("1970-01-01");
    const end = endDate ? new Date(endDate as string) : new Date();

    // Fetch client details with accounts, billings, payments, and discounts
    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        provider: {
            select: {
                companyAddress: true,
                companyLogoUrl: true,
                companyName: true,
                email: true,
                phoneNumber: true
            }
        },
        accounts: {
          include: {
            servicePlan: true,
            billings: {
              where: {
                dueDate: {
                  gte: start,
                  lte: end,
                },
              },
              include: {
                discounts: true
              },
              orderBy: { billingDate: "asc" },
            }
          },
        },
        servicePlan: true,
        payments: true,
      },
    });

    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }

    // Map account billing history and calculate totals
    const statement = client.accounts.map((account) => {
      const billingHistory = account.billings.map((billing) => {
        const totalDiscount = billing.discounts.reduce((sum, d) => sum + d.amount, 0);

        return {
          invoiceNumber: billing.invoiceNumber,
          billingDate: billing.billingDate,
          dueDate: billing.dueDate,
          period: billing.period,
          amount: billing.amount,
          discount: totalDiscount,
          paidAmount: billing.paidAmount,
          status: billing.status,
        };
      });

      // Totals for the account
      const totalBilled = billingHistory.reduce((sum, b) => sum + b.amount, 0);
      const totalPaid = billingHistory.reduce((sum, b) => sum + b.paidAmount, 0);
      const outstanding = totalBilled - totalPaid;

      return {
        accountNumber: account.accountNumber,
        servicePlan: account.servicePlan?.name || "N/A",
        billingHistory,
        totalBilled,
        totalPaid,
        outstanding,
      };
    });

    // Construct the SOA object ready for PDF export
    const soa = {
        provider: {
            companyAddress: client.provider?.companyAddress,
            companyLogoUrl: client.provider?.companyLogoUrl,
            companyName: client.provider?.companyName,
            email: client.provider?.email,
            phoneNumber: client.provider?.phoneNumber
        },
      client: {
        id: client.id,
        fullName: client.fullName,
        email: client.email,
        phoneNumber: client.phoneNumber,
        address: client.address,
        accountNumbers: client.accounts.map((a) => a.accountNumber),
      },
      statement,
      generatedAt: new Date(),
      period: { start, end },
    };

    return res.status(200).json(soa);
  } catch (error) {
    console.error("Error generating SOA:", error);
    return res.status(500).json({ message: "Failed to generate Statement of Account", error });
  }
};


export const getClientBillings = async (req: Request, res: Response) => {
  const { id: userId, providerId } = req.user

  try {
    /* ================= CLIENT ================= */
    const client = await prisma.client.findFirst({
      where: {
        users: {
            id: userId
        },
        providerId,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
      },
    })

    if (!client) {
      return res.status(404).json({ message: "Client not found" })
    }

    /* ================= BILLINGS ================= */
    const billings = await prisma.billing.findMany({
      where: {
        clientId: client.id,
      },
      include: {
        account: {
          include: {
            client: true
          }
        },
        billingCharges: true,
        discounts: true,
      },
      orderBy: {
        billingDate: "desc",
      },
    })

    /* ================= PAYMENTS (SEPARATE) ================= */
    const payments = await prisma.payment.findMany({
      where: {
        clientId: client.id,
      },
      include: {
        billing: {
          select: {
            id: true,
            invoiceNumber: true,
          },
        },
        account: {
          select: {
            id: true,
            accountNumber: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return res.status(200).json({
      client,
      billings: billings.map(b => ({
        id: b.id,
        invoiceNumber: b.invoiceNumber,
        billingDate: b.billingDate,
        dueDate: b.dueDate,
        period: b.period,
        amount: b.amount,
        paidAmount: b.paidAmount ?? 0,
        status: b.status,
        billingType: b.billingType,
        remarks: b.remarks,
        account: b.account,
        billingCharges: b.billingCharges,
        discounts: b.discounts,
        outstandingBalance: b.amount - (b.paidAmount ?? 0),
      })),
      payments: payments.map(p => ({
        id: p.id,
        amount: p.amount,
        status: p.status,
        paymentMethod: p.paymentMethod,
        paymentChannel: p.paymentChannel,
        referenceId: p.referenceId,
        paidAt: p.paidAt,
        paymentDate: p.paymentDate,
        createdAt: p.createdAt,
        invoiceNumber: p.billing?.invoiceNumber,
        accountNumber: p.account?.accountNumber
      })),
    })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ message: "Internal server error" })
  }
}

export const getUserTickets = async (req: Request, res: Response) => {
    const {id} = req.user as {id: string}

    try {
        const user = await prisma.user.findUnique({
            where: {
                id
            },
            include: {
                tickets: {
                    include: {
                        assignedToEmployee: true,
                        assignedToTeam: true,
                        createdBy: {
                            select: {
                                id: true,
                                fullName: true
                            }
                        }
                    },
                    orderBy: {
                        updatedAt: "desc"
                    }
                }
            }
        }
    )

        if(!user) return res.status(400).json({message: "User not found"})

        return res.status(200).json(user.tickets)
    } catch (error) {
        console.log(error)
        return res.status(500).json({message: "Internal Server Error"})
    }
}
