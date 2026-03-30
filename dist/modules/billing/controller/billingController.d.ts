import { Request, Response } from "express";
export declare const createBilling: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const createBillingForAccount: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const updateBillingForAccount: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getBillingByAccountNumber: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getBillings: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getUnpaidBillingById: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getBillingById: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getFullYearBillingById: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const deleteBilling: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const confirmPayment: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const sendPaymentConfirmationEmail: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const sendEmailReminder: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const sendSmsReminder: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const generateBillingForAllAccounts: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getPaymentProofs: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=billingController.d.ts.map