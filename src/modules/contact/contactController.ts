import {Request, Response} from 'express'
import { sendEmail } from '../../helpers/sendEmail'

export const contactFormEmail = async(req: Request, res: Response) => {
    const {fullName, email, message} = req.body

    if(!fullName || !email || !message) return res.status(400).json({message: "Missing required fields"})

    try {
        const message = "Hello"
        await sendEmail(message)

        return res.status(200).json({message: "Message sent"})
    } catch (error) {
        console.log(error)
        return res.status(500).json({message: "Internal Server Error"})
    }
}