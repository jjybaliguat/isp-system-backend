"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.collectPPPoESessionsBandwidth = collectPPPoESessionsBandwidth;
const mikrotik_1 = require("../helpers/mikrotik");
const node_cron_1 = __importDefault(require("node-cron"));
const prisma_1 = __importDefault(require("../utils/prisma"));
const previousCounters = new Map();
// buffer for 5 second batch
let bandwidthBuffer = [];
async function collectPPPoESessionsBandwidth() {
    const conn = await (0, mikrotik_1.getMikrotikConnection)();
    if (!conn)
        return;
    try {
        const interfaces = await conn.write("/interface/print", ["=stats="]);
        const activePppSessions = interfaces.filter((intf) => intf.type === "pppoe-in");
        const now = new Date();
        const pppBandwidths = activePppSessions.map((session) => {
            const username = session.name || "unknown";
            const rxBytes = Number(session["rx-byte"] || 0);
            const txBytes = Number(session["tx-byte"] || 0);
            const prev = previousCounters.get(username) || { rx: rxBytes, tx: txBytes };
            const rx_mbps = rxBytes >= prev.rx ? ((rxBytes - prev.rx) * 8) / 1000000 : 0;
            const tx_mbps = txBytes >= prev.tx ? ((txBytes - prev.tx) * 8) / 1000000 : 0;
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
    }
    catch (err) {
        console.error("Monitoring failed:", err.message);
        await (0, mikrotik_1.closeMikrotikConnection)();
    }
}
/**
 * Save buffer every 5 seconds
 */
async function saveBandwidthBatch() {
    if (bandwidthBuffer.length === 0)
        return;
    const dataToSave = bandwidthBuffer;
    bandwidthBuffer = [];
    try {
        await prisma_1.default.pppoeBandwidth.createMany({
            data: dataToSave,
            skipDuplicates: true,
        });
        console.log(`Saved ${dataToSave.length} bandwidth records`);
    }
    catch (err) {
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
        const deleted = await prisma_1.default.pppoeBandwidth.deleteMany({
            where: {
                recordedAt: { lt: cutoff },
            },
        });
        if (deleted.count > 0) {
            console.log(`Deleted ${deleted.count} old PPPoE bandwidth records`);
        }
    }
    catch (err) {
        console.error("Cleanup failed:", err.message);
    }
}
node_cron_1.default.schedule("0 * * * *", cleanupOldRecords);
// collect every second
setInterval(collectPPPoESessionsBandwidth, 1000);
// save every 5 seconds
setInterval(saveBandwidthBatch, 5000);
//# sourceMappingURL=collectMikrotikPPPoE.js.map