import { Router } from "express";
import { confirmPayment, createBilling, createBillingForAccount, deleteBilling, getBillingByAccountNumber, getBillingById, getBillings, getFullYearBillingById } from "../controller/billingController";
import { authenticateProvider } from "../../../middlewares/authMiddleware";

const router = Router();

router.post('/', authenticateProvider, createBilling)
router.post('/v2', authenticateProvider, createBillingForAccount)
router.post('/:id/confirm-payment', authenticateProvider, confirmPayment)
router.get('/', authenticateProvider, getBillings)
router.get('/get-fullyear-billing/:id', authenticateProvider, getFullYearBillingById)
router.get('/get-bills/:accountNumber', getBillingByAccountNumber)
router.get('/:id', getBillingById)
router.delete('/:id', authenticateProvider, deleteBilling)

export default router;