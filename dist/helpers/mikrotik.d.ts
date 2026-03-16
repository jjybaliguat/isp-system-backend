/**
 * Connects to MikroTik and returns the persistent connection.
 * Reuses connection if already connected.
 */
export declare function getMikrotikConnection(): Promise<any | null>;
/**
 * Closes the MikroTik connection safely.
 */
export declare function closeMikrotikConnection(): Promise<void>;
//# sourceMappingURL=mikrotik.d.ts.map