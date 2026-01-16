"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authController_1 = require("../controller/authController");
const rateLimiter_1 = require("../../../middlewares/rateLimiter");
const authMiddleware_1 = require("../../../middlewares/authMiddleware");
const router = (0, express_1.Router)();
router.post('/login', rateLimiter_1.rateLimiter, authController_1.loginController);
router.post('/register', authController_1.registerController);
router.post('/forgot-password', authController_1.forgotPassword);
router.post('/reset-password', authController_1.resetPassword);
router.get('/refresh', authController_1.refresh);
router.post('/logout', authMiddleware_1.authenticateProvider, authController_1.logout);
exports.default = router;
//# sourceMappingURL=authRoutes.js.map