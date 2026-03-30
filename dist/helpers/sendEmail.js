"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmail = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const transporter = nodemailer_1.default.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT) || 465,
    secure: process.env.NODE_ENV === "production" ? true : false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});
const sendEmail = async (message) => {
    await transporter.sendMail({
        from: `Website Inquiry <${process.env.EMAIL_USER}>`,
        to: process.env.EMAIL_USER,
        subject: "Inquiry",
        html: message,
    });
};
exports.sendEmail = sendEmail;
//# sourceMappingURL=sendEmail.js.map