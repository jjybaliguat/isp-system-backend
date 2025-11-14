"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const billingController_1 = require("../controller/billingController");
const authMiddleware_1 = require("../../../middlewares/authMiddleware");
const router = (0, express_1.Router)();
router.post('/', authMiddleware_1.authenticateProvider, billingController_1.createBilling);
router.post('/:id/confirm-payment', authMiddleware_1.authenticateProvider, billingController_1.confirmPayment);
router.get('/', authMiddleware_1.authenticateProvider, billingController_1.getBillings);
router.get('/get-fullyear-billing/:id', authMiddleware_1.authenticateProvider, billingController_1.getFullYearBillingById);
router.get('/get-bills/:accountNumber', billingController_1.getBillingByAccountNumber);
router.get('/:id', billingController_1.getBillingById);
router.delete('/:id', authMiddleware_1.authenticateProvider, billingController_1.deleteBilling);
exports.default = router;
//# sourceMappingURL=billingRoute.js.map