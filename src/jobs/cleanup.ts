// cleanup.ts
import prisma from "../utils/prisma";

export async function cleanupOldRecords() {
  try {
    console.log("Running cleanup...");

    const cutoff = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000); // 7 day ago

    const deleted = await prisma.pppoeBandwidth.deleteMany({
      where: { recordedAt: { lt: cutoff } },
    });

    console.log(`Deleted ${deleted.count} old PPPoE bandwidth records`);
  } catch (err: any) {
    console.error("Cleanup failed:", err.message);
  }
}