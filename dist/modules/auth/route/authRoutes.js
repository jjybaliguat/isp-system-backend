"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authController_1 = require("../controller/authController");
const rateLimiter_1 = require("../../../middlewares/rateLimiter");
const router = (0, express_1.Router)();
router.post('/login', rateLimiter_1.rateLimiter, authController_1.loginController);
router.post('/register', authController_1.registerController);
router.get('/refresh', authController_1.refresh);
router.post('/logout', authController_1.logout);
exports.default = router;
//# sourceMappingURL=authRoutes.js.map