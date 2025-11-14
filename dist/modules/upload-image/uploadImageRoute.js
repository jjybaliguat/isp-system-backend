"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const authMiddleware_1 = require("../../middlewares/authMiddleware");
const imageSizeLimiter_1 = require("../../middlewares/imageSizeLimiter");
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const router = express_1.default.Router();
router.post("/", authMiddleware_1.authenticateProvider, async (req, res) => {
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
        const fileUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
        res.json({ url: fileUrl });
    });
});
exports.default = router;
//# sourceMappingURL=uploadImageRoute.js.map