"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../../../middlewares/authMiddleware");
const coverageController_1 = require("../controller/coverageController");
const router = (0, express_1.Router)();
router.get("/", authMiddleware_1.authenticateProvider, coverageController_1.getCoverage);
router.post("/", authMiddleware_1.authenticateProvider, coverageController_1.createCoverage);
router.patch("/:id", authMiddleware_1.authenticateProvider, coverageController_1.updateCoverage);
router.delete("/:id", authMiddleware_1.authenticateProvider, coverageController_1.deleteCoverage);
exports.default = router;
//# sourceMappingURL=coverageRoute.js.map