interface EmailSettings {
    enabled: boolean;
    emailHost?: string;
    emailPort?: number;
    emailUser?: string;
    emailPass?: string;
    senderName?: string;
    paymentConfirmationTemplate?: string;
}
export declare const emailIsConfigured: (settings: EmailSettings | undefined) => boolean;
export {};
//# sourceMappingURL=emailIsConfirgured.d.ts.map