import Router from 'express'
import { authenticateProvider } from '../../middlewares/authMiddleware'
import { updateBillingSettings, updateDocumentsSettings, updateNotificationsSettings, updatePaymentSettings } from './settingsController'

const router = Router()

router.patch('/notifications', authenticateProvider, updateNotificationsSettings)
router.patch('/payment', authenticateProvider, updatePaymentSettings)
router.patch('/billing', authenticateProvider, updateBillingSettings)
router.patch('/document', authenticateProvider, updateDocumentsSettings)

export default router