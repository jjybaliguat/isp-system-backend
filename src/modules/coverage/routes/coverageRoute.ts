import {Router} from 'express'
import { authenticateProvider } from '../../../middlewares/authMiddleware'
import { createCoverage, deleteCoverage, getCoverage, updateCoverage } from '../controller/coverageController'

const router = Router()

router.get("/", authenticateProvider, getCoverage)
router.post("/", authenticateProvider, createCoverage)
router.patch("/:id", authenticateProvider, updateCoverage)
router.delete("/:id", authenticateProvider, deleteCoverage)

export default router