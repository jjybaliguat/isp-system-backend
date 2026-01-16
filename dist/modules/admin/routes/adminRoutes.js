"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../../../middlewares/authMiddleware");
const backupController_1 = require("../controller/backupController");
const router = (0, express_1.Router)();
// GET /api/admin/backup
router.get('/backup', authMiddleware_1.authenticateProvider, backupController_1.downloadDatabaseBackup);
exports.default = router;
//# sourceMappingURL=adminRoutes.js.map