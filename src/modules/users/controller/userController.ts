import { Request, Response } from 'express';
import bcrypt from "bcryptjs";

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const getUsers = async (req: Request, res: Response) => {
    const {providerId} = req.user;
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    console.log(search);
    if(!providerId) return res.status(400).json({message: "Unauthorized"})

    try {
        const users = await prisma.user.findMany({
            where: {
                providerId,
                OR: [
                    { email: { contains: search, mode: 'insensitive' } },
                    { employee: { fullName: { contains: search, mode: 'insensitive' } } }
                ]
            },
            include: {
                employee: {
                    select: {
                        id: true,
                        fullName: true,
                        team: {
                            select: {
                                id: true,
                                name: true
                            }
                        }
                    }
                }
            },
            orderBy: { createdAt: "asc" }
        })
        
        return res.status(200).json(users)
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

export const createUser = async(req: Request, res: Response) => {
    const {
        employeeId,
        role,
        password
    } = req.body

    const {id: userId, providerId} = req.user

    try {
        const employee = await prisma.employees.findUnique({
            where: { id: employeeId, providerId }
        })

        if(!employee) {
            return res.status(400).json({ message: "Employee not found" });
        }

        const isUserExist = await prisma.user.findUnique({
            where: { employeeId }
        })

        if(isUserExist) {
            return res.status(400).json({ message: "User for this employee already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await prisma.user.create({
            data: {
                email: employee.email,
                fullName: employee.fullName,
                employeeId,
                role,
                password: hashedPassword,
                providerId
            }
        })
        // ---- LOG ACTION (non-blocking) ----
        prisma.log
        .create({
            data: {
            action: "CREATE",
            entity: "User",
            userId,
            message: `User ${newUser.email} created`,
            providerId,
            },
        })
        .catch(console.error);
        return res.status(201).json(newUser);
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

export const deleteUser = async(req: Request, res: Response) => {
    const { id } = req.params as {id: string}
    const {id: userId, providerId} = req.user

    try {
        const user = await prisma.user.findUnique({
            where: {
                id,
                providerId
            }
        })
        if(!user){
            return res.status(404).json({message: "User not found"})
        }
        await prisma.user.delete({
            where: {
                id,
                providerId
            }
        })

        // ---- LOG ACTION (non-blocking) ----
        prisma.log
        .create({
            data: {
            action: "DELETE",
            entity: "User",
            userId,
            message: `User ${user.email} deleted`,
            providerId,
            },
        })
        .catch(console.error);
        return res.status(200).json({message: "User deleted successfully"})
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

export const changePass = async(req: Request, res: Response) => {
    const {id} = req.params as  {id: string}
    const {
        currentPassword,
        newPassword
    } = req.body

    try {
        const user = await prisma.user.findUnique({
            where: {
                id
            },
            select: {
                password: true
            }
        })
        if(user){
            const isCurrentPasswordMatched = await bcrypt.compare(currentPassword, user?.password)

            if(!isCurrentPasswordMatched) {
                return res.status(400).json({message: "Invalid current password"})
            }

            const newPasswordHashed = await bcrypt.hash(newPassword, 10);

            await prisma.user.update({
                where: {
                    id
                },
                data: {
                    password: newPasswordHashed
                }
            })

            return res.status(200).json({message: "Password updated successfully"})
        }
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal server error" });
    }
}