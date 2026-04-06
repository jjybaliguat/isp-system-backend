import { Request, Response } from "express";
export declare const createMikrotikRouter: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getMikrotikRouters: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getMikrotikStatus: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getPPPProfiles: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const updateMikrotikRouter: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const deleteMikrotikRouter: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getPPPActive: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getPPPActiveV2: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getPPPoEHistory: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getPPPSecrets: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getPPPSecretsV2: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const updatePPPSecret: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const createPPPSecret: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const updatePPPSecrets: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const updatePPPSecretsV2: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=mikrotikContollers.d.ts.map