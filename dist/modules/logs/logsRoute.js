"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../../middlewares/authMiddleware");
const logsController_1 = require("./logsController");
const router = (0, express_1.Router)();
router.get("/", authMiddleware_1.authenticateProvider, logsController_1.getLogs);
exports.default = router;
//# sourceMappingURL=logsRoute.js.map