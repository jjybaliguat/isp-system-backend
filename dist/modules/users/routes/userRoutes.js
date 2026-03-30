"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../../../middlewares/authMiddleware");
const userController_1 = require("../controller/userController");
const rateLimiter_1 = require("../../../middlewares/rateLimiter");
const router = (0, express_1.Router)();
router.get('/', authMiddleware_1.authenticateProvider, userController_1.getUsers);
router.post('/', authMiddleware_1.authenticateProvider, userController_1.createUser);
router.post('/check-pass', rateLimiter_1.rateLimiter, authMiddleware_1.authenticateProvider, userController_1.checkPassword);
router.patch('/change-pass/:id', authMiddleware_1.authenticateProvider, userController_1.changePass);
// router.patch('/:id', updateUser);
router.delete('/:id', authMiddleware_1.authenticateProvider, userController_1.deleteUser);
exports.default = router;
//# sourceMappingURL=userRoutes.js.map