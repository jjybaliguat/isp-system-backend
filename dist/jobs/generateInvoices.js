"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateInvoices = void 0;
const date_fns_1 = require("date-fns");
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const generateInvoices = async (providerId) => {
    try {
        const today = new Date();
        const todayDay = (0, date_fns_1.getDate)(today);
        const provider = await prisma.provider.findUnique({
            where: { id: providerId },
            select: { settings: true },
        });
        const job = await prisma.cronJob.findFirst({
            where: {
                providerId,
                type: "invoice"
            }
        });
        if (!job?.isActive)
            return;
        const settings = provider?.settings;
        const thresholdDaysBeforeDue = settings?.billing?.invoiceGenerationDaysBeforeDue || 0;
        const clients = await prisma.client.findMany({
            where: {
                providerId,
                billingDay: todayDay + thresholdDaysBeforeDue,
            },
            include: {
                servicePlan: {
                    select: {
                        monthlyFee: true
                    }
                }
            }
        });
        if (clients.length === 0) {
            console.log("No clients found for this tenant.");
            return;
        }
        // Step 2: Determine the billing period (e.g., next month)
        const start = (0, date_fns_1.startOfMonth)(today);
        const period = (0, date_fns_1.format)(today, "MMMM yyyy");
        // Step 4: Get latest invoice number prefix
        const latestInvoice = await prisma.billing.findFirst({
            orderBy: { createdAt: "desc" },
            select: { invoiceNumber: true },
        });
        let lastNumber = 1000;
        if (latestInvoice && latestInvoice.invoiceNumber) {
            const match = latestInvoice.invoiceNumber.match(/\d+$/);
            if (match)
                lastNumber = parseInt(match[0]);
        }
        const prefix = settings?.invoiceDocument?.numberPrefix || 'INV-';
        const newInvoices = clients.map((client, index) => {
            const invoiceNumber = `${prefix}${today.getFullYear().toString().slice(2)}${Math.floor(Math.random() * 1e10).toString().padStart(10, '0')}`;
            const dueDate = (0, date_fns_1.addDays)((start), (client.billingDay - 1));
            return {
                invoiceNumber,
                clientId: client.id,
                billingDate: today,
                period,
                dueDate,
                amount: client.servicePlan?.monthlyFee ?? 0, // assuming client has monthlyFee field
                description: `Monthly Internet Subscription for ${period}`,
            };
        });
        await prisma.billing.createMany({
            data: newInvoices,
        });
        console.log(`✅ Successfully generated ${newInvoices.length} invoices for ${period}`);
    }
    catch (error) {
        console.error("❌ Error generating invoices:", error);
    }
};
exports.generateInvoices = generateInvoices;
//# sourceMappingURL=generateInvoices.js.map