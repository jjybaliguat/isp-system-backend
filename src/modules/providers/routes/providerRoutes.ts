import { Router } from 'express';
import {  createProvider, createSmsIntegrationSettings, createTelegramSettings, deleteProvider, getOtherPaymentOptions, getProvider, getProviderById, getProviders, getProvidersWithFilteredResponse, getSmsIntegrationSettings, getStoredKey, getTelegramSettings, testSemaphoreConnection, testTelegramConnection, testXenditConnection, updateAccount, updateSemaphoreKey, updateXenditKey, uploadProviderLogo } from '../controllers/providerController';
import { authenticateProvider, validateProviderSmsKey, validateProviderXenditKey } from '../../../middlewares/authMiddleware';
import { upload } from '../../../middlewares/imageSizeLimiter';

const router = Router();

router.get('/', authenticateProvider, getProviders);
router.get('/get-providers', getProvidersWithFilteredResponse)
router.get('/get-provider', authenticateProvider, getProvider);
router.get('/other-payment-options', authenticateProvider, getOtherPaymentOptions);
router.patch('/update-account', authenticateProvider, updateAccount);
// router.get('/:id', getProviderById);
router.post('/', authenticateProvider, createProvider);
// router.patch('/:id', updateProvider);
router.delete('/:id', authenticateProvider, deleteProvider);
router.post('/xendit-key', authenticateProvider, updateXenditKey);
router.post('/semaphore-key', authenticateProvider, updateSemaphoreKey);
router.post('/sms-integration-settings', authenticateProvider, createSmsIntegrationSettings);
router.post('/telegram-settings', authenticateProvider, createTelegramSettings);
router.get('/telegram-settings', authenticateProvider, getTelegramSettings);
router.post('/test-telegram-notif', authenticateProvider, testTelegramConnection);
router.get('/sms-integration-settings', authenticateProvider, getSmsIntegrationSettings);
router.get('/stored-keys', authenticateProvider, getStoredKey);
router.get('/xendit-test', authenticateProvider, validateProviderXenditKey, testXenditConnection);
router.get('/semaphore-test', authenticateProvider, validateProviderSmsKey, testSemaphoreConnection);

// Upload provider logo (single image)
router.post('/upload-logo', authenticateProvider, async (req, res) => {
	// multer middleware expects the upload to be invoked this way because upload is configured as .single('image')
	upload(req, res, (err) => {
		// if multer error occurred, return here
		if (err) {
			if ((err as any).code === 'LIMIT_FILE_SIZE') {
				return res.status(400).json({ message: 'File too large. Max size is 10 MB' });
			}
			return res.status(400).json({ message: (err as Error).message });
		}

		// delegate to controller which will rely on req.file and req.user
		return uploadProviderLogo(req as any, res as any);
	});
});

export default router;