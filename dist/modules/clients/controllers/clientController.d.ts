import { Request, Response } from "express";
export declare const getClients: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getAccounts: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getClientsAnalytics: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getPortalData: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getClientsCount: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getClientById: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const createClient: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const createAccount: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const updateClientAccount: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const deleteClientAccount: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const updateClient: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const deleteClient: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getClientsPhoneNumbers: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const generateSoaReport: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getClientBillings: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getUserTickets: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=clientController.d.ts.map