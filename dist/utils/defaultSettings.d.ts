declare const defaultSettings: {
    billing: {
        autoInvoicing: boolean;
        invoiceGenerationDaysBeforeDue: number;
        sendInvoiceReminderDaysBeforeDue: number;
    };
    payment: {
        latePaymentGracePeriod: number;
    };
    notifications: {
        enabled: boolean;
        invoiceReminderTemplate: string;
        paymentConfirmationTemplate: string;
        overdueNoticeTemplate: string;
    };
    invoiceDocument: {
        numberPrefix: string;
        startingNumber: number;
        includeTax: boolean;
        taxRate: number;
        companyLogoUrl: string;
        footerMessage: string;
    };
};
export default defaultSettings;
//# sourceMappingURL=defaultSettings.d.ts.map