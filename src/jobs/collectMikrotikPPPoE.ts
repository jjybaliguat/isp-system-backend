import { closeMikrotikConnection, getMikrotikConnection } from "../helpers/mikrotik";
import cron from "node-cron";
import prisma from "../utils/prisma";

interface PreviousCounter {
  rx: number;
  tx: number;
}

interface Bandwidth {
  username: string;
  rx_mbps: number;
  tx_mbps: number;
  recordedAt: Date;
}

const previousCounters = new Map<string, PreviousCounter>();

// buffer for 3 second batch
let bandwidthBuffer: Bandwidth[] = [];

async function collectPPPoESessionsBandwidth(): Promise<void> {
  const conn = await getMikrotikConnection();
  if (!conn) return;

  try {
    const interfaces = await conn.write("/interface/print", ["=stats="]);

    const activePppSessions = interfaces.filter(
      (intf: any) => intf.type === "pppoe-in"
    );

    const now = new Date();

    const pppBandwidths: Bandwidth[] = activePppSessions.slice(0, 50).map((session: any) => {
      const username = session.name || "unknown";

      const rxBytes = Number(session["rx-byte"] || 0);
      const txBytes = Number(session["tx-byte"] || 0);

      const prev = previousCounters.get(username) || { rx: rxBytes, tx: txBytes };

      const rx_mbps =
        rxBytes >= prev.rx ? ((rxBytes - prev.rx) * 8) / 1_000_000 : 0;

      const tx_mbps =
        txBytes >= prev.tx ? ((txBytes - prev.tx) * 8) / 1_000_000 : 0;

      previousCounters.set(username, { rx: rxBytes, tx: txBytes });

      return {
        username,
        rx_mbps,
        tx_mbps,
        recordedAt: now,
      };
    });

    // push to buffer instead of DB
    bandwidthBuffer.push(...pppBandwidths);

  } catch (err: any) {
    console.error("Monitoring failed:", err.message);
    await closeMikrotikConnection();
  }
}

/**
 * Save buffer every 5 seconds
 */
async function saveBandwidthBatch() {
  if (bandwidthBuffer.length === 0) return;

  const dataToSave = bandwidthBuffer;
  bandwidthBuffer = [];

  try {
    await prisma.pppoeBandwidth.createMany({
      data: dataToSave,
      skipDuplicates: true,
    });

    console.log(`Saved ${dataToSave.length} bandwidth records`);
  } catch (err: any) {
    console.error("Batch save failed:", err.message);

    // return records to buffer if failed
    bandwidthBuffer.push(...dataToSave);
  }
}

/**
 * Cleanup old records older than 7 days
 */
async function cleanupOldRecords() {
  try {
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const deleted = await prisma.pppoeBandwidth.deleteMany({
      where: {
        recordedAt: { lt: cutoff },
      },
    });

    if (deleted.count > 0) {
      console.log(`Deleted ${deleted.count} old PPPoE bandwidth records`);
    }

  } catch (err: any) {
    console.error("Cleanup failed:", err.message);
  }
}

cron.schedule("* * * * * *", cleanupOldRecords);

export async function startPPPBandwidthCollector() {
  let lastSave = Date.now();
  const saveInterval = 3000; // 3 seconds

  while (true) {
    const startTime = Date.now();
    // collect bandwidth
    await collectPPPoESessionsBandwidth();

    // check if it's time to save batch
    if (Date.now() - lastSave >= saveInterval) {
      await saveBandwidthBatch();
      lastSave = Date.now();
    }

    // sleep 1 second minus collection time to maintain 1-sec interval
    const elapsed = Date.now() - startTime;
    await new Promise(res => setTimeout(res, Math.max(0, 1000 - elapsed)));
  }
}