"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authMiddleware_1 = require("../../middlewares/authMiddleware");
const mikrotikContollers_1 = require("./mikrotikContollers");
const router = express_1.default.Router();
router.post("/", authMiddleware_1.authenticateProvider, mikrotikContollers_1.createMikrotikRouter);
router.get("/", authMiddleware_1.authenticateProvider, mikrotikContollers_1.getMikrotikRouters);
router.get("/:id/remote-status", authMiddleware_1.authenticateProvider, mikrotikContollers_1.getMikrotikStatus);
router.get("/:id/ppp/profile", authMiddleware_1.authenticateProvider, mikrotikContollers_1.getPPPProfiles);
router.delete("/:id", authMiddleware_1.authenticateProvider, mikrotikContollers_1.deleteMikrotikRouter);
router.patch("/:id", authMiddleware_1.authenticateProvider, mikrotikContollers_1.updateMikrotikRouter);
router.get("/ppp/secret", authMiddleware_1.authenticateProvider, mikrotikContollers_1.getPPPSecrets);
router.get("/:id/ppp/secret", authMiddleware_1.authenticateProvider, mikrotikContollers_1.getPPPSecretsV2);
router.post("/ppp/secret", authMiddleware_1.authenticateProvider, mikrotikContollers_1.createPPPSecret);
router.patch("/ppp/secret", authMiddleware_1.authenticateProvider, mikrotikContollers_1.updatePPPSecret);
router.patch("/ppp/secrets", authMiddleware_1.authenticateProvider, mikrotikContollers_1.updatePPPSecrets);
router.patch("/:id/ppp/secrets", authMiddleware_1.authenticateProvider, mikrotikContollers_1.updatePPPSecretsV2);
router.get("/ppp/active", authMiddleware_1.authenticateProvider, mikrotikContollers_1.getPPPActive);
router.get("/:id/ppp/active", authMiddleware_1.authenticateProvider, mikrotikContollers_1.getPPPActiveV2);
router.get("/ppp/history", authMiddleware_1.authenticateProvider, mikrotikContollers_1.getPPPoEHistory);
exports.default = router;
//# sourceMappingURL=mikrotikRoutes.js.map