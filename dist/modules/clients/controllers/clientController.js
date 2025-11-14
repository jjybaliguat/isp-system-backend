"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getClientsPhoneNumbers = exports.deleteClient = exports.updateClient = exports.createClient = exports.getClientById = exports.getClientsCount = exports.getClientsAnalytics = exports.getClients = void 0;
const client_1 = require("@prisma/client");
const logger_1 = require("../../../utils/logger");
const date_fns_1 = require("date-fns");
const prisma = new client_1.PrismaClient();
const getClients = async (req, res) => {
    const { id: userId, providerId } = req.user;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    // console.log(search)
    const coverageId = typeof req.query.coverageId === "string" && req.query.coverageId !== "All"
        ? req.query.coverageId
        : undefined;
    console.log(coverageId);
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
                    { accountNumber: { contains: search, mode: "insensitive" } },
                    { email: { contains: search, mode: "insensitive" } },
                    { phoneNumber: { contains: search, mode: "insensitive" } }
                ],
            }),
        };
        // Query + total count in parallel
        const [clients, total] = await Promise.all([
            prisma.client.findMany({
                where: whereClause,
                include: {
                    servicePlan: true,
                    clientType: true,
                    coverage: true,
                    odpPort: true
                },
                orderBy: { createdAt: "desc" },
                skip,
                take: limit,
            }),
            prisma.client.count({ where: whereClause }),
        ]);
        return res.status(200).json({
            data: clients,
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
    const { code, fullName, email, phoneNumber, address, installationDate, accountNumber, mikrotikAccount, billingDay, servicePlanId, clientTypeId, coverageId, notes, proRatedDays, createBill } = req.body;
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
        const provider = await prisma.provider.findUnique({
            where: { id: providerId },
            select: { settings: true },
        });
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
                        const period = `Period ${billMonth.toLocaleString("default", { month: "long" })}`;
                        // Generate 12-digit invoice number starting with last 2 digits of year
                        const invoiceNumber = `${prefix}${billMonth.getFullYear().toString().slice(2)}${Math.floor(Math.random() * 1e10)
                            .toString()
                            .padStart(10, "0")}`;
                        await prisma.billing.create({
                            data: {
                                clientId: client.id,
                                invoiceNumber,
                                billingDate: start, // billing date = first day of month
                                dueDate: (0, date_fns_1.addDays)(start, (client.billingDay)),
                                period,
                                amount: monthlyPayment,
                                description: `Monthly bill for ${billMonth.toLocaleString("default", { month: "long" })}-Acc-${client.accountNumber}`
                            }
                        });
                    }
                    break;
                }
                case "ThisMonth": {
                    const start = (0, date_fns_1.startOfMonth)(today);
                    const period = `Period ${start.toLocaleString("default", { month: "long" })}`;
                    const invoiceNumber = `${prefix}${today.getFullYear().toString().slice(2)}${Math.floor(Math.random() * 1e10).toString().padStart(10, '0')}`;
                    await prisma.billing.create({
                        data: {
                            clientId: client.id,
                            invoiceNumber,
                            billingDate: today,
                            dueDate: (0, date_fns_1.addDays)(start, (client.billingDay - 1)),
                            period,
                            amount: monthlyPayment,
                            description: `Monthly bill for ${start.toLocaleString("default", { month: "long" })}-Acc-${client.accountNumber}`
                        }
                    });
                    break;
                }
                case "NextMonth": {
                    const nextMonth = (0, date_fns_1.addMonths)(today, 1);
                    const start = (0, date_fns_1.startOfMonth)(nextMonth);
                    const period = `Period ${nextMonth.toLocaleString("default", { month: "long" })}`;
                    const invoiceNumber = `${prefix}${today.getFullYear().toString().slice(2)}${Math.floor(Math.random() * 1e10).toString().padStart(10, '0')}`;
                    await prisma.billing.create({
                        data: {
                            clientId: client.id,
                            invoiceNumber,
                            billingDate: start,
                            dueDate: (0, date_fns_1.addDays)(start, (client.billingDay)),
                            period,
                            amount: monthlyPayment,
                            description: `Monthly bill for ${nextMonth.toLocaleString("default", { month: "long" })}-Acc-${client.accountNumber}`
                        }
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
                            clientId: client.id,
                            invoiceNumber,
                            billingDate: today,
                            dueDate: (0, date_fns_1.addDays)(today, (client.billingDay - 1)),
                            period,
                            amount,
                            description: `ProRated bill for ${proRatedDays} days Acc-${client.accountNumber}`
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
            }
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
//# sourceMappingURL=clientController.js.map