"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../../../middlewares/authMiddleware");
const applicantController_1 = require("../controller/applicantController");
const router = (0, express_1.Router)();
router.get('/', authMiddleware_1.authenticateProvider, applicantController_1.getApplicants);
router.get('/count', authMiddleware_1.authenticateProvider, applicantController_1.getApplicantsCount);
router.get('/status', applicantController_1.getApplicationStatus);
router.post('/', applicantController_1.createApplicant);
router.get('/:id', authMiddleware_1.authenticateProvider, applicantController_1.getApplicant);
router.patch('/:id', authMiddleware_1.authenticateProvider, applicantController_1.updateApplicant);
router.delete('/:id', authMiddleware_1.authenticateProvider, applicantController_1.deleteApplicant);
exports.default = router;
//# sourceMappingURL=applicantRoutes.js.map