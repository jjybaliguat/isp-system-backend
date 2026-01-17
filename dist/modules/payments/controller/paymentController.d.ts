import { Request, Response } from "express";
export declare const getPayments: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const createPayment: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const xenditWebhook: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=paymentController.d.ts.map