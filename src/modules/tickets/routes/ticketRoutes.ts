import { Router } from 'express'
import { authenticateProvider } from '../../../middlewares/authMiddleware'
import { createTicket, createTicketComment, deleteTicket, deleteTicketComment, getAssignedTickets, getTicketComments, getTicketLogs, getTickets, updateTicket } from '../controllers/ticketsController'

const router = Router()

router.get("/", authenticateProvider, getTickets)
router.get("/assigned", authenticateProvider, getAssignedTickets)
router.post("/", authenticateProvider, createTicket)
router.delete("/comments/:id", authenticateProvider, deleteTicketComment)
router.post("/:id/comments", authenticateProvider, createTicketComment)
router.get("/:id/comments", authenticateProvider, getTicketComments)
router.patch("/:id", authenticateProvider, updateTicket)
router.get("/:id/logs", authenticateProvider, getTicketLogs)
router.delete("/:id", authenticateProvider, deleteTicket)

export default router