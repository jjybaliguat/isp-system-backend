import { Router } from 'express'
import { authenticateProvider } from '../../middlewares/authMiddleware'
import { getLogs } from './logsController'

const router = Router()

router.get("/", authenticateProvider, getLogs)

export default router