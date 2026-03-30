import nodemailer from "nodemailer";
import dotenv from 'dotenv'
dotenv.config()

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT) || 465,
    secure: process.env.NODE_ENV === "production" ? true : false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

export const sendEmail = async(message: string) =>{
    await transporter.sendMail({
        from: `Website Inquiry <${process.env.EMAIL_USER}>`,
        to: process.env.EMAIL_USER,
        subject: "Inquiry",
        html: message,
    });
}