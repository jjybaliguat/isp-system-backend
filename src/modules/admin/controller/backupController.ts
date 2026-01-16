import { Request, Response } from 'express';
import { spawn } from 'child_process';
import archiver from 'archiver';

// Stream a pg_dump gzip to response
export const downloadDatabaseBackup = async (req: Request, res: Response) => {
  const { role } = req.user as any;
  if (!(role === 'SUPERADMIN' || role === 'ADMIN')) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return res.status(500).json({ message: 'DATABASE_URL not configured' });

  try {
    const parsed = new URL(databaseUrl);
    const protocol = parsed.protocol; // expect postgres:
    const username = parsed.username;
    const password = parsed.password;
    const host = parsed.hostname;
    const port = parsed.port || '5432';
    const dbName = parsed.pathname ? parsed.pathname.slice(1) : '';

    if (!dbName) return res.status(500).json({ message: 'Database name not found in DATABASE_URL' });

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

    // Set PGPASSWORD in env to avoid prompt
    const env = { ...process.env, PGPASSWORD: password } as any;

    const dump = spawn('pg_dump', args, { env });

    dump.on('error', (err) => {
      console.error('pg_dump failed to start', err);
      return res.status(500).json({ message: 'Failed to start pg_dump. Is pg_dump installed and in PATH?' });
    });

    // We'll stream the SQL dump into a ZIP archive on-the-fly.
    const now = new Date();
    const sqlFilename = `sierra-backup-${now.toISOString().slice(0,10)}.sql`;
    const zipFilename = `sierra-backup-${now.toISOString().slice(0,10)}.zip`;

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipFilename}"`);

    const archive = archiver('zip', { zlib: { level: 9 } });

    archive.on('error', (err) => {
      console.error('Archive error', err);
      try { res.status(500).end(); } catch (e) {}
    });

    // Pipe the zip archive to response
    archive.pipe(res);

    // Append the pg_dump stdout stream as a file entry inside the zip
    archive.append(dump.stdout, { name: sqlFilename });

    // finalize archive when dump finishes
    dump.on('close', (code) => {
      if (code !== 0) {
        console.error('pg_dump exited with code', code);
        // finalize anyway so client receives what was produced
      }
      archive.finalize().catch((err) => console.error('Archive finalize error', err));
    });

    dump.stderr.on('data', (data) => {
      console.error('pg_dump stderr:', data.toString());
    });

    dump.on('close', (code) => {
      if (code !== 0) {
        console.error('pg_dump exited with code', code);
        // Note: response may already be closed; if so, nothing to do
      }
    });
  } catch (error) {
    console.error('backup error', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export default {};
