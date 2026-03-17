"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPPPoEHistory = exports.getActivePPPoEAccounts = void 0;
const prisma_1 = __importDefault(require("../../utils/prisma"));
const getActivePPPoEAccounts = async (req, res) => {
    const { id, providerId } = req.user;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const offset = (page - 1) * limit;
    try {
        const provider = await prisma_1.default.provider.findUnique({
            where: {
                id: providerId,
                providerType: "MAIN",
                companyName: {
                    contains: "Sierra",
                    mode: "insensitive"
                }
            }
        });
        if (!provider)
            return res.status(400).json({ message: "You do not have access to this edpoint" });
        // Get latest bandwidth per user with pagination
        const where = search
            ? {
                username: {
                    contains: search,
                    mode: "insensitive",
                },
            }
            : {};
        const [usernames, total] = await Promise.all([
            prisma_1.default.pppoeBandwidth.findMany({
                where,
                distinct: ["username"],
                select: { username: true },
                skip: offset,
                take: limit,
            }),
            prisma_1.default.pppoeBandwidth.groupBy({
                by: ["username"],
                where,
            }),
        ]);
        const latestRecords = await prisma_1.default.pppoeBandwidth.findMany({
            where: {
                username: {
                    in: usernames.map((u) => u.username),
                },
            },
            orderBy: [
                { username: "asc" },
                { recordedAt: "desc" },
            ],
            distinct: ["username"],
        });
        const data = latestRecords;
        const totalCount = total.length;
        const totalPages = Math.ceil(totalCount / limit);
        const response = {
            data,
            pagination: {
                page,
                limit,
                total: totalCount,
                totalPages,
            },
        };
        return res.status(200).json(response);
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};
exports.getActivePPPoEAccounts = getActivePPPoEAccounts;
const getPPPoEHistory = async (req, res) => {
    try {
        const username = req.query.username;
        if (!username) {
            return res.status(400).json({ message: "username is required" });
        }
        const from = req.query.from
            ? new Date(req.query.from)
            : new Date(Date.now() - 5 * 60 * 1000);
        const to = req.query.to
            ? new Date(req.query.to)
            : new Date();
        const data = await prisma_1.default.pppoeBandwidth.findMany({
            where: {
                username,
                recordedAt: {
                    gte: from,
                    lte: to
                }
            },
            orderBy: {
                recordedAt: "asc"
            }
        });
        return res.json(data);
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "Internal server error"
        });
    }
};
exports.getPPPoEHistory = getPPPoEHistory;
//# sourceMappingURL=mikrotikContollers.js.map