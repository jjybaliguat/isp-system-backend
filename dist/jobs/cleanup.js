"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanupOldRecords = cleanupOldRecords;
// cleanup.ts
const prisma_1 = __importDefault(require("../utils/prisma"));
async function cleanupOldRecords() {
    try {
        console.log("Running cleanup...");
        const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 day ago
        const deleted = await prisma_1.default.pppoeBandwidth.deleteMany({
            where: { recordedAt: { lt: cutoff } },
        });
        console.log(`Deleted ${deleted.count} old PPPoE bandwidth records`);
    }
    catch (err) {
        console.error("Cleanup failed:", err.message);
    }
}
//# sourceMappingURL=cleanup.js.map