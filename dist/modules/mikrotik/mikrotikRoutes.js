"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authMiddleware_1 = require("../../middlewares/authMiddleware");
const mikrotikContollers_1 = require("./mikrotikContollers");
const router = express_1.default.Router();
router.get("/ppp/secret", authMiddleware_1.authenticateProvider, mikrotikContollers_1.getPPPSecrets);
router.patch("/ppp/secret", authMiddleware_1.authenticateProvider, mikrotikContollers_1.updatePPPSecrets);
router.get("/ppp/active", authMiddleware_1.authenticateProvider, mikrotikContollers_1.getPPPActive);
router.get("/ppp/history", authMiddleware_1.authenticateProvider, mikrotikContollers_1.getPPPoEHistory);
exports.default = router;
//# sourceMappingURL=mikrotikRoutes.js.map