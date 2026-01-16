import e, { Request, Response } from 'express';
export declare const getProvider: (req: Request, res: Response) => Promise<void>;
export declare const getProviders: (req: Request, res: Response) => Promise<e.Response<any, Record<string, any>> | undefined>;
export declare const getProvidersWithFilteredResponse: (req: Request, res: Response) => Promise<e.Response<any, Record<string, any>>>;
export declare const getProviderById: (req: Request, res: Response) => Promise<e.Response<any, Record<string, any>> | undefined>;
export declare const createProvider: (req: Request, res: Response) => Promise<e.Response<any, Record<string, any>>>;
export declare const updateProvider: (req: Request, res: Response) => Promise<e.Response<any, Record<string, any>>>;
export declare const deleteProvider: (req: Request, res: Response) => Promise<e.Response<any, Record<string, any>> | undefined>;
export declare const updateXenditKey: (req: Request, res: Response) => Promise<e.Response<any, Record<string, any>>>;
export declare const updateSemaphoreKey: (req: Request, res: Response) => Promise<e.Response<any, Record<string, any>> | undefined>;
export declare const getStoredKey: (req: Request, res: Response) => Promise<e.Response<any, Record<string, any>> | undefined>;
export declare const testXenditConnection: (req: Request, res: Response) => Promise<e.Response<any, Record<string, any>> | undefined>;
export declare const testSemaphoreConnection: (req: Request, res: Response) => Promise<e.Response<any, Record<string, any>> | undefined>;
export declare const updateAccount: (req: Request, res: Response) => Promise<e.Response<any, Record<string, any>> | undefined>;
export declare const createSmsIntegrationSettings: (req: Request, res: Response) => Promise<e.Response<any, Record<string, any>> | undefined>;
export declare const getSmsIntegrationSettings: (req: Request, res: Response) => Promise<e.Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=providerController.d.ts.map