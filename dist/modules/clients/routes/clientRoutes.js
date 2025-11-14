"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const clientController_1 = require("../controllers/clientController");
const authMiddleware_1 = require("../../../middlewares/authMiddleware");
const router = (0, express_1.Router)();
router.get("/", authMiddleware_1.authenticateProvider, clientController_1.getClients);
router.get("/analytics", authMiddleware_1.authenticateProvider, clientController_1.getClientsAnalytics);
router.get("/count", authMiddleware_1.authenticateProvider, clientController_1.getClientsCount);
router.get("/:id", authMiddleware_1.authenticateProvider, clientController_1.getClientById);
router.get("/phoneNumbers/get", authMiddleware_1.authenticateProvider, clientController_1.getClientsPhoneNumbers);
router.post("/", authMiddleware_1.authenticateProvider, clientController_1.createClient);
router.patch("/:id", authMiddleware_1.authenticateProvider, clientController_1.updateClient);
router.delete("/:id", authMiddleware_1.authenticateProvider, clientController_1.deleteClient);
exports.default = router;
//# sourceMappingURL=clientRoutes.js.map