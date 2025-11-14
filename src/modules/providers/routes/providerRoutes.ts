import { Router } from 'express';
import {  getProvider, getProviderById, getProviders, getStoredKey, testSemaphoreConnection, testXenditConnection, updateAccount, updateSemaphoreKey, updateXenditKey } from '../controllers/providerController';
import { authenticateProvider, validateProviderSmsKey, validateProviderXenditKey } from '../../../middlewares/authMiddleware';
import { rateLimiter } from '../../../middlewares/rateLimiter';

const router = Router();

router.get('/get-provider', authenticateProvider, getProvider);
router.patch('/update-account', authenticateProvider, updateAccount);
// router.get('/:id', getProviderById);
// router.post('/', createProvider);
// router.patch('/:id', updateProvider);
// router.delete('/:id', deleteProvider);
router.post('/xendit-key', authenticateProvider, updateXenditKey);
router.post('/semaphore-key', authenticateProvider, updateSemaphoreKey);
router.get('/stored-keys', authenticateProvider, getStoredKey);
router.get('/xendit-test', authenticateProvider, validateProviderXenditKey, testXenditConnection);
router.get('/semaphore-test', authenticateProvider, validateProviderSmsKey, testSemaphoreConnection);

export default router;