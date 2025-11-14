import { Request, Response, NextFunction } from "express";
declare global {
    namespace Express {
        interface Request {
            user: {
                id: string;
                providerId: string;
                role: string;
            };
            smsKey?: string;
            xenditKey?: string;
        }
    }
}
export declare const authenticateProvider: (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export declare const validateProviderSmsKey: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const validateProviderXenditKey: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=authMiddleware.d.ts.map