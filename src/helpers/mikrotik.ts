// mikrotik.ts
import { RouterOSAPI } from 'node-routeros';
import dotenv from 'dotenv';

dotenv.config();

let conn: any | null = null;
let isConnected = false;

const device = {
  host: process.env.MIKROTIK_HOST!,
  user: process.env.MIKROTIK_USER!,
  password: process.env.MIKROTIK_PASS!,
  port: 8728,
  timeout: 5000,
  keepalive: true,
};

/**
 * Connects to MikroTik and returns the persistent connection.
 * Reuses connection if already connected.
 */
export async function getMikrotikConnection(): Promise<any | null> {
  if (isConnected && conn) {
    return conn;
  }

  conn = new RouterOSAPI(device);

  try {
    await conn.connect();
    isConnected = true;
    console.log('✅ Connected to MikroTik API');
    return conn;
  } catch (err: any) {
    console.error('❌ MikroTik connection failed:', err.message);
    isConnected = false;
    conn = null;
    return null;
  }
}

/**
 * Closes the MikroTik connection safely.
 */
export async function closeMikrotikConnection(): Promise<void> {
  if (conn) {
    try {
      await conn.close();
    } catch (err: any) {
      console.warn('⚠️ Error closing MikroTik connection:', err.message);
    }
    conn = null;
    isConnected = false;
  }
}