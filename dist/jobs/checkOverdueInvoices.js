"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkOverdueInvoices = void 0;
const date_fns_1 = require("date-fns");
const date_fns_tz_1 = require("date-fns-tz");
const prisma_1 = __importDefault(require("../utils/prisma"));
const checkOverdueInvoices = async () => {
    try {
        const providers = await prisma_1.default.provider.findMany();
        for (const provider of providers) {
            const settings = provider?.settings;
            const today = new Date();
            const targetLocalDate = (0, date_fns_1.subDays)(today, Number(settings?.payment?.latePaymentGracePeriod || 0));
            // const startUtc = toZonedTime(startOfDay(targetLocalDate), "Asia/Manila");
            const endUtc = (0, date_fns_tz_1.toZonedTime)((0, date_fns_1.endOfDay)(targetLocalDate), "Asia/Manila");
            await prisma_1.default.billing.updateMany({
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
            });
        }
    }
    catch (error) {
    }
};
exports.checkOverdueInvoices = checkOverdueInvoices;
//# sourceMappingURL=checkOverdueInvoices.js.map