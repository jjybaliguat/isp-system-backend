"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../../../middlewares/authMiddleware");
const ticketsController_1 = require("../controllers/ticketsController");
const router = (0, express_1.Router)();
router.get("/", authMiddleware_1.authenticateProvider, ticketsController_1.getTickets);
router.get("/assigned", authMiddleware_1.authenticateProvider, ticketsController_1.getAssignedTickets);
router.post("/", authMiddleware_1.authenticateProvider, ticketsController_1.createTicket);
router.delete("/comments/:id", authMiddleware_1.authenticateProvider, ticketsController_1.deleteTicketComment);
router.post("/:id/comments", authMiddleware_1.authenticateProvider, ticketsController_1.createTicketComment);
router.get("/:id/comments", authMiddleware_1.authenticateProvider, ticketsController_1.getTicketComments);
router.patch("/:id", authMiddleware_1.authenticateProvider, ticketsController_1.updateTicket);
router.get("/:id/logs", authMiddleware_1.authenticateProvider, ticketsController_1.getTicketLogs);
router.delete("/:id", authMiddleware_1.authenticateProvider, ticketsController_1.deleteTicket);
exports.default = router;
//# sourceMappingURL=ticketRoutes.js.map