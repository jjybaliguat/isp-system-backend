import { Request, Response } from "express"
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const getSms = async(req: Request, res: Response) => {
    const smsKey = req.smsKey
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;

    try {
        const response: any = await fetch(`https://api.semaphore.co/api/v4/messages?apikey=${smsKey}&limit=${limit}&page=${page}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            }
        })

        const data = await response.json()

        if(data.apikey) return res.status(400).json({message: "Invalid Api Key"})

        const sortedData = data.sort((a: any, b: any) => {
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            });

        return res.status(200).json({
        data: sortedData,
        pagination: {
            total: data.length,
            page,
            limit,
            totalPages: Math.ceil(data.length / limit),
        },
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}

export const sendSms = async(req: Request,res: Response) => {
    const smsKey = req.smsKey

    const {
        recipients,
        message
    } = req.body

    try {
        const response: any = await fetch(`https://api.semaphore.co/api/v4/messages?apikey=${smsKey}&number=${recipients}&message=${message}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            }
        })

        const data = await response.json()

        if(data.apikey) return res.status(400).json({message: "Invalid Api Key"})

        return res.status(200).json({message: "Message sent"})
    } catch (error) {
        console.log(error)
        return res.status(500).json({ message: "Internal Server Error" });
    }
}