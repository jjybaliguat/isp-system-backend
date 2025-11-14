import { Response, Request } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const getClientTypes = async (req: Request, res: Response) => {
    const {providerId} = req.user

    if(!providerId){
        return res.status(401).json({message: "Unauthorized"})
    }

    try {
        const clientTypes = await prisma.clientType.findMany({
            where: {
                providerId
            }
        })

        return res.status(200).json(clientTypes)
    } catch (error) {
        console.log(error)
        res.status(500).json({message: "Internal Server Error"})
    }
}

export const createClientType = async(req: Request, res: Response) => {
    const {providerId} = req.user
    const {name} = req.body

    try {
        const clientType = await prisma.clientType.create({
            data: {
                name,
                providerId
            }
        })

        return res.status(201).json(clientType)
    } catch (error) {
        console.log(error)
        res.status(500).json({message: "Internal Server Error"})
    }
}

export const deleteClientType = async(req: Request, res: Response) => {
    const {providerId} = req.user
    const {id} = req.params as {id: string}

    try {
        await prisma.clientType.delete({
            where: {
                id,
                providerId
            }
        })

        return res.status(200).json({message: "Client type deleted successfully"})
    } catch (error) {
        console.log(error)
        res.status(500).json({message: "Internal Server Error"})
    }
}

export const updatedClientType = async(req: Request, res: Response) => {
    const {id} = req.params as {id: string}
    const {name} = req.body
    
    try {
        const updatedClientType = await prisma.clientType.update({
            where: {
                id
            },
            data: {
                name
            }
        })

        return res.status(200).json(updatedClientType)
    } catch (error) {
        console.log(error)
        res.status(500).json({message: "Internal Server Error"})
    }
}