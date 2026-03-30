"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const contactController_1 = require("./contactController");
const router = (0, express_1.default)();
router.post("/", contactController_1.contactFormEmail);
exports.default = router;
//# sourceMappingURL=contactRoute.js.map