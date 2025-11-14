"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.upload = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const storage = multer_1.default.diskStorage({
    destination: async (req, _file, cb) => {
        try {
            const { providerId } = req.user;
            const provider = await prisma.provider.findUnique({
                where: { id: providerId },
                select: { companyName: true },
            });
            if (!provider || !provider.companyName) {
                return cb(new Error("Provider not found or missing username"), "");
            }
            const folderName = provider.companyName.trim().replace(/\s+/g, "_");
            const userDir = path_1.default.resolve(__dirname, "../../uploads", folderName);
            if (!fs_1.default.existsSync(userDir)) {
                fs_1.default.mkdirSync(userDir, { recursive: true });
            }
            cb(null, userDir);
        }
        catch (err) {
            cb(err, "");
        }
    },
    filename: (_req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + path_1.default.extname(file.originalname));
    },
});
exports.upload = (0, multer_1.default)({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB limit
    fileFilter: (_req, file, cb) => {
        if (!file.mimetype.startsWith("image/")) {
            return cb(new Error("Only image files are allowed"));
        }
        cb(null, true);
    },
}).single("image");
//# sourceMappingURL=imageSizeLimiter.js.map