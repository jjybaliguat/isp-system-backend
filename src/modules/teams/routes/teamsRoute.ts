import { Router } from "express";
import { authenticateProvider } from "../../../middlewares/authMiddleware";
import { createTeam, deleteTeam, getTeams, updateTeam } from "../controllers/teamsController";

const router = Router()

router.get("/", authenticateProvider, getTeams)
router.post("/", authenticateProvider, createTeam)
router.delete("/:id", authenticateProvider, deleteTeam)
router.patch("/:id", authenticateProvider, updateTeam)

export default router