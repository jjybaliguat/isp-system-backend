import { Request, Response } from 'express';
export declare const getEmployees: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const createEmployee: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const updateEmployee: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const deleteEmployee: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=employeesController.d.ts.map