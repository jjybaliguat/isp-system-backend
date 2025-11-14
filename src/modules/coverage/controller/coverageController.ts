import { Request, Response } from "express"
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const getCoverage = async(req: Request, res: Response) => {
    const {providerId} = req.user
    try {
        const coverage = await prisma.coverage.findMany({
            where: {
                providerId
            },
            include: {
                clients: {
                    select: {
                        id: true,
                        fullName: true
                    }
                }
            }
        })

        return res.status(200).json(coverage)
    } catch (error) {
        console.log(error)
        return res.status(500).json({message: "Internal Server Error"})
    }
}

export const createCoverage = async(req: Request, res: Response) => {
    const {
        name,
        latitude,
        longitude,
        radius
    } = req.body
    const {providerId} = req.user

    if(!name || !latitude || !longitude) return res.status(400).json({message: "Missing required fields"})

    try {
        const coverage = await prisma.coverage.create({
            data: {
                name,
                latitude,
                longitude,
                radius,
                providerId
            }
        })

        return res.status(201).json(coverage)
    } catch (error) {
        console.log(error)
        return res.status(500).json({message: "Internal Server Error"})
    }
}

export const updateCoverage = async(req: Request, res: Response) => {
    const {id} = req.params as {id: string}

    const body = req.body
    const {providerId} = req.user

    try {
        const updatedCoverage = await prisma.coverage.update({
            where: {
                id,
                providerId
            },
            data: body
        })

        return res.status(200).json(updatedCoverage)
    } catch (error) {
        console.log(error)
        return res.status(500).json({message: "Internal Server Error"})
    }
}

export const deleteCoverage = async(req: Request, res: Response) => {
    const {id} = req.params as {id: string}
    
    try {
        await prisma.coverage.delete({
            where: {
                id
            }
        })

        return res.status(200).json({message: "Coverage deleted successfully"})
    } catch (error) {
        console.log(error)
        return res.status(500).json({message: "Internal Server Error"})
    }
}