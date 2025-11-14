import { Request, Response } from "express";
export declare const getClients: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getClientsAnalytics: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getClientsCount: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getClientById: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const createClient: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const updateClient: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const deleteClient: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getClientsPhoneNumbers: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=clientController.d.ts.map