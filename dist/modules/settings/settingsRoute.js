"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authMiddleware_1 = require("../../middlewares/authMiddleware");
const settingsController_1 = require("./settingsController");
const router = (0, express_1.default)();
router.patch('/notifications', authMiddleware_1.authenticateProvider, settingsController_1.updateNotificationsSettings);
router.patch('/payment', authMiddleware_1.authenticateProvider, settingsController_1.updatePaymentSettings);
router.post('/payment-options', authMiddleware_1.authenticateProvider, settingsController_1.updatePaymentOptions);
router.patch('/billing', authMiddleware_1.authenticateProvider, settingsController_1.updateBillingSettings);
router.patch('/document', authMiddleware_1.authenticateProvider, settingsController_1.updateDocumentsSettings);
router.patch('/backup', authMiddleware_1.authenticateProvider, settingsController_1.updateBackupSettings);
exports.default = router;
//# sourceMappingURL=settingsRoute.js.map