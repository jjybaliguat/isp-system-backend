"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendInvoiceReminders = sendInvoiceReminders;
const date_fns_1 = require("date-fns");
const date_fns_tz_1 = require("date-fns-tz");
const sendInvoiceReminderEmail_1 = require("./sendInvoiceReminderEmail");
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function sendInvoiceReminders(providerId) {
    try {
        const provider = await prisma.provider.findUnique({
            where: { id: providerId },
            select: { settings: true },
        });
        const job = await prisma.cronJob.findFirst({
            where: {
                providerId,
                type: "reminder"
            }
        });
        if (!job?.isActive)
            return;
        const settings = provider?.settings;
        if (!settings?.notifications?.enabled)
            return;
        const reminderDaysBeforeDue = settings?.billing?.sendInvoiceReminderDaysBeforeDue || '0';
        const reminderDays = reminderDaysBeforeDue.split(",");
        const today = new Date();
        for (const remindDay of reminderDays) {
            const targetLocalDate = (0, date_fns_1.addDays)(today, Number(remindDay));
            const startUtc = (0, date_fns_tz_1.toZonedTime)((0, date_fns_1.startOfDay)(targetLocalDate), "Asia/Manila");
            const endUtc = (0, date_fns_tz_1.toZonedTime)((0, date_fns_1.endOfDay)(targetLocalDate), "Asia/Manila");
            const invoices = await prisma.billing.findMany({
                where: {
                    // client: {
                    // providerId,
                    // status: "ACTIVE"
                    // },
                    account: {
                        client: {
                            providerId,
                            status: "ACTIVE"
                        }
                    },
                    OR: [
                        { status: "PENDING" },
                        { status: "OVERDUE" }
                    ],
                    dueDate: {
                        gte: startUtc,
                        lte: endUtc,
                    },
                },
                include: {
                    client: {
                        select: {
                            fullName: true,
                            email: true
                        }
                    },
                },
            });
            if (!settings.notifications.emailHost)
                return;
            for (const invoice of invoices) {
                try {
                    await (0, sendInvoiceReminderEmail_1.sendInvoiceReminderEmail)(settings.notifications.invoiceReminderTemplate, {
                        emailHost: settings.notifications.emailHost,
                        emailUser: settings.notifications.emailUser,
                        emailPass: settings.notifications.emailPass,
                        emailPort: settings.notifications.emailPort,
                        senderName: settings.notifications.senderName
                    }, invoice.client.email, "Billing Reminder", {
                        clientName: invoice.client.fullName,
                        invoiceNumber: invoice.invoiceNumber,
                        amount: invoice.amount,
                        dueDate: invoice.dueDate.toLocaleDateString(),
                        paymentUrl: `http://localhost:3000/checkout/payment/${invoice.id}`
                    });
                }
                catch (error) {
                    console.error(`Failed to send email to ${invoice.client.email}:`, error);
                }
            }
        }
    }
    catch (error) {
        console.error(`Error sending invoice reminders for provider ${providerId}:`, error);
    }
}
//# sourceMappingURL=sendInvoiceReminders.js.map