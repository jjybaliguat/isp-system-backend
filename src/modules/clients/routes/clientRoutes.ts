import { Router } from "express";
import { createAccount, createClient, deleteClient, deleteClientAccount, generateSoaReport, getAccounts, getClientBillings, getClientById, getClients, getClientsAnalytics, getClientsCount, getClientsPhoneNumbers, getPortalData, getUserTickets, updateClient, updateClientAccount } from "../controllers/clientController";
import { authenticateProvider } from "../../../middlewares/authMiddleware";

const router = Router();

router.get("/", authenticateProvider, getClients)
router.get("/accounts", authenticateProvider, getAccounts)
router.get("/analytics", authenticateProvider, getClientsAnalytics)
router.get("/portal", authenticateProvider, getPortalData)
router.get("/billings", authenticateProvider, getClientBillings)
router.get("/tickets", authenticateProvider, getUserTickets)
router.get("/count", authenticateProvider, getClientsCount)
router.get("/:id", authenticateProvider, getClientById)
router.get("/phoneNumbers/get", authenticateProvider, getClientsPhoneNumbers)
router.post("/", authenticateProvider, createClient)
router.get("/soa/:id", authenticateProvider, generateSoaReport)
router.post("/account", authenticateProvider, createAccount)
router.patch("/account/:id", authenticateProvider, updateClientAccount)
router.delete("/account/:id", authenticateProvider, deleteClientAccount)
router.patch("/:id", authenticateProvider, updateClient)
router.delete("/:id", authenticateProvider, deleteClient)

export default router;