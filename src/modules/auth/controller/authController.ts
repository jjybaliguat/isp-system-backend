import { Request, Response } from 'express';
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { generateToken } from '../../../utils/jwtUtils';
import jwt from 'jsonwebtoken'
import asyncHandler from 'express-async-handler'
import nodemailer from 'nodemailer';
const prisma = new PrismaClient();

export const loginController = async (req: Request, res: Response) => {
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
            { "email": user.email, "role": user.role },
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
    if (err) {
        res.clearCookie(process.env.JWT_COOKIE_NAME!, { 
            httpOnly: true, 
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
            domain: process.env.NODE_ENV === "production" ? ".sierracommunication.net" : undefined,
            secure: process.env.NODE_ENV === "production", 
        })
        return res.status(403).json({ message: "Forbidden" });
    }

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
    const {id} = req.user as {id: string}

    const user = await prisma.user.findUnique({
        where: { id },
    });
    if(!user) return res.sendStatus(204) //No content

    if (!cookies?.jwt_refresh_secret) return res.sendStatus(204) //No content
    res.clearCookie(process.env.JWT_COOKIE_NAME!, { 
        httpOnly: true, 
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        domain: process.env.NODE_ENV === "production" ? ".sierracommunication.net" : undefined,
        secure: process.env.NODE_ENV === "production", 
    })

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
    console.log("cookie cleared")
    res.json({ message: 'Cookie cleared' })
}

export const forgotPassword = async (req: Request, res: Response) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    try {
        const user = await prisma.user.findUnique({
            where: { email },
            include: { provider: true },
        });


        const settings =  user?.provider?.settings as {
            notifications?: {
                enabled: boolean;
                emailUser?: string;
                emailPass?: string;
                emailHost?: string;
                senderName?: string;
                emailPort?: number;
                paymentConfirmationTemplate?: string;
            };
            } | undefined;

        const emailIsConfigured =
        settings &&
        settings.notifications?.enabled &&
        settings.notifications?.emailHost &&
        settings.notifications?.emailPass &&
        settings.notifications?.emailUser &&
        settings.notifications?.senderName &&
        settings.notifications?.emailPort

        if (!user || !emailIsConfigured) {
            return res.status(200).json({ message: 'If an account with that email exists, a reset link has been sent.' });
        }
        const secret = process.env.PASSWORD_RESET_SECRET!;
        const token = jwt.sign({ userId: user.id, email: user.email }, secret, { expiresIn: '1h' });

        const frontendUrl = process.env.NODE_ENV === "production"? "https://sierracommunication.net" : "http://localhost:3000";
        const resetLink = `${frontendUrl.replace(/\/$/, '')}/reset-password?token=${encodeURIComponent(token)}`;

        const transporter = nodemailer.createTransport({
            host: settings.notifications?.emailHost,
            port: Number(settings.notifications?.emailPort) || 465,
            secure: settings.notifications?.emailPort === 465,
            auth: {
                user: settings.notifications?.emailUser,
                pass: settings.notifications?.emailPass,
            },
        });

        const mailOptions = {
            from: `${settings.notifications?.senderName || 'Support'} <${settings.notifications?.emailUser}>`,
            to: user.email,
            subject: 'Password reset request',
            html: `<p>Hi ${user.fullName || ''},</p>
                <p>We received a request to reset your password. Click the link below to set a new password. This link will expire in 1 hour.</p>
                <p><a href="${resetLink}">Reset password</a></p>
                <p>If you did not request this, you can safely ignore this email.</p>`,
        };

        await transporter.sendMail(mailOptions).catch((err) => console.error('Failed to send reset email', err));

        return res.status(200).json({ message: 'Password reset link has been sent.' });
    } catch (error) {
        console.error('forgotPassword error', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

export const resetPassword = async (req: Request, res: Response) => {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ message: 'Token and password are required' });

    try {
        const secret = process.env.PASSWORD_RESET_SECRET!;
        let payload: any;
        try {
            payload = jwt.verify(token, secret) as any;
        } catch (err) {
            return res.status(400).json({ message: 'Invalid or expired token' });
        }

        const userId = payload.userId as string;
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return res.status(400).json({ message: 'Invalid token' });

        const hashed = await bcrypt.hash(password, 10);
        await prisma.user.update({ where: { id: userId }, data: { password: hashed } });

        prisma.log.create({
            data: {
                action: 'PASSWORD_RESET',
                entity: 'User',
                userId,
                message: `Password reset for user ${user.email}`,
                providerId: user.providerId,
            },
        }).catch(console.error);

        return res.status(200).json({ message: 'Password has been reset successfully' });
    } catch (error) {
        console.error('resetPassword error', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};