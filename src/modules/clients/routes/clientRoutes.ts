import { Router } from "express";
import { createClient, deleteClient, getClientById, getClients, getClientsAnalytics, getClientsCount, getClientsPhoneNumbers, updateClient } from "../controllers/clientController";
import { authenticateProvider } from "../../../middlewares/authMiddleware";

const router = Router();

router.get("/", authenticateProvider, getClients)
router.get("/analytics", authenticateProvider, getClientsAnalytics)
router.get("/count", authenticateProvider, getClientsCount)
router.get("/:id", authenticateProvider, getClientById)
router.get("/phoneNumbers/get", authenticateProvider, getClientsPhoneNumbers)
router.post("/", authenticateProvider, createClient)
router.patch("/:id", authenticateProvider, updateClient)
router.delete("/:id", authenticateProvider, deleteClient)

export default router;