"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const paymentController_1 = require("../controller/paymentController");
const authMiddleware_1 = require("../../../middlewares/authMiddleware");
const router = (0, express_1.Router)();
router.get('/', authMiddleware_1.authenticateProvider, paymentController_1.getPayments);
router.get('/:id', paymentController_1.getPayment);
router.post('/:billingId', paymentController_1.createPayment);
router.post('/xendit/pay-invoice', paymentController_1.xenditWebhook);
exports.default = router;
//# sourceMappingURL=paymentRoute.js.map