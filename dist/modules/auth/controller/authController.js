"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logout = exports.refresh = exports.registerController = exports.loginController = void 0;
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jwtUtils_1 = require("../../../utils/jwtUtils");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const prisma = new client_1.PrismaClient();
const loginController = async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await prisma.user.findUnique({
            where: { email },
            include: {
                provider: {
                    select: {
                        providerType: true
                    }
                }
            }
        });
        if (!user)
            return res.status(400).json({ message: "Invalid Credentials" });
        const validPassword = await bcryptjs_1.default.compare(password, user.password);
        if (!validPassword)
            return res.status(400).json({ message: "Invalid Credentials" });
        const accessToken = (0, jwtUtils_1.generateToken)({
            id: user.id,
            providerId: user.providerId,
            role: user.role
        }, 15); // 15min
        const refreshToken = jsonwebtoken_1.default.sign({ "email": user.email, "role": user.role }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: '1hr' });
        // Create secure cookie with refresh token 
        res.cookie(process.env.JWT_COOKIE_NAME, refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
            domain: process.env.NODE_ENV === "production" ? ".sierracommunication.net" : undefined,
            maxAge: 7 * 24 * 60 * 60 * 1000
        });
        // ---- LOG ACTION (non-blocking) ----
        prisma.log
            .create({
            data: {
                action: "LOGIN",
                entity: "User",
                userId: user.id,
                message: `User ${user.email} has logged in.`,
                providerId: user.providerId,
            },
        })
            .catch(console.error);
        return res.status(200).json({ ...user, accessToken, providerType: user.provider.providerType });
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};
exports.loginController = loginController;
const registerController = async (req, res) => {
    const { name, companyName, companyAddress, email, phoneNumber, password } = req.body;
    const requiredFields = { name, companyName, companyAddress, email, phoneNumber, password };
    const missingFields = Object.entries(requiredFields)
        .filter(([_, value]) => value === undefined || value === null || value === '')
        .map(([key]) => key);
    if (missingFields.length > 0) {
        const errors = {};
        missingFields.forEach(field => {
            errors[field] = `${field} is required`;
        });
    }
    try {
        const existingUser = await prisma.user.findUnique({
            where: { email
            }
        });
        if (existingUser) {
            return res.status(400).json({ message: "Provider with the same email already exists" });
        }
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        await prisma.$transaction(async (tx) => {
            const newProvider = await tx.provider.create({
                data: {
                    name,
                    companyName,
                    companyAddress,
                    email,
                    phoneNumber,
                },
            });
            const newUser = await tx.user.create({
                data: {
                    email,
                    password: hashedPassword,
                    role: 'SUPERADMIN',
                    providerId: newProvider.id
                },
            });
            return { newProvider, newUser };
        });
        res.status(201).json({ message: "Provider registered successfully" });
    }
    catch (error) {
        console.log(error);
        res.status(500).json({ message: "Internal server error" });
    }
};
exports.registerController = registerController;
exports.refresh = (0, express_async_handler_1.default)(async (req, res) => {
    const cookies = req.cookies;
    if (!cookies?.jwt_refresh_secret)
        return res.status(401).json({ message: 'Unauthorized' });
    const refreshToken = cookies.jwt_refresh_secret;
    jsonwebtoken_1.default.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, async (err, decoded) => {
        if (err) {
            res.clearCookie(process.env.JWT_COOKIE_NAME, {
                httpOnly: true,
                sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
                domain: process.env.NODE_ENV === "production" ? ".sierracommunication.net" : undefined,
                secure: process.env.NODE_ENV === "production",
            });
            return res.status(403).json({ message: "Forbidden" });
        }
        const foundUser = await prisma.user.findUnique({
            where: { email: decoded.email },
        });
        if (!foundUser)
            return res.status(401).json({ message: "Unauthorized" });
        const accessToken = (0, jwtUtils_1.generateToken)({
            id: foundUser.id,
            providerId: foundUser.providerId,
            role: foundUser.role,
        }, 15 // 1min for testing
        );
        res.json({ accessToken });
    });
});
const logout = async (req, res) => {
    const cookies = req.cookies;
    const { id } = req.user;
    const user = await prisma.user.findUnique({
        where: { id },
    });
    if (!user)
        return res.sendStatus(204); //No content
    if (!cookies?.jwt_refresh_secret)
        return res.sendStatus(204); //No content
    res.clearCookie(process.env.JWT_COOKIE_NAME, {
        httpOnly: true,
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        domain: process.env.NODE_ENV === "production" ? ".sierracommunication.net" : undefined,
        secure: process.env.NODE_ENV === "production",
    });
    // ---- LOG ACTION (non-blocking) ----
    prisma.log
        .create({
        data: {
            action: "LOGOUT",
            entity: "User",
            userId: user.id,
            message: `User ${user.email} has logged out.`,
            providerId: user.providerId,
        },
    })
        .catch(console.error);
    console.log("cookie cleared");
    res.json({ message: 'Cookie cleared' });
};
exports.logout = logout;
//# sourceMappingURL=authController.js.map