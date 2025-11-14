"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../../../middlewares/authMiddleware");
const smsController_1 = require("../controller/smsController");
const router = (0, express_1.Router)();
router.get("/", authMiddleware_1.authenticateProvider, authMiddleware_1.validateProviderSmsKey, smsController_1.getSms);
router.post("/", authMiddleware_1.authenticateProvider, authMiddleware_1.validateProviderSmsKey, smsController_1.sendSms);
exports.default = router;
//# sourceMappingURL=smsRoute.js.map