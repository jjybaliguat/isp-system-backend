import express from 'express'
import { authenticateProvider } from '../../middlewares/authMiddleware';
import { getActivePPPoEAccounts, getPPPoEHistory } from './mikrotikContollers';

const router = express.Router();

router.get("/ppp/active", authenticateProvider, getActivePPPoEAccounts)
router.get("/ppp/history", authenticateProvider, getPPPoEHistory)

export default router