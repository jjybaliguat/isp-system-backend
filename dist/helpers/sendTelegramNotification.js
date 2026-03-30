"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendTelegramMessage = sendTelegramMessage;
const axios_1 = __importDefault(require("axios"));
async function sendTelegramMessage(message, botToken, chatId) {
    try {
        const res = await axios_1.default.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            chat_id: chatId,
            text: message,
            parse_mode: "HTML",
        });
        return res;
    }
    catch (error) {
        console.error("Telegram error:", error);
    }
}
//# sourceMappingURL=sendTelegramNotification.js.map