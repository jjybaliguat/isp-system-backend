import { Router } from 'express';
import { authenticateProvider } from '../../../middlewares/authMiddleware';
import { downloadDatabaseBackup } from '../controller/backupController';

const router = Router();

// GET /api/admin/backup
router.get('/backup', authenticateProvider, downloadDatabaseBackup);

export default router;
