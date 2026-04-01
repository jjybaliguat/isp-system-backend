import express from 'express'
import { authenticateProvider } from '../../middlewares/authMiddleware';
import { createMikrotikRouter, deleteMikrotikRouter, getMikrotikRouters, getMikrotikStatus, getPPPActive, getPPPActiveV2, getPPPoEHistory, getPPPSecrets, getPPPSecretsV2, updatePPPSecrets, updatePPPSecretsV2 } from './mikrotikContollers';

const router = express.Router();

router.post("/", authenticateProvider, createMikrotikRouter)
router.get("/", authenticateProvider, getMikrotikRouters)
router.get("/:id/remote-status", authenticateProvider, getMikrotikStatus)
router.delete("/:id", authenticateProvider, deleteMikrotikRouter)
router.get("/ppp/secret", authenticateProvider, getPPPSecrets)
router.get("/:id/ppp/secret", authenticateProvider, getPPPSecretsV2)
router.patch("/ppp/secret", authenticateProvider, updatePPPSecrets)
router.patch("/:id/ppp/secret", authenticateProvider, updatePPPSecretsV2)
router.get("/ppp/active", authenticateProvider, getPPPActive)
router.get("/:id/ppp/active", authenticateProvider, getPPPActiveV2)
router.get("/ppp/history", authenticateProvider, getPPPoEHistory)

export default router