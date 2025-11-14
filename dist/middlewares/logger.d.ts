import { Request, Response, NextFunction } from 'express';
export declare const logEvents: (message: string, logFileName: string) => Promise<void>;
export declare const logger: (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=logger.d.ts.map