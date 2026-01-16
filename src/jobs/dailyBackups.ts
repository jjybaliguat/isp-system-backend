import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { createBackupZipForProvider, sendBackupToProvider } from '../modules/admin/controller/backupController';

const prisma = new PrismaClient();

export function scheduleDailyBackups() {
  // run at 02:30 AM Asia/Manila daily
  cron.schedule('30 2 * * *', async () => {
    console.log('Running daily backup job:', new Date().toLocaleString());
    try {
      const providers = await prisma.provider.findMany({ where: { dailyBackup: true }, select: { id: true } });
      for (const p of providers) {
        try {
          const { zipPath, zipFilename, when } = await createBackupZipForProvider(p.id);
          await sendBackupToProvider(p.id, zipPath, zipFilename, when);
          console.log(`Backup for provider ${p.id} completed and emailed.`);
        } catch (err) {
          console.error(`Failed to create/email backup for provider ${p.id}:`, err);
        }
      }
    } catch (err) {
      console.error('Daily backups job failed:', err);
    }
  }, { timezone: 'Asia/Manila' });
}
