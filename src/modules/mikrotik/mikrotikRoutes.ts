import express from 'express'
import { authenticateProvider } from '../../middlewares/authMiddleware';
import { getPPPActive, getPPPoEHistory, getPPPSecrets, updatePPPSecrets } from './mikrotikContollers';

const router = express.Router();

router.get("/ppp/secret", authenticateProvider, getPPPSecrets)
router.patch("/ppp/secret", authenticateProvider, updatePPPSecrets)
router.get("/ppp/active", authenticateProvider, getPPPActive)
router.get("/ppp/history", authenticateProvider, getPPPoEHistory)

export default router