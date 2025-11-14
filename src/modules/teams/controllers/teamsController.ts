import { Request, Response } from "express"
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
export const getTeams = async(req: Request, res: Response) => {
    const {providerId} = req.user

    try {
        const teams = await prisma.employeesTeam.findMany({
            where: {
                providerId
            },
            include: {
                employees: {
                    select: {
                        id: true,
                        fullName: true
                    }
                }
            }
        })

        return res.status(200).json(teams)
    } catch (error) {
        console.log(error)
        return res.status(500).json({message: "Internal Server Error"})   
    }
}

export const createTeam = async(req: Request, res: Response) => {
    const {teamName} = req.body
    const {providerId} = req.user

    try {
        const newTeam = await prisma.employeesTeam.create({
            data: {
                name: teamName,
                providerId
            }
        })

        res.status(201).json(newTeam)
    } catch (error) {
        console.log(error)
        return res.status(500).json({message: "Internal Server Error"})   
    }
}


export const deleteTeam = async(req: Request, res: Response) => {
    const {id} = req.params as {id: string}
    const {id: userId, providerId} = req.user

    try {
        await prisma.employeesTeam.delete({
            where: {
                id,
                providerId
            }
        })

        // implement logs

        res.status(200).json({message: "Team deleted successfully"})
    } catch (error) {
        console.log(error)
        return res.status(500).json({message: "Internal Server Error"})   
    }
}

export const updateTeam = async(req: Request, res: Response) => {
    const {id} = req.params as {id: string}
    const {teamName} = req.body
    const {providerId} = req.user
    try {
        const updateTeam = await prisma.employeesTeam.update({
            where: {
                id,
                providerId
            },
            data: {
                name: teamName
            }
        })

        // implement logs

        return res.status(200).json(updateTeam)
    } catch (error) {
        console.log(error)
        return res.status(500).json({message: "Internal Server Error"})   
    }
}