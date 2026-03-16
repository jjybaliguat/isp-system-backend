"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMikrotikConnection = getMikrotikConnection;
exports.closeMikrotikConnection = closeMikrotikConnection;
// mikrotik.ts
const node_routeros_1 = require("node-routeros");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
let conn = null;
let isConnected = false;
const device = {
    host: process.env.MIKROTIK_HOST,
    user: process.env.MIKROTIK_USER,
    password: process.env.MIKROTIK_PASS,
    port: 8728,
    timeout: 5000,
    keepalive: true,
};
/**
 * Connects to MikroTik and returns the persistent connection.
 * Reuses connection if already connected.
 */
async function getMikrotikConnection() {
    if (isConnected && conn) {
        return conn;
    }
    conn = new node_routeros_1.RouterOSAPI(device);
    try {
        await conn.connect();
        isConnected = true;
        console.log('✅ Connected to MikroTik API');
        return conn;
    }
    catch (err) {
        console.error('❌ MikroTik connection failed:', err.message);
        isConnected = false;
        conn = null;
        return null;
    }
}
/**
 * Closes the MikroTik connection safely.
 */
async function closeMikrotikConnection() {
    if (conn) {
        try {
            await conn.close();
        }
        catch (err) {
            console.warn('⚠️ Error closing MikroTik connection:', err.message);
        }
        conn = null;
        isConnected = false;
    }
}
//# sourceMappingURL=mikrotik.js.map