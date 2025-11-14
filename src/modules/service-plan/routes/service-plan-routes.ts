import { Router } from 'express'
import { createServicePlan, deleteServicePlan, getServicePlans, updateServicePlan } from '../controller/service-plan-controller'
import { authenticateProvider } from '../../../middlewares/authMiddleware'

const router = Router()

router.get('/', authenticateProvider, getServicePlans)
router.post('/', authenticateProvider, createServicePlan)
router.patch('/:id', authenticateProvider, updateServicePlan)
router.delete('/:id', authenticateProvider, deleteServicePlan)

export default router