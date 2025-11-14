import { addMonths, startOfMonth, endOfMonth, addDays, format, getDate, startOfDay, endOfDay } from "date-fns";
import { Prisma, PrismaClient } from "@prisma/client";
import { toZonedTime } from "date-fns-tz";

const prisma = new PrismaClient();

export const generateInvoices = async (providerId: string) => {

  try {
    const today = new Date()
    const todayDay = getDate(today);

    const provider = await prisma.provider.findUnique({
      where: { id: providerId },
      select: { settings: true },
    });

    const job = await prisma.cronJob.findFirst({
      where: {
        providerId,
        type: "invoice"
      }
    })

    if(!job?.isActive) return

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

    const thresholdDaysBeforeDue = settings?.billing?.invoiceGenerationDaysBeforeDue || 0;

    // const clients = await prisma.client.findMany({
    //   where: {
    //     providerId,
    //     billingDay: todayDay + thresholdDaysBeforeDue,
    //   },
    //   include: {
    //     servicePlan: {
    //         select: {
    //             monthlyFee: true
    //         }
    //     }
    //   }
    // });

    const accounts = await prisma.accounts.findMany({
      where: {
        client: {
          providerId
        },
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

    if (accounts.length === 0) {
      console.log("No clients found for this tenant.");
      return;
    }

    // Step 2: Determine the billing period (e.g., next month)
    const start = startOfMonth(today);
    const period = format(today, "MMMM yyyy");

    // Step 4: Get latest invoice number prefix
    const latestInvoice = await prisma.billing.findFirst({
      orderBy: { createdAt: "desc" },
      select: { invoiceNumber: true },
    });

    let lastNumber = 1000;
    if (latestInvoice && latestInvoice.invoiceNumber) {
      const match = latestInvoice.invoiceNumber.match(/\d+$/);
      if (match) lastNumber = parseInt(match[0]);
    }

    const prefix = settings?.invoiceDocument?.numberPrefix || 'INV-';

    const invoicePromises = accounts.map(async (account) => {
      if (!account.billingDay) return null;

      // Generate unique invoice number
      const invoiceNumber = `${prefix}${today.getFullYear().toString().slice(2)}${Math.floor(Math.random() * 1e10).toString().padStart(10, '0')}`;

      // Calculate due date in Manila timezone
      const dueDate = addDays(start, account.billingDay - 1);
      const startUtc = toZonedTime(startOfDay(dueDate), "Asia/Manila");
      const endUtc = toZonedTime(endOfDay(dueDate), "Asia/Manila");

      // Skip if a billing already exists
      const existing = await prisma.billing.findFirst({
        where: {
          accountId: account.id,
          dueDate: {
            gte: startUtc,
            lte: endUtc,
          },
        },
      });
      if (existing) return null;

      return {
        invoiceNumber,
        clientId: account.clientId,
        accountId: account.id,
        billingDate: today,
        period,
        dueDate,
        amount: account.servicePlan?.monthlyFee ?? 0,
        description: `Monthly Internet Subscription for ${period}`,
      };
    });

    // Resolve all promises
    const invoices = (await Promise.all(invoicePromises)).filter(Boolean) as Prisma.BillingCreateManyInput[];

    // Insert all new invoices at once
    if (invoices.length > 0) {
      await prisma.billing.createMany({
        data: invoices,
      });
    }

    console.log(`✅ Successfully generated ${invoices.length} invoices for ${period}`);
  } catch (error) {
    console.error("❌ Error generating invoices:", error);
  }
};
