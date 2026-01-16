import { Request, Response } from 'express';
export declare const downloadDatabaseBackup: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
declare const _default: {};
export default _default;
export declare function sendBackupToProvider(providerId: string, zipPath: string, zipFilename?: string, when?: Date): Promise<void>;
export declare function createBackupZipForProvider(providerId: string, when?: Date): Promise<{
    zipPath: string;
    zipFilename: string;
    when: Date;
}>;
//# sourceMappingURL=backupController.d.ts.map