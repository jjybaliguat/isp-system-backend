import { Router } from 'express'
import { createClientType, deleteClientType, getClientTypes, updatedClientType } from '../controller/client-types-controller'
import { authenticateProvider } from '../../../middlewares/authMiddleware'

const router = Router()

router.get('/', authenticateProvider, getClientTypes)
router.post('/', authenticateProvider, createClientType)
router.delete('/:id', authenticateProvider, deleteClientType)
router.patch('/:id', authenticateProvider, updatedClientType)

export default router