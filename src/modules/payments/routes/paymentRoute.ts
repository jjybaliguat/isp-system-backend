import { Router } from "express"
import { createPayment, getPayments, xenditWebhook } from "../controller/paymentController";
import { authenticateProvider } from "../../../middlewares/authMiddleware";

const router  = Router();

router.get('/', authenticateProvider, getPayments);
router.post('/:billingId', createPayment);
router.post('/webhook', xenditWebhook);

export default router;