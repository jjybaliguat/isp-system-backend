import { Router } from "express"
import { createPayment, getPayment, getPayments, xenditWebhook } from "../controller/paymentController";
import { authenticateProvider } from "../../../middlewares/authMiddleware";

const router  = Router();

router.get('/', authenticateProvider, getPayments);
router.get('/:id', getPayment);
router.post('/:billingId', createPayment);
router.post('/xendit/pay-invoice', xenditWebhook);

export default router;