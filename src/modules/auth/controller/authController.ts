import { Request, Response } from 'express';
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { generateToken } from '../../../utils/jwtUtils';
import jwt from 'jsonwebtoken'
import asyncHandler from 'express-async-handler'
const prisma = new PrismaClient();

export const loginController = async (req: Request, res: Response) => {
    const { email, password } = req.body;

    try {
        const user = await prisma.user.findUnique({
            where: { email }
        })

        if(!user)
            return res.status(400).json({ message: "Invalid Credentials" });
        const validPassword = await bcrypt.compare(password, user.password);
        if(!validPassword) return res.status(400).json({ message: "Invalid Credentials" });

        const accessToken = generateToken({
            id: user.id,
            providerId: user.providerId,
            role: user.role
        }, 15); // 15min

        const refreshToken = jwt.sign(
            { "email": user.email },
            process.env.REFRESH_TOKEN_SECRET!,
            { expiresIn: '1hr' }
        )

        // Create secure cookie with refresh token 
        res.cookie(process.env.JWT_COOKIE_NAME!, refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production", 
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
            domain: process.env.NODE_ENV === "production" ? ".sierracommunication.net" : undefined,
            maxAge: 7 * 24 * 60 * 60 * 1000
        });


        return res.status(200).json({ ...user, accessToken });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

export const registerController = async (req: Request, res: Response) => {
    const {
        name,
        companyName,
        companyAddress,
        email,
        phoneNumber,
        password
    } = req.body;

    const requiredFields: Record<string, unknown> = {name, companyName, companyAddress, email, phoneNumber, password};
    const missingFields = Object.entries(requiredFields)
        .filter(([_, value]) => value === undefined || value === null || value === '')
        .map(([key]) => key)
    if(missingFields.length > 0) {
        const errors: Record<string, string> = {};
        missingFields.forEach(field => {
            errors[field] = `${field} is required`;
        })
    }

    try {
        const existingUser = await prisma.user.findUnique({
            where: { email
                }
        })

        if(existingUser) {
            return res.status(400).json({ message: "Provider with the same email already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

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

        res.status(201).json({message: "Provider registered successfully" });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Internal server error" });
    }
}

export const refresh = asyncHandler( async (req: any, res: any)=> {
  const cookies = req.cookies

    if (!cookies?.jwt_refresh_secret) return res.status(401).json({ message: 'Unauthorized' })

    const refreshToken = cookies.jwt_refresh_secret

  jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET!, async (err: any, decoded: any) => {
    if (err) return res.status(403).json({ message: "Forbidden" });

    const foundUser = await prisma.user.findUnique({
      where: { email: decoded.email },
    });

    if (!foundUser) return res.status(401).json({ message: "Unauthorized" });

    const accessToken = generateToken(
      {
        id: foundUser.id,
        providerId: foundUser.providerId,
        role: foundUser.role,
      },
      15 // 1min for testing
    );

    res.json({ accessToken });
  });
})

export const logout = async (req: Request, res: Response) => {
    const cookies = req.cookies
    if (!cookies?.jwt_refresh_secret) return res.sendStatus(204) //No content
    res.clearCookie(process.env.JWT_COOKIE_NAME!, { 
        httpOnly: true, 
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        domain: process.env.NODE_ENV === "production" ? ".sierracommunication.net" : undefined,
        secure: process.env.NODE_ENV === "production", 
    })
    console.log("cookie cleared")
    res.json({ message: 'Cookie cleared' })
}