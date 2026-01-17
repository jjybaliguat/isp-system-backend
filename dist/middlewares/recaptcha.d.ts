import { Request, Response, NextFunction } from 'express';
export declare const verifyRecaptcha: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
export default verifyRecaptcha;
//# sourceMappingURL=recaptcha.d.ts.map