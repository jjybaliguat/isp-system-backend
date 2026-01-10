interface VariableProps {
    name?: string;
    amount?: string;
    accNum?: string;
    dueDate?: string;
    email?: string;
    phone?: string;
    companyName?: string;
    link?: string;
    period?: string;
    billingDay?: string;
}
export declare function sendSms(phoneNumber: string, template: string, data: VariableProps, apiKey: string): Promise<any>;
export {};
//# sourceMappingURL=sendSms.d.ts.map