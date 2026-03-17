"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.downloadDatabaseBackup = void 0;
exports.sendBackupToProvider = sendBackupToProvider;
exports.createBackupZipForProvider = createBackupZipForProvider;
const child_process_1 = require("child_process");
const archiver_1 = __importDefault(require("archiver"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const nodemailer_1 = __importDefault(require("nodemailer"));
const prisma_1 = __importDefault(require("../../../utils/prisma"));
// Stream a pg_dump plain SQL into a zip, send to client and optionally email to provider
const downloadDatabaseBackup = async (req, res) => {
    const { role, providerId } = req.user;
    if (!(role === 'SUPERADMIN' || role === 'ADMIN')) {
        return res.status(403).json({ message: 'Forbidden' });
    }
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl)
        return res.status(500).json({ message: 'DATABASE_URL not configured' });
    try {
        const parsed = new URL(databaseUrl);
        const username = parsed.username;
        const password = parsed.password;
        const host = parsed.hostname;
        const port = parsed.port || '5432';
        const dbName = parsed.pathname ? parsed.pathname.slice(1) : '';
        if (!dbName)
            return res.status(500).json({ message: 'Database name not found in DATABASE_URL' });
        // Prepare pg_dump args (plain SQL)
        const args = [
            '--host', host,
            '--port', port,
            '--username', username,
            '--no-owner',
            '--no-privileges',
            '--format', 'plain', // plain SQL
            dbName,
        ];
        const env = { ...process.env, PGPASSWORD: password };
        const dump = (0, child_process_1.spawn)('pg_dump', args, { env });
        dump.on('error', (err) => {
            console.error('pg_dump failed to start', err);
            try {
                return res.status(500).json({ message: 'Failed to start pg_dump. Is pg_dump installed and in PATH?' });
            }
            catch (e) {
                return;
            }
        });
        // Prepare names and paths
        const now = new Date();
        const sqlFilename = `backup-${now.toISOString().slice(0, 10)}-db.sql`;
        const zipFilename = `backup-${now.toISOString().slice(0, 10)}-db.zip`;
        const providerDirName = (await prisma_1.default.provider.findUnique({ where: { id: providerId }, select: { companyName: true } }))?.companyName?.trim().replace(/\s+/g, '_') || providerId;
        const backupDir = path_1.default.join(process.cwd(), 'uploads', 'backups', providerDirName);
        if (!fs_1.default.existsSync(backupDir))
            fs_1.default.mkdirSync(backupDir, { recursive: true });
        const zipPath = path_1.default.join(backupDir, zipFilename);
        // Set response headers for zip download
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${zipFilename}"`);
        const archive = (0, archiver_1.default)('zip', { zlib: { level: 9 } });
        archive.on('error', (err) => {
            console.error('Archive error', err);
            try {
                res.status(500).end();
            }
            catch (e) { }
        });
        // Pipe archive to response and file
        const fileStream = fs_1.default.createWriteStream(zipPath);
        archive.pipe(res);
        archive.pipe(fileStream);
        // Helpful stream event listeners for debugging/completion
        fileStream.on('close', () => {
            console.log('fileStream closed (zip written to disk)');
        });
        fileStream.on('finish', () => {
            console.log('fileStream finished');
        });
        // When the file stream is closed (zip fully written to disk), perform post-processing like emailing
        fileStream.on('close', () => {
            const sendEmail = req.query.sendEmail === 'true' || req.query.sendEmail === '1';
            if (!sendEmail) {
                console.log('sendEmail not requested; skipping email send');
                return;
            }
            (async () => {
                try {
                    console.log('fileStream close: preparing to email backup via helper');
                    await sendBackupToProvider(providerId, zipPath, zipFilename, now);
                    console.log('backup emailed and temp file deleted (or scheduled)');
                }
                catch (err) {
                    console.error('Failed to email backup via helper', err);
                }
            })();
        });
        res.on('close', () => {
            console.log('HTTP response closed by client');
            // If the client disconnects before archive finalizes, attempt to finalize/cleanup
            if (!finalized) {
                console.warn('Client disconnected before archive finalized');
            }
        });
        res.on('finish', () => {
            console.log('HTTP response finished');
        });
        archive.on('end', () => {
            console.log('archive end');
        });
        // debug helpers
        let finalized = false;
        const finalizeArchive = async () => {
            if (finalized)
                return;
            finalized = true;
            try {
                await archive.finalize();
            }
            catch (err) {
                console.error('Archive finalize error', err);
            }
        };
        // Append pg_dump stdout as SQL file inside zip
        archive.append(dump.stdout, { name: sqlFilename });
        // Ensure we finalize when stdout ends or when process closes
        dump.stdout.on('end', () => {
            console.log('pg_dump stdout end');
            finalizeArchive();
        });
        dump.on('close', (code) => {
            console.log('pg_dump process close', code);
            if (code !== 0)
                console.error('pg_dump exited with code', code);
            // finalize (if not already) after a short tick to ensure stdout 'end' has fired
            setImmediate(() => finalizeArchive());
        });
        dump.stderr.on('data', (data) => {
            console.error('pg_dump stderr:', data.toString());
        });
        // archive 'close' may not always fire reliably when piping to an HTTP response
        // Keep a small log here to know if it does fire
        archive.on('close', () => {
            console.log('archive close event fired');
        });
    }
    catch (error) {
        console.error('backup error', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};
exports.downloadDatabaseBackup = downloadDatabaseBackup;
exports.default = {};
// Exported helper: send the backup zip at zipPath to the provider's email if configured
async function sendBackupToProvider(providerId, zipPath, zipFilename, when) {
    try {
        const provider = await prisma_1.default.provider.findUnique({ where: { id: providerId }, select: { email: true, backUpEmail: true, companyName: true, dailyBackup: true, settings: true } });
        if (!provider?.email) {
            throw new Error('Provider has no email configured');
        }
        // If called externally for scheduled backup, caller can check settings first; here we just proceed.
        const ts = when ? when.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
        const transporter = nodemailer_1.default.createTransport({
            host: process.env.EMAIL_HOST,
            port: Number(process.env.EMAIL_PORT) || 465,
            secure: process.env.NODE_ENV === 'production' ? true : false,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });
        const toEmail = String((provider)?.backUpEmail ? provider.backUpEmail : provider.email);
        await transporter.sendMail({
            from: `${process.env.EMAIL_SENDER_NAME || 'DB-BACKUP'} <${process.env.EMAIL_USER}>`,
            to: toEmail,
            subject: `Database backup - ${provider?.companyName || ''} - ${ts}`,
            text: `Attached is the database backup generated on ${ts}`,
            attachments: [{ filename: zipFilename || path_1.default.basename(zipPath), path: zipPath }],
        });
        // delete the file after sending
        fs_1.default.unlink(zipPath, (err) => { if (err)
            console.error('Failed to delete temp backup', err); });
    }
    catch (err) {
        console.error('sendBackupToProvider error', err);
        throw err;
    }
}
// Create a backup zip file for a provider by running pg_dump and zipping the SQL output.
// Returns { zipPath, zipFilename, when }
async function createBackupZipForProvider(providerId, when) {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl)
        throw new Error('DATABASE_URL not configured');
    const parsed = new URL(databaseUrl);
    const username = parsed.username;
    const password = parsed.password;
    const host = parsed.hostname;
    const port = parsed.port || '5432';
    const dbName = parsed.pathname ? parsed.pathname.slice(1) : '';
    if (!dbName)
        throw new Error('Database name not found in DATABASE_URL');
    const args = [
        '--host', host,
        '--port', port,
        '--username', username,
        '--no-owner',
        '--no-privileges',
        '--format', 'plain',
        dbName,
    ];
    const env = { ...process.env, PGPASSWORD: password };
    const dump = (0, child_process_1.spawn)('pg_dump', args, { env });
    const now = when || new Date();
    const sqlFilename = `backup-${now.toISOString().slice(0, 10)}-db.sql`;
    const zipFilename = `backup-${now.toISOString().slice(0, 10)}-db.zip`;
    const providerDirName = (await prisma_1.default.provider.findUnique({ where: { id: providerId }, select: { companyName: true } }))?.companyName?.trim().replace(/\s+/g, '_') || providerId;
    const backupDir = path_1.default.join(process.cwd(), 'uploads', 'backups', providerDirName);
    if (!fs_1.default.existsSync(backupDir))
        fs_1.default.mkdirSync(backupDir, { recursive: true });
    const zipPath = path_1.default.join(backupDir, zipFilename);
    const archive = (0, archiver_1.default)('zip', { zlib: { level: 9 } });
    const fileStream = fs_1.default.createWriteStream(zipPath);
    archive.pipe(fileStream);
    archive.append(dump.stdout, { name: sqlFilename });
    dump.stderr.on('data', (d) => console.error('pg_dump stderr:', d.toString()));
    const finalizePromise = new Promise((resolve, reject) => {
        let finalized = false;
        const finalize = async () => {
            if (finalized)
                return;
            finalized = true;
            try {
                await archive.finalize();
            }
            catch (err) {
                console.error('archive finalize error', err);
                // allow stream to close and still resolve/reject based on file stream
            }
        };
        dump.stdout.on('end', () => {
            finalize().catch((e) => console.error(e));
        });
        dump.on('close', (code) => {
            if (code !== 0)
                console.error('pg_dump exited with code', code);
            setImmediate(() => finalize().catch((e) => console.error(e)));
        });
        fileStream.on('close', () => resolve());
        fileStream.on('error', (err) => reject(err));
        archive.on('error', (err) => reject(err));
        dump.on('error', (err) => reject(err));
    });
    // Wait for finalize + file write to complete
    await finalizePromise;
    return { zipPath, zipFilename, when: now };
}
//# sourceMappingURL=backupController.js.map