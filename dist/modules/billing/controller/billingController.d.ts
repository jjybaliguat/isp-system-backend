import { Request, Response } from "express";
export declare const createBilling: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getBillingByAccountNumber: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getBillings: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getBillingById: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getFullYearBillingById: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const deleteBilling: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const confirmPayment: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=billingController.d.ts.map