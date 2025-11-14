import { Request, Response } from 'express';
export declare const getNetworkHierarchy: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const createOlt: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const createPonPort: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const createLcp: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const createOdc: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const createOdp: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const createOdpPort: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const assignOdpPort: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const unAssignOdpPort: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const deleteOlt: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const deletePonPort: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const deleteLcp: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const deleteOdc: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const deleteOdp: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const deleteOdpPort: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=network-hierarchy-controller.d.ts.map