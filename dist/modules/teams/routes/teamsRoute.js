"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../../../middlewares/authMiddleware");
const teamsController_1 = require("../controllers/teamsController");
const router = (0, express_1.Router)();
router.get("/", authMiddleware_1.authenticateProvider, teamsController_1.getTeams);
router.post("/", authMiddleware_1.authenticateProvider, teamsController_1.createTeam);
router.delete("/:id", authMiddleware_1.authenticateProvider, teamsController_1.deleteTeam);
router.patch("/:id", authMiddleware_1.authenticateProvider, teamsController_1.updateTeam);
exports.default = router;
//# sourceMappingURL=teamsRoute.js.map