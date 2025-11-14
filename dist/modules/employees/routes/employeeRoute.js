"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../../../middlewares/authMiddleware");
const employeesController_1 = require("../controllers/employeesController");
const router = (0, express_1.Router)();
router.get("/", authMiddleware_1.authenticateProvider, employeesController_1.getEmployees);
router.post("/", authMiddleware_1.authenticateProvider, employeesController_1.createEmployee);
router.patch("/:id", authMiddleware_1.authenticateProvider, employeesController_1.updateEmployee);
router.delete("/:id", authMiddleware_1.authenticateProvider, employeesController_1.deleteEmployee);
exports.default = router;
//# sourceMappingURL=employeeRoute.js.map