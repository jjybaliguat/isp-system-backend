/**
 * Connects to MikroTik and returns the persistent connection.
 * Reuses connection if already connected.
 */
export declare function getMikrotikConnection(): Promise<any | null>;
export declare function getMikrotikConnectionV2({ host, user, password }: {
    host: string;
    user: string;
    password: string;
}): Promise<any | null>;
/**
 * Closes the MikroTik connection safely.
 */
export declare function closeMikrotikConnection(): Promise<void>;
export declare function closeMikrotikConnectionV2(): Promise<void>;
//# sourceMappingURL=mikrotik.d.ts.map