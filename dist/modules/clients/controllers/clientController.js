"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getClientBillings = exports.generateSoaReport = exports.getClientsPhoneNumbers = exports.deleteClient = exports.updateClient = exports.deleteClientAccount = exports.updateClientAccount = exports.createAccount = exports.createClient = exports.getClientById = exports.getClientsCount = exports.getPortalData = exports.getClientsAnalytics = exports.getAccounts = exports.getClients = void 0;
const client_1 = require("@prisma/client");
const logger_1 = require("../../../utils/logger");
const date_fns_1 = require("date-fns");
const uuid_1 = require("uuid");
const hasher_1 = require("../../../utils/hasher");
const sendSms_1 = require("../../../jobs/sendSms");
const prisma = new client_1.PrismaClient();
const getClients = async (req, res) => {
    const { id: userId, providerId } = req.user;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const billingYear = Number(req.query.billingYear) || new Date().getFullYear();
    const coverageId = typeof req.query.coverageId === "string" && req.query.coverageId !== "All"
        ? req.query.coverageId
        : undefined;
    const status = typeof req.query.status === "string" && req.query.status !== "All"
        ? req.query.status
        : undefined;
    if (!providerId) {
        return res.status(401).json({ message: "Provider ID not found in token" });
    }
    const skip = (page - 1) * limit;
    try {
        const whereClause = {
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
                const filteredBillings = account.billings.filter((billing) => billing.dueDate.getFullYear() === billingYear);
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
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};
exports.getClients = getClients;
const getAccounts = async (req, res) => {
    const { id: userId, providerId } = req.user;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    // console.log(search)
    const coverageId = typeof req.query.coverageId === "string" && req.query.coverageId !== "All"
        ? req.query.coverageId
        : undefined;
    const status = typeof req.query.status === "string" && req.query.status !== "All"
        ? req.query.status
        : undefined;
    if (!providerId) {
        return res.status(401).json({ message: "Provider ID not found in token" });
    }
    const skip = (page - 1) * limit;
    try {
        const whereClause = {
            client: {
                providerId
            },
            ...(coverageId && { coverageId }),
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
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};
exports.getAccounts = getAccounts;
const getClientsAnalytics = async (req, res) => {
    const { id: userId, providerId } = req.user;
    if (!providerId) {
        return res.status(401).json({ message: "Provider id not found in token" });
    }
    try {
        const chartData = [];
        const endDate = new Date(); // today
        endDate.setUTCHours(23, 59, 59, 999);
        const startDate = new Date();
        startDate.setUTCHours(0, 0, 0, 0);
        startDate.setFullYear(endDate.getFullYear() - 1); // 12 months ago
        let currentDate = new Date(startDate);
        while (currentDate <= endDate) {
            const dayStart = new Date(currentDate);
            dayStart.setUTCHours(0, 0, 0, 0);
            const dayEnd = new Date(currentDate);
            dayEnd.setUTCHours(23, 59, 59, 999);
            const dateStr = dayStart.toISOString().split("T")[0];
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
            });
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
            });
            chartData.push({
                date: dateStr,
                new: newCount,
                terminated: terminatedCount,
            });
            // console.log(dayEnd)
            // increment by 1 day (safe from DST issues)
            currentDate.setUTCDate(currentDate.getUTCDate() + 1);
        }
        // console.log(chartData)
        res.status(200).json(chartData);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal Server Error" });
    }
};
exports.getClientsAnalytics = getClientsAnalytics;
const getPortalData = async (req, res) => {
    const { id } = req.user;
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
        });
        if (!user?.client) {
            return res.status(404).json({ message: "Client not found" });
        }
        // Map each account
        const accounts = user.client.accounts.map((account) => {
            // Calculate outstanding balance
            const outstandingBalance = account.billings.reduce((sum, bill) => {
                const paid = bill.paidAmount ?? 0;
                return sum + (bill.amount - paid);
            }, 0);
            // Find next due date
            const upcomingBill = account.billings
                .filter((b) => !b.paidAt || (b.paidAmount ?? 0) < b.amount)
                .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())[0];
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
            };
        });
        res.json({ accounts });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
};
exports.getPortalData = getPortalData;
const getClientsCount = async (req, res) => {
    const { id: userId, providerId } = req.user;
    if (!providerId) {
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
    }
    catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
exports.getClientsCount = getClientsCount;
const getClientById = async (req, res) => {
    const { id } = req.params;
    const { providerId } = req.user;
    try {
        const client = await prisma.client.findUnique({
            where: {
                id,
                providerId
            }
        });
        if (!client) {
            return res.status(404).json({ error: 'Client not found' });
        }
        res.status(200).json(client);
    }
    catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
exports.getClientById = getClientById;
const createClient = async (req, res) => {
    const { code, fullName, email, phoneNumber, address, installationDate, accountNumber, mikrotikAccount, billingDay, servicePlanId, clientTypeId, coverageId, notes, proRatedDays, createBill, odpPortId } = req.body;
    const userId = req.user?.id;
    const providerId = req.user?.providerId;
    const role = req.user?.role;
    if (!userId || !providerId)
        return res.status(401).json({ message: "Unauthorized" });
    if ((role !== client_1.UserRole.SUPERADMIN) && (role !== client_1.UserRole.ADMIN))
        return res.status(403).json({ message: "Forbidden" });
    const requiredFields = {
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
        const errors = {};
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
    if (isEmailExisting)
        return res.status(400).json({ error: 'Email already exists' });
    if (isCodeExisting)
        return res.status(400).json({ error: 'Code already exists' });
    if (accountNumberExisting)
        return res.status(400).json({ error: 'Account Number already exists' });
    if (phoneNumberExisting)
        return res.status(400).json({ error: 'Phone Number already exists' });
    try {
        const provider = await prisma.provider.findUnique({
            where: { id: providerId },
            select: { settings: true, smsIntegrationSettings: true, companyName: true, semaphoreApiKey: true },
        });
        const client = await prisma.client.create({
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
                notes
            },
            include: {
                clientType: true,
                servicePlan: true
            }
        });
        const account = await prisma.accounts.create({
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
            }
        });
        const nextMonth = (0, date_fns_1.addMonths)(new Date(), 1);
        const dueDate = (0, date_fns_1.format)((0, date_fns_1.setDate)(nextMonth, Math.min(account.billingDay, (0, date_fns_1.endOfMonth)(nextMonth).getDate())), "MMMM dd, yyyy");
        if (provider?.smsIntegrationSettings?.sendWhenCustomerAdded) {
            console.log("Sending SMS notification for new client added...");
            try {
                const decryptedKey = (0, hasher_1.decrypt)(provider.semaphoreApiKey);
                const messageTemplate = provider.smsIntegrationSettings?.sendWhenCustomerAddedTemplate || "";
                await (0, sendSms_1.sendSms)(client.phoneNumber, messageTemplate, {
                    name: client.fullName,
                    accNum: account.accountNumber,
                    billingDay: account.billingDay?.toString() || "",
                    companyName: provider.companyName || "",
                    email: client.email || "",
                    phone: client.phoneNumber || "",
                    amount: client.servicePlan?.monthlyFee.toString() || "",
                    link: "https://sierracommunication.net",
                    dueDate
                }, decryptedKey);
                console.log("SMS sent successfully.");
            }
            catch (error) {
                console.error("Error sending billing SMS:", error);
            }
        }
        if (odpPortId && odpPortId !== "") {
            await prisma.odpPort.update({
                where: {
                    id: odpPortId
                },
                data: {
                    clientId: client.id,
                    accountId: account.id,
                    status: "OCCUPIED"
                }
            });
        }
        const settings = provider?.settings;
        if (createBill) {
            // Fetch monthly payment from service plan
            const servicePlan = await prisma.servicePlan.findUnique({ where: { id: servicePlanId } });
            if (!servicePlan)
                throw new Error("Service plan not found");
            const monthlyPayment = servicePlan.monthlyFee;
            const today = new Date();
            const prefix = settings?.invoiceDocument?.numberPrefix || 'INV-';
            switch (createBill) {
                case "Full": {
                    for (let i = 1; i <= 12; i++) {
                        const billMonth = (0, date_fns_1.addMonths)(today, i);
                        const start = (0, date_fns_1.startOfMonth)(billMonth);
                        const period = `${billMonth.toLocaleString("default", { month: "long" })} ${billMonth.getFullYear()}`;
                        // Generate 12-digit invoice number starting with last 2 digits of year
                        const invoiceNumber = `${prefix}${billMonth.getFullYear().toString().slice(2)}${Math.floor(Math.random() * 1e10)
                            .toString()
                            .padStart(10, "0")}`;
                        await prisma.billing.create({
                            data: {
                                clientId: client.id,
                                accountId: account.id,
                                invoiceNumber,
                                billingDate: start, // billing date = first day of month
                                dueDate: (0, date_fns_1.addDays)(start, (client.billingDay)),
                                period,
                                amount: monthlyPayment,
                                description: `Monthly bill for ${billMonth.toLocaleString("default", { month: "long" })}-Acc-${client.accountNumber}`,
                                billingType: client_1.BillingType.REGULAR,
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
                    const start = (0, date_fns_1.startOfMonth)(today);
                    const period = `${start.toLocaleString("default", { month: "long" })} ${start.getFullYear()}`;
                    const invoiceNumber = `${prefix}${today.getFullYear().toString().slice(2)}${Math.floor(Math.random() * 1e10).toString().padStart(10, '0')}`;
                    await prisma.billing.create({
                        data: {
                            clientId: client.id,
                            accountId: account.id,
                            invoiceNumber,
                            billingDate: today,
                            dueDate: (0, date_fns_1.addDays)(start, (client.billingDay - 1)),
                            period,
                            amount: monthlyPayment,
                            description: `Monthly bill for ${start.toLocaleString("default", { month: "long" })}-Acc-${client.accountNumber}`,
                            billingType: client_1.BillingType.REGULAR,
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
                    const nextMonth = (0, date_fns_1.addMonths)(today, 1);
                    const start = (0, date_fns_1.startOfMonth)(nextMonth);
                    const period = `${nextMonth.toLocaleString("default", { month: "long" })} ${nextMonth.getFullYear()}`;
                    const invoiceNumber = `${prefix}${today.getFullYear().toString().slice(2)}${Math.floor(Math.random() * 1e10).toString().padStart(10, '0')}`;
                    await prisma.billing.create({
                        data: {
                            clientId: client.id,
                            accountId: account.id,
                            invoiceNumber,
                            billingDate: start,
                            dueDate: (0, date_fns_1.addDays)(start, (client.billingDay)),
                            period,
                            amount: monthlyPayment,
                            description: `Monthly bill for ${nextMonth.toLocaleString("default", { month: "long" })}-Acc-${client.accountNumber}`,
                            billingType: client_1.BillingType.REGULAR,
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
                    const invoiceNumber = `${prefix}${today.getFullYear().toString().slice(2)}${Math.floor(Math.random() * 1e10).toString().padStart(10, '0')}`;
                    const dueDate = new Date(today.getFullYear(), today.getMonth() + 1, Number(client.billingDay));
                    await prisma.billing.create({
                        data: {
                            clientId: client.id,
                            accountId: account.id,
                            invoiceNumber,
                            billingDate: today,
                            dueDate: dueDate,
                            period,
                            amount,
                            description: `ProRated bill for ${proRatedDays} days Acc-${client.accountNumber}`,
                            billingType: client_1.BillingType.PRORATED,
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
        });
        (0, logger_1.logTransaction)({
            action: 'CREATE',
            entity: 'Client',
            userId: userId,
            providerId: providerId,
            message: `Client "${fullName}" created by user ${user?.employee?.fullName || user?.provider.name || 'Unknown'} ${createBill ? `with created bill ${createBill}` : ""}`
        });
        res.status(201).json(client);
    }
    catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
exports.createClient = createClient;
const createAccount = async (req, res) => {
    const { clientId, address, installationDate, accountNumber, mikrotikAccount, billingDay, servicePlanId, clientTypeId, coverageId, notes, proRatedDays, generateBill, odpPortId } = req.body;
    const userId = req.user?.id;
    const providerId = req.user?.providerId;
    const role = req.user?.role;
    if (!userId || !providerId)
        return res.status(401).json({ message: "Unauthorized" });
    if ((role !== client_1.UserRole.SUPERADMIN) && (role !== client_1.UserRole.ADMIN))
        return res.status(403).json({ message: "Forbidden" });
    const requiredFields = {
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
        const errors = {};
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
            select: { settings: true, smsIntegrationSettings: true, companyName: true, semaphoreApiKey: true },
        });
        if (result && provider?.smsIntegrationSettings?.sendWhenCustomerAdded) {
            // console.log("Scheduling SMS notification for new client added...");
            setImmediate(async () => {
                try {
                    const decryptedKey = (0, hasher_1.decrypt)(provider.semaphoreApiKey);
                    const messageTemplate = provider.smsIntegrationSettings?.sendWhenCustomerAddedTemplate || "";
                    await (0, sendSms_1.sendSms)(result?.client.phoneNumber, messageTemplate, {
                        name: result?.client.fullName || "",
                        accNum: result?.accountNumber || "",
                        billingDay: result?.billingDay.toString() || "",
                        companyName: provider.companyName || "",
                        email: result?.client.email || "",
                        phone: result?.client.phoneNumber || ""
                    }, decryptedKey);
                }
                catch (error) {
                    console.error("Error sending billing SMS:", error);
                }
            });
        }
        const settings = provider?.settings;
        if (generateBill && result) {
            // Fetch monthly payment from service plan
            console.log("Account Created:", result.accountNumber, " - id", result.id);
            const servicePlan = await prisma.servicePlan.findUnique({ where: { id: servicePlanId } });
            if (!servicePlan)
                throw new Error("Service plan not found");
            const monthlyPayment = servicePlan.monthlyFee;
            const today = new Date();
            const prefix = settings?.invoiceDocument?.numberPrefix || 'INV-';
            switch (generateBill) {
                case "Full": {
                    for (let i = 1; i <= 12; i++) {
                        const billMonth = (0, date_fns_1.addMonths)(today, i);
                        const start = (0, date_fns_1.startOfMonth)(billMonth);
                        const period = `${billMonth.toLocaleString("default", { month: "long" })} ${billMonth.getFullYear()}`;
                        // Generate 12-digit invoice number starting with last 2 digits of year
                        const invoiceNumber = `${prefix}${billMonth.getFullYear().toString().slice(2)}${Math.floor(Math.random() * 1e10)
                            .toString()
                            .padStart(10, "0")}`;
                        await prisma.billing.create({
                            data: {
                                clientId: result?.clientId,
                                accountId: result?.id,
                                invoiceNumber,
                                billingDate: start, // billing date = first day of month
                                dueDate: (0, date_fns_1.addDays)(start, (result?.billingDay)),
                                period,
                                amount: monthlyPayment,
                                description: `Monthly bill for ${billMonth.toLocaleString("default", { month: "long" })}-Acc-${result?.accountNumber}`
                            }
                        });
                    }
                    break;
                }
                case "ThisMonth": {
                    const start = (0, date_fns_1.startOfMonth)(today);
                    const period = `${start.toLocaleString("default", { month: "long" })} ${start.getFullYear()}`;
                    const invoiceNumber = `${prefix}${today.getFullYear().toString().slice(2)}${Math.floor(Math.random() * 1e10).toString().padStart(10, '0')}`;
                    await prisma.billing.create({
                        data: {
                            clientId: result?.clientId,
                            accountId: result?.id,
                            invoiceNumber,
                            billingDate: today,
                            dueDate: (0, date_fns_1.addDays)(start, (result?.billingDay - 1)),
                            period,
                            amount: monthlyPayment,
                            description: `Monthly bill for ${start.toLocaleString("default", { month: "long" })}-Acc-${result?.accountNumber}`
                        }
                    });
                    break;
                }
                case "NextMonth": {
                    const nextMonth = (0, date_fns_1.addMonths)(today, 1);
                    const start = (0, date_fns_1.startOfMonth)(nextMonth);
                    const billingDay = result.billingDay ?? 1;
                    const dueDate = (0, date_fns_1.addDays)(start, billingDay - 1);
                    const period = `${nextMonth.toLocaleString("default", { month: "long" })} ${nextMonth.getFullYear()}`;
                    const invoiceNumber = `${prefix}${today
                        .getFullYear()
                        .toString()
                        .slice(2)}${Math.floor(Math.random() * 1e10)
                        .toString()
                        .padStart(10, "0")}`;
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
                    });
                    break;
                }
                case "ProRated": {
                    const amount = (monthlyPayment / 30) * Number(proRatedDays);
                    const period = `Prorated`;
                    ;
                    const invoiceNumber = `${prefix}${today.getFullYear().toString().slice(2)}${Math.floor(Math.random() * 1e10).toString().padStart(10, '0')}`;
                    await prisma.billing.create({
                        data: {
                            clientId: result?.clientId,
                            accountId: result?.id,
                            invoiceNumber,
                            billingDate: today,
                            dueDate: (0, date_fns_1.addDays)(today, (result?.billingDay - 1)),
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
        });
        (0, logger_1.logTransaction)({
            action: 'CREATE',
            entity: 'Client',
            userId: userId,
            providerId: providerId,
            message: `New Account for client ${result?.client.fullName} created by user ${user?.employee?.fullName || user?.provider.name || 'Unknown'} ${generateBill ? `with created bill ${generateBill}` : ""}`
        });
        res.status(201).json(result);
    }
    catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
exports.createAccount = createAccount;
const updateClientAccount = async (req, res) => {
    const { id } = req.params;
    const { address, installationDate, mikrotikAccount, billingDay, servicePlanId, clientTypeId, coverageId, odpPortId, status, notes, } = req.body;
    if (!(0, uuid_1.validate)(id)) {
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
            if (!existingAccount)
                throw new Error("Account not found");
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
                    portUpdates.push(tx.odpPort.update({
                        where: { id: existingAccount.odpPort.id },
                        data: { status: "AVAILABLE", accountId: null },
                    }));
                }
                portUpdates.push(tx.odpPort.update({
                    where: { id: odpPortId },
                    data: { status: "OCCUPIED", accountId: account.id },
                }));
                await Promise.all(portUpdates);
            }
            return account;
        });
        return res.status(200).json(updatedAccount);
    }
    catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
exports.updateClientAccount = updateClientAccount;
const deleteClientAccount = async (req, res) => {
    const { id } = req.params;
    try {
        const account = await prisma.accounts.findUnique({
            where: {
                id
            },
            include: {
                odpPort: true
            }
        });
        await prisma.accounts.delete({
            where: {
                id
            }
        });
        if (account?.odpPort) {
            await prisma.odpPort.update({
                where: {
                    id: account.odpPort.id
                },
                data: {
                    status: "AVAILABLE"
                }
            });
        }
        return res.status(200).json({ message: "Client account deleted successfully" });
    }
    catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
exports.deleteClientAccount = deleteClientAccount;
const updateClient = async (req, res) => {
    const { id } = req.params;
    const { id: userId, providerId } = req.user;
    const { fullName, email, phoneNumber, address, mikrotikAccount, installationDate, billingDay, status, servicePlanId, clientTypeId, coverageId } = req.body;
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
        });
        const installDate = new Date(installationDate);
        if (isNaN(installDate.getTime())) {
            return res.status(400).json({ installationDate: 'installationDate must be a valid date' });
        }
        const existingClient = await prisma.client.findUnique({
            where: {
                id,
                providerId
            }
        });
        if (!existingClient) {
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
        });
        (0, logger_1.logTransaction)({
            action: 'UPDATE',
            entity: 'Client',
            userId: userId,
            providerId: providerId,
            message: `Client "${existingClient.fullName}" updated by user ${user?.employee?.fullName || user?.provider.name || 'Unknown'}`
        });
        res.status(200).json(updatedClient);
    }
    catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
exports.updateClient = updateClient;
const deleteClient = async (req, res) => {
    const { id } = req.params;
    const { id: userId, providerId } = req.user;
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
        });
        const existingClient = await prisma.client.findUnique({
            where: { id, providerId
            }
        });
        if (!existingClient) {
            return res.status(404).json({ error: 'Unable to delete, client not found' });
        }
        await prisma.client.delete({
            where: {
                id,
                providerId
            }
        });
        (0, logger_1.logTransaction)({
            action: 'DELETE',
            entity: 'Client',
            userId: userId,
            providerId: providerId,
            message: `Client "${existingClient.fullName}" deleted by user ${user?.employee?.fullName || user?.provider.name || 'Unknown'}`
        });
        res.status(204).send();
    }
    catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
exports.deleteClient = deleteClient;
const getClientsPhoneNumbers = async (req, res) => {
    const { providerId } = req.user;
    const coverageId = typeof req.query.coverageId === "string" && req.query.coverageId.trim() !== ""
        ? req.query.coverageId.trim()
        : null;
    const whereClause = { providerId };
    if (coverageId) {
        whereClause.coverageId = coverageId;
    }
    try {
        let phoneNumbers = [];
        const clients = await prisma.client.findMany({
            where: whereClause,
            select: {
                phoneNumber: true
            }
        });
        clients.map((client) => {
            phoneNumbers.push(client.phoneNumber);
        });
        return res.status(200).json(phoneNumbers);
    }
    catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
exports.getClientsPhoneNumbers = getClientsPhoneNumbers;
const generateSoaReport = async (req, res) => {
    try {
        const { id } = req.params;
        const { startDate, endDate } = req.query;
        if (!id) {
            return res.status(400).json({ message: "Client ID is required" });
        }
        // Convert query params to Date objects
        const start = startDate ? new Date(startDate) : new Date("1970-01-01");
        const end = endDate ? new Date(endDate) : new Date();
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
                                discounts: true,
                                payments: true,
                            },
                            orderBy: { billingDate: "asc" },
                        },
                        payments: true,
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
                const totalPaid = billing.payments.reduce((sum, p) => sum + Number(p.amount), 0);
                return {
                    invoiceNumber: billing.invoiceNumber,
                    billingDate: billing.billingDate,
                    dueDate: billing.dueDate,
                    period: billing.period,
                    amount: billing.amount,
                    discount: totalDiscount,
                    paidAmount: totalPaid,
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
    }
    catch (error) {
        console.error("Error generating SOA:", error);
        return res.status(500).json({ message: "Failed to generate Statement of Account", error });
    }
};
exports.generateSoaReport = generateSoaReport;
const getClientBillings = async (req, res) => {
    const { id: userId, providerId } = req.user;
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
        });
        if (!client) {
            return res.status(404).json({ message: "Client not found" });
        }
        /* ================= BILLINGS ================= */
        const billings = await prisma.billing.findMany({
            where: {
                clientId: client.id,
            },
            include: {
                account: {
                    select: {
                        id: true,
                        accountNumber: true,
                    },
                },
                billingCharges: true,
                discounts: true,
            },
            orderBy: {
                billingDate: "desc",
            },
        });
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
        });
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
        });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};
exports.getClientBillings = getClientBillings;
//# sourceMappingURL=clientController.js.map