"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendSms = exports.getSms = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const getSms = async (req, res) => {
    const smsKey = req.smsKey;
    // const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    try {
        const response = await fetch(`https://api.semaphore.co/api/v4/messages?apikey=${smsKey}&limit=${limit}&sort=created_at&order=desc`, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
        });
        const data = await response.json();
        if (!Array.isArray(data)) {
            return res.status(400).json({ message: "Invalid API Key" });
        }
        if (!Array.isArray(data)) {
            return res.status(400).json({ message: "Invalid API Key" });
        }
        // const sortedData = data.sort((a: any, b: any) => {
        //     return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        //     });
        return res.status(200).json({
            data: data,
            pagination: {
                total: data.length,
                page: 1,
                limit,
                totalPages: Math.ceil(data.length / limit),
            },
        });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};
exports.getSms = getSms;
const sendSms = async (req, res) => {
    const smsKey = req.smsKey;
    const { recipients, message } = req.body;
    const { id: userId, providerId } = req.user;
    try {
        const response = await fetch(`https://api.semaphore.co/api/v4/messages?apikey=${smsKey}&number=${recipients}&message=${message}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            }
        });
        const data = await response.json();
        if (data.apikey)
            return res.status(400).json({ message: "Invalid Api Key" });
        // ---- LOG ACTION (non-blocking) ----
        prisma.log
            .create({
            data: {
                action: "SEND_SMS",
                entity: "SMS",
                userId,
                message: `SMS sent to ${recipients}`,
                providerId,
            },
        })
            .catch(console.error);
        return res.status(200).json({ message: "Message sent" });
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};
exports.sendSms = sendSms;
//# sourceMappingURL=smsController.js.map