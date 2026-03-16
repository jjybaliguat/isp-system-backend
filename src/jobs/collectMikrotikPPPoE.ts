import { PrismaClient } from "@prisma/client";
import { closeMikrotikConnection, getMikrotikConnection } from "../helpers/mikrotik";
import cron from 'node-cron';

const prisma = new PrismaClient();

interface PreviousCounter {
  rx: number;
  tx: number;
}

interface Bandwidth {
  username: string;
  rx_mbps: number;
  tx_mbps: number;
  recorded_at: Date;
}

const previousCounters = new Map<string, PreviousCounter>();

export async function collectPPPoESessionsBandwidth(): Promise<void> {
  const conn = await getMikrotikConnection();
  if (!conn) return;

  try {
    const interfaces = await conn.write('/interface/print', ['=stats=']);
    const activePppSessions = interfaces.filter(
      (intf: any) => intf.type === 'pppoe-in'
    );

    const pppBandwidths: Bandwidth[] = activePppSessions.slice(0, 50).map((session: any) => {
      const username = session.name || 'unknown';
      const rxBytes = Number(session['rx-byte'] || 0);
      const txBytes = Number(session['tx-byte'] || 0);

      const prev = previousCounters.get(username) || { rx: rxBytes, tx: txBytes };

      const rx_mbps = rxBytes >= prev.rx ? ((rxBytes - prev.rx) * 8) / 1_000_000 : 0;
      const tx_mbps = txBytes >= prev.tx ? ((txBytes - prev.tx) * 8) / 1_000_000 : 0;

      previousCounters.set(username, { rx: rxBytes, tx: txBytes });

      return { username, rx_mbps, tx_mbps };
    });

    if (pppBandwidths.length > 0) {
      await prisma.pppoeBandwidth.createMany({
        data: pppBandwidths,
        skipDuplicates: true,
      });
    }

    console.log("Saved PPPoE sessions:", pppBandwidths.length);

  } catch (err: any) {
    console.error('Monitoring failed:', err.message);
    await closeMikrotikConnection();
  }
}

/**
 * Cleanup old records older than 7 days
 */
async function cleanupOldRecords() {
  try {
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
    // const cutoff = new Date(Date.now() - 3 * 1000);
    const deleted = await prisma.pppoeBandwidth.deleteMany({
      where: {
        recordedAt: { lt: cutoff },
      },
    });
    if (deleted.count > 0) {
      console.log(`🗑️ Deleted ${deleted.count} old PPPoE bandwidth records`);
    }
  } catch (err: any) {
    console.error('Cleanup failed:', err.message);
  }
}

cron.schedule('0 * * * *', cleanupOldRecords);
// cron.schedule('* * * * *', cleanupOldRecords);
// Run every second
setInterval(collectPPPoESessionsBandwidth, 1000);