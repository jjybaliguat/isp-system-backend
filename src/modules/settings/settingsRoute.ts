import Router from 'express'
import { authenticateProvider } from '../../middlewares/authMiddleware'
import { getWebsiteModal, updateBackupSettings, updateBillingSettings, updateDocumentsSettings, updateNotificationsSettings, updatePaymentOptions, updatePaymentSettings, updateWebsiteModal } from './settingsController'

const router = Router()

router.patch('/notifications', authenticateProvider, updateNotificationsSettings)
router.patch('/payment', authenticateProvider, updatePaymentSettings)
router.post('/payment-options', authenticateProvider, updatePaymentOptions)
router.post('/website-modal', authenticateProvider, updateWebsiteModal)
router.get('/website-modal', authenticateProvider, getWebsiteModal)
router.patch('/billing', authenticateProvider, updateBillingSettings)
router.patch('/document', authenticateProvider, updateDocumentsSettings)
router.patch('/backup', authenticateProvider, updateBackupSettings)

export default router