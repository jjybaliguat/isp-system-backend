import { addDays, startOfDay, endOfDay } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { sendInvoiceReminderEmail } from "./sendInvoiceReminderEmail";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function sendInvoiceReminders(providerId: string) {
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
    })

    if(!job?.isActive) return

    const settings = provider?.settings as {
      billing?: {
        sendInvoiceReminderDaysBeforeDue?: string;
      },
      notifications?: {
        enabled: boolean,
        emailUser: string,
        emailPass: string,
        emailHost: string,
        senderName: string,
        emailPort: number,
        invoiceReminderTemplate: string
      }
    } | undefined;

    if(!settings?.notifications?.enabled) return

    const reminderDaysBeforeDue = settings?.billing?.sendInvoiceReminderDaysBeforeDue || '0';
    const reminderDays = reminderDaysBeforeDue.split(",")
    const today = new Date();

    for(const remindDay of reminderDays) {
        const targetLocalDate = addDays(today, Number(remindDay));

        const startUtc = toZonedTime(startOfDay(targetLocalDate), "Asia/Manila");
        const endUtc = toZonedTime(endOfDay(targetLocalDate), "Asia/Manila");

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

            if(!settings.notifications.emailHost) return

            for(const invoice of invoices) {
                try {
                    await sendInvoiceReminderEmail(
                      settings.notifications.invoiceReminderTemplate, 
                      {
                        emailHost: settings.notifications.emailHost,
                        emailUser: settings.notifications.emailUser,
                        emailPass: settings.notifications.emailPass,
                        emailPort: settings.notifications.emailPort,
                        senderName: settings.notifications.senderName
                      }, 
                      invoice.client.email, "Billing Reminder", 
                      {
                        clientName: invoice.client.fullName,
                        invoiceNumber: invoice.invoiceNumber,
                        amount: invoice.amount,
                        dueDate: invoice.dueDate.toLocaleDateString(),
                        paymentUrl: `http://localhost:3000/checkout/payment/${invoice.id}`
                      }
                    )
                } catch (error) {
                    console.error(`Failed to send email to ${invoice.client.email}:`, error);
                }
            }
        }
  } catch (error) {
    console.error(`Error sending invoice reminders for provider ${providerId}:`, error);
  }
}
