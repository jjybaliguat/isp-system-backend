"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startPPPBandwidthCollector = startPPPBandwidthCollector;
const mikrotik_1 = require("../helpers/mikrotik");
const prisma_1 = __importDefault(require("../utils/prisma"));
let bandwidthBuffer = [];
const previousCounters = new Map();
const intervalSec = 2;
async function collectPPPoESessionsBandwidth() {
    const conn = await (0, mikrotik_1.getMikrotikConnection)();
    if (!conn)
        return;
    try {
        const interfaces = await conn.write(["/interface/print", "=stats="]);
        const activePppSessions = interfaces.filter((intf) => intf.type === "pppoe-in");
        const now = new Date();
        const pppBandwidths = activePppSessions.map((session) => {
            const username = session.name || "unknown";
            const rxBytes = Number(session["rx-byte"] || 0);
            const txBytes = Number(session["tx-byte"] || 0);
            const prev = previousCounters.get(username) || { rx: rxBytes, tx: txBytes };
            // Convert delta bytes to Mbps
            const rx_mbps = rxBytes >= prev.rx
                ? ((rxBytes - prev.rx) * 8) / (1000000 * intervalSec)
                : 0;
            const tx_mbps = txBytes >= prev.tx
                ? ((txBytes - prev.tx) * 8) / (1000000 * intervalSec)
                : 0;
            // console.log("RX: ", rx_mbps)
            // console.log("TX: ", tx_mbps)
            previousCounters.set(username, { rx: rxBytes, tx: txBytes });
            return { username, rx_mbps, tx_mbps, recordedAt: now };
        });
        bandwidthBuffer.push(...pppBandwidths);
    }
    catch (err) {
        console.error("Monitoring failed:", err.message);
        await (0, mikrotik_1.closeMikrotikConnection)();
    }
}
async function saveBandwidthBatch() {
    if (bandwidthBuffer.length === 0)
        return;
    const dataToSave = bandwidthBuffer;
    bandwidthBuffer = [];
    try {
        await prisma_1.default.pppoeBandwidth.createMany({ data: dataToSave, skipDuplicates: true });
        console.log(`Saved ${dataToSave.length} records`);
    }
    catch (err) {
        console.error("Batch save failed:", err.message);
        bandwidthBuffer.push(...dataToSave);
    }
}
async function startPPPBandwidthCollector() {
    let lastSave = Date.now();
    const saveInterval = 10000; // 10 seconds
    while (true) {
        const startTime = Date.now();
        await collectPPPoESessionsBandwidth();
        if (Date.now() - lastSave >= saveInterval) {
            await saveBandwidthBatch();
            lastSave = Date.now();
        }
        const elapsed = Date.now() - startTime;
        await new Promise(res => setTimeout(res, Math.max(0, (intervalSec * 1000) - elapsed)));
    }
}
//# sourceMappingURL=collectMikrotikPPPoE.js.map