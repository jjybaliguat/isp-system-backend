import { addMonths, startOfMonth, endOfMonth, addDays, format, getDate, startOfDay } from "date-fns";
import { PrismaClient } from "@prisma/client";

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

    const newInvoices = accounts.map((account, index) => {
        const invoiceNumber = `${prefix}${today.getFullYear().toString().slice(2)}${Math.floor(Math.random()*1e10).toString().padStart(10,'0')}`;
        const dueDate = addDays((start), (account.billingDay! - 1));
        return {
        invoiceNumber,
        clientId: account.clientId,
        accountId: account.id,
        billingDate: today,
        period,
        dueDate,
        amount: account.servicePlan?.monthlyFee ?? 0, // assuming client has monthlyFee field
        description: `Monthly Internet Subscription for ${period}`,
      };
    });

    await prisma.billing.createMany({
      data: newInvoices,
    });

    console.log(`✅ Successfully generated ${newInvoices.length} invoices for ${period}`);
  } catch (error) {
    console.error("❌ Error generating invoices:", error);
  }
};
