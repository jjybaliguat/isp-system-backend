"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendPaymentConfirmation = sendPaymentConfirmation;
const nodemailer_1 = __importDefault(require("nodemailer"));
const marked = require("marked");
async function sendPaymentConfirmation(templateMd, emailCredentials, recipient, subject, data) {
    try {
        let compiledMd = templateMd;
        for (const key of Object.keys(data)) {
            const value = String(data[key]);
            const regex = new RegExp(`{{\\s*${key}\\s*}}`, "g");
            compiledMd = compiledMd.replace(regex, value);
        }
        const htmlBody = await marked.parse(compiledMd);
        const transporter = nodemailer_1.default.createTransport({
            host: emailCredentials.emailHost,
            port: emailCredentials.emailPort || 465,
            secure: process.env.NODE_ENV === "production" ? true : false,
            auth: {
                user: emailCredentials.emailUser,
                pass: emailCredentials.emailPass,
            },
        });
        await transporter.sendMail({
            from: `${emailCredentials.senderName} <${emailCredentials.emailUser}>`,
            to: recipient,
            subject,
            html: htmlBody,
        });
        console.log("✅ Email sent successfully to", recipient);
    }
    catch (error) {
        console.error("❌ Failed to send email:", error);
        return error;
    }
}
//# sourceMappingURL=sendPaymentConfirmation.js.map