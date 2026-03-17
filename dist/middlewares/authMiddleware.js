"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateProviderXenditKey = exports.validateProviderSmsKey = exports.authenticateProvider = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const hasher_1 = require("../utils/hasher");
const prisma_1 = __importDefault(require("../utils/prisma"));
const authenticateProvider = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    const token = authHeader.split(" ")[1];
    if (!token) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.ACESS_TOKEN_SECRET);
        req.user = {
            id: decoded.id,
            providerId: decoded.providerId,
            role: decoded.role,
        };
        next();
    }
    catch (error) {
        if (error.name === "TokenExpiredError") {
            return res.status(401).json({ message: "Token expired. Please log in again." });
        }
        if (error.name === "JsonWebTokenError") {
            return res.status(403).json({ message: "Invalid token." });
        }
        console.error("JWT verification error:", error);
        return res.status(500).json({ message: "Internal server error during authentication." });
    }
};
exports.authenticateProvider = authenticateProvider;
const validateProviderSmsKey = async (req, res, next) => {
    const { providerId } = req.user;
    try {
        const provider = await prisma_1.default.provider.findUnique({
            where: {
                id: providerId
            },
            select: {
                semaphoreApiKey: true
            }
        });
        if (!provider?.semaphoreApiKey)
            return res.status(400).json({ message: "Missing Sms Api key" });
        const decryptedKey = (0, hasher_1.decrypt)(provider.semaphoreApiKey);
        req.smsKey = decryptedKey;
        next();
    }
    catch (error) {
        return res.status(400).json({ message: "Failed in processing sms operations" });
    }
};
exports.validateProviderSmsKey = validateProviderSmsKey;
const validateProviderXenditKey = async (req, res, next) => {
    const { providerId } = req.user;
    try {
        const provider = await prisma_1.default.provider.findUnique({
            where: {
                id: providerId
            },
            select: {
                xenditApiKey: true
            }
        });
        if (!provider?.xenditApiKey)
            return res.status(400).json({ message: "Missing Xendit Api key" });
        const decryptedKey = (0, hasher_1.decrypt)(provider.xenditApiKey);
        req.xenditKey = decryptedKey;
        next();
    }
    catch (error) {
        return res.status(400).json({ message: "Failed in processing sms operations" });
    }
};
exports.validateProviderXenditKey = validateProviderXenditKey;
//# sourceMappingURL=authMiddleware.js.map