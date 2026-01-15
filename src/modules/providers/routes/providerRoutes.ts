import { Router } from 'express';
import {  createProvider, createSmsIntegrationSettings, deleteProvider, getProvider, getProviderById, getProviders, getProvidersWithFilteredResponse, getSmsIntegrationSettings, getStoredKey, testSemaphoreConnection, testXenditConnection, updateAccount, updateSemaphoreKey, updateXenditKey } from '../controllers/providerController';
import { authenticateProvider, validateProviderSmsKey, validateProviderXenditKey } from '../../../middlewares/authMiddleware';

const router = Router();

router.get('/', authenticateProvider, getProviders);
router.get('/get-providers', getProvidersWithFilteredResponse)
router.get('/get-provider', authenticateProvider, getProvider);
router.patch('/update-account', authenticateProvider, updateAccount);
// router.get('/:id', getProviderById);
router.post('/', authenticateProvider, createProvider);
// router.patch('/:id', updateProvider);
router.delete('/:id', authenticateProvider, deleteProvider);
router.post('/xendit-key', authenticateProvider, updateXenditKey);
router.post('/semaphore-key', authenticateProvider, updateSemaphoreKey);
router.post('/sms-integration-settings', authenticateProvider, createSmsIntegrationSettings);
router.get('/sms-integration-settings', authenticateProvider, getSmsIntegrationSettings);
router.get('/stored-keys', authenticateProvider, getStoredKey);
router.get('/xendit-test', authenticateProvider, validateProviderXenditKey, testXenditConnection);
router.get('/semaphore-test', authenticateProvider, validateProviderSmsKey, testSemaphoreConnection);

export default router;