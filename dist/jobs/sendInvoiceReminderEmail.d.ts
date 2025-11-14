interface InvoiceReminderProps {
    clientName: string;
    invoiceNumber: string;
    amount: number;
    paymentUrl: string;
    dueDate: string;
}
interface EmailCredentialProps {
    emailHost: string;
    emailPass: string;
    emailUser: string;
    emailPort: number;
    senderName: string;
}
export declare function sendInvoiceReminderEmail(templateMd: string, emailCredentials: EmailCredentialProps, recipient: string, subject: string, data: InvoiceReminderProps): Promise<void>;
export {};
//# sourceMappingURL=sendInvoiceReminderEmail.d.ts.map