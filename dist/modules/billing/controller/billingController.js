"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.confirmPayment = exports.deleteBilling = exports.getFullYearBillingById = exports.getBillingById = exports.getBillings = exports.getBillingByAccountNumber = exports.createBilling = void 0;
const ua_parser_js_1 = require("ua-parser-js");
const date_fns_1 = require("date-fns");
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const createBilling = async (req, res) => {
    const { period, description, amount, clientId, dueDate } = req.body;
    const { providerId } = req.user;
    try {
        const billDuedate = dueDate ? new Date(dueDate) : null;
        if (billDuedate && isNaN(billDuedate.getTime())) {
            return res.status(400).json({ dueDate: 'installationDate must be a valid date' });
        }
        if (!period) {
            res.status(400).json({ message: "Bill Period is required" });
        }
        const client = await prisma.client.findUnique({
            where: { id: clientId },
            include: {
                servicePlan: true
            }
        });
        if (!client) {
            return res.status(404).json({ message: 'Client not found' });
        }
        const provider = await prisma.provider.findUnique({
            where: { id: providerId },
            select: { settings: true },
        });
        const settings = provider?.settings;
        const today = new Date();
        const prefix = settings?.invoiceDocument?.numberPrefix || 'INV-';
        const invoiceNumber = `${prefix}${today.getFullYear().toString().slice(2)}${Math.floor(Math.random() * 1e10).toString().padStart(10, '0')}`;
        let defaultDescription;
        if (!description) {
            defaultDescription = `Bill-Period-${period}-Acc-${client.accountNumber}`;
        }
        const billing = await prisma.billing.create({
            data: {
                invoiceNumber: invoiceNumber || `${Date.now().toString().slice(-10)}`,
                clientId,
                amount: amount || client.servicePlan?.monthlyFee,
                dueDate: billDuedate || new Date(new Date().setDate(client.billingDay)),
                period,
                description: description || defaultDescription
            }
        });
        return res.status(201).json(billing);
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};
exports.createBilling = createBilling;
const getBillingByAccountNumber = async (req, res) => {
    const { accountNumber } = req.params;
    try {
        const client = await prisma.client.findUnique({
            where: {
                accountNumber
            }
        });
        if (!client) {
            res.status(404).json({ message: "Client not found" });
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
        });
        return res.status(200).json(bill);
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};
exports.getBillingByAccountNumber = getBillingByAccountNumber;
const getBillings = async (req, res) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const status = typeof req.query.status === "string" && req.query.status !== "ALL"
        ? req.query.status
        : undefined;
    const month = typeof req.query.month === "string" ? req.query.month : undefined;
    const year = typeof req.query.year === "string" ? req.query.year : undefined;
    const providerId = req.user.providerId;
    const skip = (page - 1) * limit;
    try {
        const whereClause = {
            client: {
                providerId,
            },
        };
        // Optional filters
        if (status)
            whereClause.status = status;
        if (month && year) {
            const startDate = new Date(Number(year), Number(month) - 1, 1);
            const endDate = new Date(Number(year), Number(month), 0, 23, 59, 59);
            whereClause.dueDate = {
                gte: startDate,
                lte: endDate,
            };
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
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};
exports.getBillings = getBillings;
const getBillingById = async (req, res) => {
    const { id } = req.params;
    try {
        const bill = await prisma.billing.findUnique({
            where: {
                id,
                status: "PENDING"
            },
            include: {
                client: true
            }
        });
        if (!bill) {
            return res.status(404).json({ message: "Bill not found" });
        }
        return res.status(200).json(bill);
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};
exports.getBillingById = getBillingById;
const getFullYearBillingById = async (req, res) => {
    const { id } = req.params;
    const year = new Date().getFullYear();
    try {
        const billings = await prisma.billing.findMany({
            where: {
                clientId: id,
                billingDate: {
                    gte: (0, date_fns_1.startOfYear)(new Date(year, 0, 1)),
                    lte: (0, date_fns_1.endOfYear)(new Date(year, 11, 31))
                }
            },
            include: {
                payments: true
            },
            orderBy: {
                billingDate: "asc"
            }
        });
        return res.status(200).json(billings);
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};
exports.getFullYearBillingById = getFullYearBillingById;
const deleteBilling = async (req, res) => {
    const { id } = req.params;
    const { id: userId, providerId } = req.user;
    if (!id)
        return res.status(400).json({ message: "Missing required id field" });
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
        });
        const bill = await prisma.billing.findUnique({
            where: {
                id
            }
        });
        await prisma.billing.delete({
            where: {
                id,
                client: {
                    providerId
                }
            }
        });
        await prisma.log.create({
            data: {
                action: "DELETE",
                entity: "Billing",
                userId,
                providerId,
                message: `Bill with invoice no. ${bill?.invoiceNumber} deleted by ${user?.employee?.fullName || user?.provider.name || 'Unknown'}`
            }
        });
        return res.status(200).json({ message: "Bill deleted successfully" });
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};
exports.deleteBilling = deleteBilling;
const confirmPayment = async (req, res) => {
    const { id } = req.params;
    const { amount, paymentDate, paymentMethod, referenceNumber, remarks } = req.body;
    const { id: userId, providerId } = req.user;
    const ip = req.socket.remoteAddress;
    const ua = (0, ua_parser_js_1.UAParser)(req.headers["user-agent"] || "");
    const browser = ua.browser.name || "Unknown Browser";
    const os = ua.os.name || "Unknown OS";
    const device = ua.device.model || "Desktop";
    const deviceInfo = `${browser} on ${os} (${device}) from ${ip}`;
    if (!amount || !paymentDate || !paymentMethod || !referenceNumber) {
        return res.status(400).json({ message: "Missing required fields" });
    }
    const payDate = new Date(paymentDate);
    console.log(payDate);
    if (isNaN(payDate.getTime())) {
        return res.status(400).json({ message: "Payment Date is is not a valid date" });
    }
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                employee: true,
                provider: {
                    select: {
                        name: true
                    }
                }
            }
        });
        const bill = await prisma.billing.findUnique({
            where: {
                id
            },
            include: {
                client: true
            }
        });
        if (!bill)
            return res.status(400).json({ message: `Bill with id ${id} not found` });
        const isPaymentExists = await prisma.payment.findFirst({
            where: {
                referenceId: referenceNumber,
                client: {
                    providerId
                }
            },
        });
        if (isPaymentExists)
            return res.status(400).json({ message: "Reference number already exists" });
        await prisma.payment.create({
            data: {
                billingId: id,
                clientId: bill.clientId,
                amount,
                status: "PAID",
                paymentMethod,
                paymentChannel: paymentMethod,
                recordedBy: `Recorded By ${user?.employee?.fullName || user?.provider.name || 'Unknown'}`,
                referenceId: referenceNumber,
                remarks,
                paidAt: payDate
            }
        });
        const billStatus = amount == 0 ? "PENDING" : (amount + bill.paidAmount) < bill.amount ? "PARTIALLY_PAID" : "PAID";
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
        });
        // implement sending receipt to client
        await prisma.log.create({
            data: {
                action: "Confirm Payment",
                entity: "Billing",
                userId: userId,
                message: `Pay bills ${bill.client.fullName}(${bill.client.accountNumber}) Period ${bill.period} recorded from ${deviceInfo}`,
                providerId
            }
        });
        return res.status(200).json(updatedBill);
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};
exports.confirmPayment = confirmPayment;
//# sourceMappingURL=billingController.js.map