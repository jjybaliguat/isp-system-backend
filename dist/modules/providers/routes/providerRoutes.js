"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const providerController_1 = require("../controllers/providerController");
const authMiddleware_1 = require("../../../middlewares/authMiddleware");
const imageSizeLimiter_1 = require("../../../middlewares/imageSizeLimiter");
const router = (0, express_1.Router)();
router.get('/', authMiddleware_1.authenticateProvider, providerController_1.getProviders);
router.get('/get-providers', providerController_1.getProvidersWithFilteredResponse);
router.get('/get-provider', authMiddleware_1.authenticateProvider, providerController_1.getProvider);
router.get('/other-payment-options', authMiddleware_1.authenticateProvider, providerController_1.getOtherPaymentOptions);
router.patch('/update-account', authMiddleware_1.authenticateProvider, providerController_1.updateAccount);
// router.get('/:id', getProviderById);
router.post('/', authMiddleware_1.authenticateProvider, providerController_1.createProvider);
// router.patch('/:id', updateProvider);
router.delete('/:id', authMiddleware_1.authenticateProvider, providerController_1.deleteProvider);
router.post('/xendit-key', authMiddleware_1.authenticateProvider, providerController_1.updateXenditKey);
router.post('/semaphore-key', authMiddleware_1.authenticateProvider, providerController_1.updateSemaphoreKey);
router.post('/sms-integration-settings', authMiddleware_1.authenticateProvider, providerController_1.createSmsIntegrationSettings);
router.post('/telegram-settings', authMiddleware_1.authenticateProvider, providerController_1.createTelegramSettings);
router.get('/telegram-settings', authMiddleware_1.authenticateProvider, providerController_1.getTelegramSettings);
router.post('/test-telegram-notif', authMiddleware_1.authenticateProvider, providerController_1.testTelegramConnection);
router.get('/sms-integration-settings', authMiddleware_1.authenticateProvider, providerController_1.getSmsIntegrationSettings);
router.get('/stored-keys', authMiddleware_1.authenticateProvider, providerController_1.getStoredKey);
router.get('/xendit-test', authMiddleware_1.authenticateProvider, authMiddleware_1.validateProviderXenditKey, providerController_1.testXenditConnection);
router.get('/semaphore-test', authMiddleware_1.authenticateProvider, authMiddleware_1.validateProviderSmsKey, providerController_1.testSemaphoreConnection);
// Upload provider logo (single image)
router.post('/upload-logo', authMiddleware_1.authenticateProvider, async (req, res) => {
    // multer middleware expects the upload to be invoked this way because upload is configured as .single('image')
    (0, imageSizeLimiter_1.upload)(req, res, (err) => {
        // if multer error occurred, return here
        if (err) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ message: 'File too large. Max size is 10 MB' });
            }
            return res.status(400).json({ message: err.message });
        }
        // delegate to controller which will rely on req.file and req.user
        return (0, providerController_1.uploadProviderLogo)(req, res);
    });
});
exports.default = router;
//# sourceMappingURL=providerRoutes.js.map