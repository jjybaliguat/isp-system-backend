interface PaymentConfirmationProps {
    clientName: string;
    invoiceNumber: string;
    amount: number;
    paymentDate: string;
    paymentMethod: string;
    receiptUrl: string;
}
interface EmailCredentialProps {
    emailHost: string;
    emailPass: string;
    emailUser: string;
    emailPort: number;
    senderName: string;
}
export declare function sendPaymentConfirmation(templateMd: string, emailCredentials: EmailCredentialProps, recipient: string, subject: string, data: PaymentConfirmationProps): Promise<any>;
export {};
//# sourceMappingURL=sendPaymentConfirmation.d.ts.map