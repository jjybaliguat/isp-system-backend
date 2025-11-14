import { Request, Response } from "express";
export declare const getTeams: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const createTeam: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const deleteTeam: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const updateTeam: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=teamsController.d.ts.map