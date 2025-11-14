"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../../../middlewares/authMiddleware");
const analyticsController_1 = require("../controllers/analyticsController");
const router = (0, express_1.Router)();
router.get("/finance", authMiddleware_1.authenticateProvider, analyticsController_1.getFinanceAnalytics);
exports.default = router;
//# sourceMappingURL=analyticsRoute.js.map