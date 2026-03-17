import { decrypt } from "../utils/hasher";
import prisma from "../utils/prisma";
import { sendSms } from "./sendSms";
import { addDays, endOfDay, startOfDay } from "date-fns";

// Maximum number of SMS to send concurrently
const BATCH_SIZE = 5;

export const sendSmsWhenTheBillIsDue = async () => {
  try {
    const today = new Date();
    const currentDay = today.getDate();

    const providers = await prisma.provider.findMany({
      include: {
        smsIntegrationSettings: true,
      },
    });

    for (const provider of providers) {
      const settings = provider.smsIntegrationSettings;
      if (!settings || !settings.sendWhenBillIsDue) continue;

      const accountsDue = await prisma.accounts.findMany({
        where: {
          client: {
            providerId: provider.id
          },
          billingDay: currentDay,
          status: "ACTIVE",
        },
        include: {
          client: true,
          billings: {
            where: {
              dueDate: {
                gte: new Date(today.setHours(0, 0, 0, 0)),
                lt: new Date(today.setHours(23, 59, 59, 999)),
              },
              status: "PENDING",
            },
          },
        },
      });

      // Process SMS in batches to avoid overwhelming the SMS API
      const allSmsTasks: (() => Promise<void>)[] = [];

      for (const account of accountsDue) {
        for (const billing of account.billings) {
          const phoneNumber = account.client.phoneNumber;
          if (!phoneNumber) continue;

          allSmsTasks.push(async () => {
            try {
              const decryptedKey = decrypt(provider.semaphoreApiKey!);
              const messageTemplate = settings.sendWhenBillIsDueTemplate || "";

              await sendSms(phoneNumber, messageTemplate, {
                name: account.client.fullName,
                amount: billing.amount.toString(),
                accNum: account.accountNumber,
                dueDate: billing.dueDate.toLocaleDateString(),
                period: billing.period || "",
                companyName: provider.companyName || "",
                link: `https://sierracommunication.net/checkout/payment/${billing.id}`,
                websiteLink: process.env.WEBSITE_LINK!,
                email: account.client.email || "",
                phone: phoneNumber,
                billingDay: account.billingDay?.toString() || "",
              }, decryptedKey);

              console.log(`SMS sent to ${phoneNumber} for billing ${billing.invoiceNumber}`);
            } catch (error) {
              console.error("Error sending billing SMS:", error);
            }
          });
        }
      }

      // 2️⃣ Send SMS N days before due (reminder)
      if (settings.sendDaysBeforeDueEnabled && settings.sendDaysBeforeDueDays) {
        const reminderDate = addDays(today, settings.sendDaysBeforeDueDays);
        const accountsReminder = await prisma.accounts.findMany({
          where: {
            client: {
              providerId: provider.id
            },
            status: "ACTIVE",
          },
          include: {
            client: true,
            billings: {
              where: {
                dueDate: {
                  gte: startOfDay(reminderDate),
                  lte: endOfDay(reminderDate),
                },
                status: "PENDING",
              },
            },
          },
        });

        for (const account of accountsReminder) {
          for (const billing of account.billings) {
            const phoneNumber = account.client.phoneNumber;
            if (!phoneNumber) continue;

            allSmsTasks.push(async () => {
              try {
                const decryptedKey = decrypt(provider.semaphoreApiKey!);
                const template = settings.sendDaysBeforeDueTemplate || "";

                await sendSms(phoneNumber, template, {
                  name: account.client.fullName,
                  amount: billing.amount.toString(),
                  accNum: account.accountNumber,
                  dueDate: billing.dueDate.toLocaleDateString(),
                  period: billing.period || "",
                  companyName: provider.companyName || "",
                  link: `https://sierracommunication.net/checkout/payment/${billing.id}`,
                  websiteLink: process.env.WEBSITE_LINK!,
                  email: account.client.email || "",
                  phone: phoneNumber,
                  billingDay: account.billingDay?.toString() || "",
                }, decryptedKey);

                console.log(`Reminder SMS sent to ${phoneNumber} for billing ${billing.invoiceNumber}`);
              } catch (error) {
                console.error("Error sending reminder SMS:", error);
              }
            });
          }
        }
      }

       // 3️⃣ Execute tasks in batches
      for (let i = 0; i < allSmsTasks.length; i += BATCH_SIZE) {
        const batch = allSmsTasks.slice(i, i + BATCH_SIZE);
        await Promise.all(batch.map(task => task()));
      }
    }

    console.log("All billing SMS and reminders processed.");
  } catch (error) {
    console.error("Error in sendSmsWhenTheBillIsDue:", error);
  }
};
