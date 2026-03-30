"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.contactFormEmail = void 0;
const sendEmail_1 = require("../../helpers/sendEmail");
const contactFormEmail = async (req, res) => {
    const { fullName, email, message } = req.body;
    if (!fullName || !email || !message)
        return res.status(400).json({ message: "Missing required fields" });
    try {
        const message = "Hello";
        await (0, sendEmail_1.sendEmail)(message);
        return res.status(200).json({ message: "Message sent" });
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};
exports.contactFormEmail = contactFormEmail;
//# sourceMappingURL=contactController.js.map