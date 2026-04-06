import express from 'express'
import { authenticateProvider } from '../../middlewares/authMiddleware';
import { createMikrotikRouter, createPPPSecret, deleteMikrotikRouter, getMikrotikRouters, getMikrotikStatus, getPPPActive, getPPPActiveV2, getPPPoEHistory, getPPPProfiles, getPPPSecrets, getPPPSecretsV2, updateMikrotikRouter, updatePPPSecret, updatePPPSecrets, updatePPPSecretsV2 } from './mikrotikContollers';

const router = express.Router();

router.post("/", authenticateProvider, createMikrotikRouter)
router.get("/", authenticateProvider, getMikrotikRouters)
router.get("/:id/remote-status", authenticateProvider, getMikrotikStatus)
router.get("/:id/ppp/profile", authenticateProvider, getPPPProfiles)
router.delete("/:id", authenticateProvider, deleteMikrotikRouter)
router.patch("/:id", authenticateProvider, updateMikrotikRouter)
router.get("/ppp/secret", authenticateProvider, getPPPSecrets)
router.get("/:id/ppp/secret", authenticateProvider, getPPPSecretsV2)
router.post("/ppp/secret", authenticateProvider, createPPPSecret)
router.patch("/ppp/secret", authenticateProvider, updatePPPSecret)
router.patch("/ppp/secrets", authenticateProvider, updatePPPSecrets)
router.patch("/:id/ppp/secrets", authenticateProvider, updatePPPSecretsV2)
router.get("/ppp/active", authenticateProvider, getPPPActive)
router.get("/:id/ppp/active", authenticateProvider, getPPPActiveV2)
router.get("/ppp/history", authenticateProvider, getPPPoEHistory)

export default router