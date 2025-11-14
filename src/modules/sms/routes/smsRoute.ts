import { Router } from "express";
import { authenticateProvider, validateProviderSmsKey } from "../../../middlewares/authMiddleware";
import { getSms, sendSms } from "../controller/smsController";

const router = Router()

router.get("/", authenticateProvider, validateProviderSmsKey, getSms)
router.post("/", authenticateProvider, validateProviderSmsKey, sendSms)

export default router