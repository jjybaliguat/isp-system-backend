"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendSms = sendSms;
async function sendSms(phoneNumber, template, data, apiKey) {
    try {
        let message = template;
        for (const key of Object.keys(data)) {
            const value = String(data[key]);
            const regex = new RegExp(`{\\s*${key}\\s*}`, "g");
            message = message.replace(regex, value);
        }
        const response = await fetch(`https://api.semaphore.co/api/v4/messages?apikey=${apiKey}&number=${phoneNumber}&message=${message}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            }
        });
        const responseData = await response.json();
        return responseData;
    }
    catch (error) {
        console.error("Error sending SMS:", error);
        return null;
    }
}
//# sourceMappingURL=sendSms.js.map