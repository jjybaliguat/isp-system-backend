"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const service_plan_controller_1 = require("../controller/service-plan-controller");
const authMiddleware_1 = require("../../../middlewares/authMiddleware");
const router = (0, express_1.Router)();
router.get('/', authMiddleware_1.authenticateProvider, service_plan_controller_1.getServicePlans);
router.post('/', authMiddleware_1.authenticateProvider, service_plan_controller_1.createServicePlan);
router.patch('/:id', authMiddleware_1.authenticateProvider, service_plan_controller_1.updateServicePlan);
router.delete('/:id', authMiddleware_1.authenticateProvider, service_plan_controller_1.deleteServicePlan);
exports.default = router;
//# sourceMappingURL=service-plan-routes.js.map