import { Router } from "express";
import { confirmPayment, createBilling, createBillingForAccount, deleteBilling, generateBillingForAllAccounts, getBillingByAccountNumber, getBillingById, getBillings, getFullYearBillingById, getUnpaidBillingById, sendEmailReminder, sendSmsReminder, updateBillingForAccount } from "../controller/billingController";
import { authenticateProvider } from "../../../middlewares/authMiddleware";

const router = Router();

router.post('/', authenticateProvider, createBilling)
router.post('/v2', authenticateProvider, createBillingForAccount)
router.post('/generate-bill', authenticateProvider, generateBillingForAllAccounts)
router.patch('/v2/:id', authenticateProvider, updateBillingForAccount)
router.post('/:id/confirm-payment', authenticateProvider, confirmPayment)
router.post('/send-email-reminder/:id', authenticateProvider, sendEmailReminder)
router.post('/send-sms-reminder/:id', authenticateProvider, sendSmsReminder)
router.get('/', authenticateProvider, getBillings)
router.get('/get-fullyear-billing/:id', authenticateProvider, getFullYearBillingById)
router.get('/get-bills/:accountNumber', getBillingByAccountNumber)
router.get('/unpaid/:id', getUnpaidBillingById)
router.get('/:id', getBillingById)
router.delete('/:id', authenticateProvider, deleteBilling)

export default router;