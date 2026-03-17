import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { decrypt } from "../utils/hasher";
import prisma from "../utils/prisma";

declare global {
  namespace Express {
    interface Request {
        user: {
            id: string;
            providerId: string;
            role: string;
        },
        smsKey?: string;
        xenditKey?: string;
    }
  }
}

export const authenticateProvider = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
        return res.status(401).json({ message: "Unauthorized" });
    }


    try {
        const decoded = jwt.verify(token, process.env.ACESS_TOKEN_SECRET!) as JwtPayload;

        req.user = {
            id: decoded.id,
            providerId: decoded.providerId,
            role: decoded.role,
        };

        next();
    } catch (error: any) {
        if (error.name === "TokenExpiredError") {
        return res.status(401).json({ message: "Token expired. Please log in again." });
        }
        if (error.name === "JsonWebTokenError") {
        return res.status(403).json({ message: "Invalid token." });
        }
        console.error("JWT verification error:", error);
        return res.status(500).json({ message: "Internal server error during authentication." });
    }
}

export const validateProviderSmsKey = async(
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const {providerId} = req.user

    try {
        const provider = await prisma.provider.findUnique({
            where: {
                id: providerId
            },
            select: {
                semaphoreApiKey: true
            }
        })
        if(!provider?.semaphoreApiKey) return res.status(400).json({message: "Missing Sms Api key"})

        const decryptedKey = decrypt(provider.semaphoreApiKey);

        (req as any).smsKey = decryptedKey;

        next();

    } catch (error) {
        return res.status(400).json({message: "Failed in processing sms operations"})
    }
}

export const validateProviderXenditKey = async(
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const {providerId} = req.user

    try {
        const provider = await prisma.provider.findUnique({
            where: {
                id: providerId
            },
            select: {
                xenditApiKey: true
            }
        })
        if(!provider?.xenditApiKey) return res.status(400).json({message: "Missing Xendit Api key"})

        const decryptedKey = decrypt(provider.xenditApiKey);

        (req as any).xenditKey = decryptedKey;

        next();

    } catch (error) {
        return res.status(400).json({message: "Failed in processing sms operations"})
    }
}