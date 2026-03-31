interface WireGuardKey {
    publicKey: string;
    privateKey: string;
    assignedIp: string;
}
export declare function generateMikrotikConnectScript(routerName: string, wgKey: WireGuardKey, serverListenPort: number, serverPublicKey: string, serverIp: string): string;
export {};
//# sourceMappingURL=generateMikrotikScript.d.ts.map