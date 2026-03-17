import { addDays, startOfDay, endOfDay, subDays } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import prisma from "../utils/prisma";

export const checkOverdueInvoices = async() => {
    try {
        const providers = await prisma.provider.findMany()

        for(const provider of providers) {
            const settings = provider?.settings as {
            payment?: {
                latePaymentGracePeriod?: number;
            };
            } | undefined;

            const today = new Date()
            const targetLocalDate = subDays(today, Number(settings?.payment?.latePaymentGracePeriod || 0));

            // const startUtc = toZonedTime(startOfDay(targetLocalDate), "Asia/Manila");
            const endUtc = toZonedTime(endOfDay(targetLocalDate), "Asia/Manila");

            await prisma.billing.updateMany({
                where: {
                    // client: {
                    //     providerId: provider.id
                    // },
                    account: {
                        client: {
                            providerId: provider.id
                        }
                    },
                    dueDate: {
                        lte: endUtc,
                    },
                    status: "PENDING"
                },
                data: {
                    status: "OVERDUE"
                }
            })
        }
    } catch (error) {
        
    }
}