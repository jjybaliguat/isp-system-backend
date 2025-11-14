import { Router } from "express";
import { authenticateProvider } from "../../../middlewares/authMiddleware";
import { createEmployee, deleteEmployee, getEmployees, updateEmployee } from "../controllers/employeesController";

const router = Router()

router.get("/", authenticateProvider, getEmployees)
router.post("/", authenticateProvider, createEmployee)
router.patch("/:id", authenticateProvider, updateEmployee)
router.delete("/:id", authenticateProvider, deleteEmployee)

export default router