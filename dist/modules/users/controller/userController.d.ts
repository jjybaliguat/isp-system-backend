import { Request, Response } from 'express';
export declare const getUsers: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const createUser: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const deleteUser: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const checkPassword: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const changePass: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=userController.d.ts.map