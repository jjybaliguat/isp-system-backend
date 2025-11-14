"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
/**
 * Generates a signed JWT token.
 *
 * @param payload - The data you want to include inside the token.
 * @param expiresIn - Expiration time (e.g. "1h", "7d", or 3600 seconds).
 * @returns A signed JWT string.
 * @throws If JWT_SECRET is missing or signing fails.
 */
const generateToken = (payload, expiresIn) => {
    const secret = process.env.ACESS_TOKEN_SECRET;
    if (!secret) {
        throw new Error("JWT_SECRET is not defined in environment variables.");
    }
    const options = { expiresIn: `${expiresIn}min` };
    try {
        return jsonwebtoken_1.default.sign(payload, secret, options);
    }
    catch (err) {
        console.error("Error generating JWT:", err);
        throw new Error("Failed to generate token");
    }
};
exports.generateToken = generateToken;
//# sourceMappingURL=jwtUtils.js.map