"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logTransaction = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const logTransaction = async ({ action, entity, userId, providerId, message }) => {
    try {
        await prisma.log.create({
            data: {
                action,
                entity,
                ...(userId ? { userId } : {}), // only include if defined
                ...(providerId ? { providerId } : {}), // only include if defined
                ...(message ? { message } : {}), // only include if defined
            },
        });
    }
    catch (error) {
        console.error("Failed to log transaction:", error);
    }
};
exports.logTransaction = logTransaction;
//# sourceMappingURL=logger.js.map