"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLogs = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const getLogs = async (req, res) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const month = typeof req.query.month === "string" ? req.query.month : undefined;
    const year = typeof req.query.year === "string" ? req.query.year : undefined;
    const entity = typeof req.query.entity === "string" ? req.query.entity : undefined;
    const providerId = req.user.providerId;
    const skip = (page - 1) * limit;
    if (!providerId)
        return res.status(400).json({ message: "Unauthorized" });
    try {
        const whereClause = {
            providerId
        };
        if (month && year) {
            const startDate = new Date(Number(year), Number(month) - 1, 1);
            const endDate = new Date(Number(year), Number(month), 0, 23, 59, 59);
            whereClause.createdAt = {
                gte: startDate,
                lte: endDate,
            };
        }
        if (search) {
            whereClause.OR = [
                {
                    message: { contains: search, mode: 'insensitive' }
                },
                {
                    user: {
                        fullName: { contains: search, mode: 'insensitive' }
                    }
                }
            ];
        }
        if (entity) {
            whereClause.entity = entity;
        }
        const [data, total] = await Promise.all([
            prisma.log.findMany({
                where: whereClause,
                include: {
                    user: {
                        select: {
                            id: true,
                            fullName: true,
                            employee: {
                                select: {
                                    fullName: true
                                }
                            }
                        }
                    }
                },
                orderBy: { createdAt: "desc" },
                skip,
                take: limit,
            }),
            prisma.log.count({
                where: whereClause
            })
        ]);
        return res.status(200).json({
            data,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        });
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};
exports.getLogs = getLogs;
//# sourceMappingURL=logsController.js.map