"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendInvoiceReminderEmail = sendInvoiceReminderEmail;
const nodemailer_1 = __importDefault(require("nodemailer"));
const marked = require("marked");
async function sendInvoiceReminderEmail(templateMd, emailCredentials, recipient, subject, data) {
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
            secure: emailCredentials.emailPort === 465,
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
    }
    catch (error) {
        console.error("❌ Failed to send email:", error);
    }
}
//# sourceMappingURL=sendInvoiceReminderEmail.js.map