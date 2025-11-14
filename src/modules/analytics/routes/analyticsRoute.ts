import { Router } from "express"
import { authenticateProvider } from "../../../middlewares/authMiddleware"
import { getFinanceAnalytics } from "../controllers/analyticsController"

const router = Router()

router.get("/finance", authenticateProvider, getFinanceAnalytics)

export default router