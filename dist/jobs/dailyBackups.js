"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scheduleDailyBackups = scheduleDailyBackups;
const node_cron_1 = __importDefault(require("node-cron"));
const client_1 = require("@prisma/client");
const backupController_1 = require("../modules/admin/controller/backupController");
const prisma = new client_1.PrismaClient();
function scheduleDailyBackups() {
    // run at 02:30 AM Asia/Manila daily
    node_cron_1.default.schedule('30 2 * * *', async () => {
        console.log('Running daily backup job:', new Date().toLocaleString());
        try {
            const providers = await prisma.provider.findMany({ where: { dailyBackup: true }, select: { id: true } });
            for (const p of providers) {
                try {
                    const { zipPath, zipFilename, when } = await (0, backupController_1.createBackupZipForProvider)(p.id);
                    await (0, backupController_1.sendBackupToProvider)(p.id, zipPath, zipFilename, when);
                    console.log(`Backup for provider ${p.id} completed and emailed.`);
                }
                catch (err) {
                    console.error(`Failed to create/email backup for provider ${p.id}:`, err);
                }
            }
        }
        catch (err) {
            console.error('Daily backups job failed:', err);
        }
    }, { timezone: 'Asia/Manila' });
}
//# sourceMappingURL=dailyBackups.js.map