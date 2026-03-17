import express from 'express'
import { authenticateProvider } from '../../middlewares/authMiddleware';
import { getLatestActivePPPoEAccounts, getPPPoEHistory } from './mikrotikContollers';

const router = express.Router();

router.get("/ppp/active", authenticateProvider, getLatestActivePPPoEAccounts)
router.get("/ppp/history", authenticateProvider, getPPPoEHistory)

export default router