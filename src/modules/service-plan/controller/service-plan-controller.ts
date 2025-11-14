import { Response, Request } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const getServicePlans = async (req: Request, res: Response) => {
    const {providerId} = req.user
    try {
        const servicePlans = await prisma.servicePlan.findMany({
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
            },
            orderBy: {
                speedMbps: "asc"
            }
        })

        return res.status(200).json(servicePlans)
    } catch (error) {
        console.log(error)
        res.status(500).json({message: "Internal Server Error"})
    }
}

export const createServicePlan = async(req: Request, res: Response) => {
    const {providerId} = req.user
    const {
        name,
        speedMbps,
        monthlyFee,
        descriptions
    } = req.body

    if(!name || !speedMbps || !monthlyFee) return res.status(400).json({message: "Missing required fields"}) 

    try {
        const servicePlan = await prisma.servicePlan.create({
            data: {
                name,
                monthlyFee,
                speedMbps,
                descriptions,
                providerId
            }
        })

        return res.status(200).json(servicePlan)
    } catch (error) {
        console.log(error)
        res.status(500).json({message: "Internal Server Error"})
    }
}

export const updateServicePlan = async(req: Request, res: Response) => {
    const {providerId} = req.user
    const {id} = req.params as {id: string}
    const body = req.body

    try {
        const updatedPlan = await prisma.servicePlan.update({
            where: {
                id,
                providerId
            },
            data: body
        })

        return res.status(200).json(updateServicePlan)
    } catch (error) {
        console.log(error)
        res.status(500).json({message: "Internal Server Error"})
    }
}

export const deleteServicePlan = async(req: Request, res: Response) => {
    const {providerId} = req.user
    const {id} = req.params as {id: string}

    try {
        await prisma.servicePlan.delete({
            where: {
                id,
                providerId
            }
        })

        return res.status(200).json({message: "Service plan deleted successfully"})
    } catch (error) {
        console.log(error)
        res.status(500).json({message: "Internal Server Error"})
    }
}

