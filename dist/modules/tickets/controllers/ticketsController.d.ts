import { Request, Response } from "express";
export declare const getTickets: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const createTicket: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const updateTicket: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getTicketLogs: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const deleteTicket: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const createTicketComment: (req: Request, res: Response) => Promise<void>;
export declare const getTicketComments: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const deleteTicketComment: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getAssignedTickets: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=ticketsController.d.ts.map