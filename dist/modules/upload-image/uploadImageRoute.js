"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const authMiddleware_1 = require("../../middlewares/authMiddleware");
const imageSizeLimiter_1 = require("../../middlewares/imageSizeLimiter");
const rateLimiter_1 = require("../../middlewares/rateLimiter");
const router = express_1.default.Router();
router.post("/", authMiddleware_1.authenticateProvider, rateLimiter_1.rateLimiter, async (req, res) => {
    (0, imageSizeLimiter_1.upload)(req, res, (err) => {
        if (err) {
            if (err instanceof multer_1.default.MulterError && err.code === "LIMIT_FILE_SIZE") {
                return res.status(400).json({ message: "File too large. Max size is 5 MB" });
            }
            return res.status(400).json({ message: err.message });
        }
        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }
        // Determine protocol: prefer HTTPS in production, otherwise honor x-forwarded-proto or req.protocol
        // Determine protocol: prefer HTTPS in production, otherwise honor x-forwarded-proto or req.protocol
        // In production, force https to ensure publicly accessible HTTPS URLs are returned.
        const destination = req.file.destination || '';
        const folderName = destination ? path_1.default.basename(destination) : '';
        // Force https in production so returned URLs are secure. When developing locally, use req.protocol.
        const protocol = process.env.NODE_ENV === 'production' ? 'https' : req.protocol;
        const fileUrl = `${protocol}://${req.get('host')}/uploads/${folderName}/${req.file.filename}`;
        // const fileUrl = `${protocol}://${req.get('host')}/uploads/${req.file.filename}`;
        res.json({ url: fileUrl });
    });
});
exports.default = router;
//# sourceMappingURL=uploadImageRoute.js.map