"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPPPSecrets = exports.getPPPoEHistory = exports.getLatestActivePPPoEAccounts = void 0;
const prisma_1 = __importDefault(require("../../utils/prisma"));
const mikrotik_1 = require("../../helpers/mikrotik");
const getLatestActivePPPoEAccounts = async (req, res) => {
    const { providerId } = req.user;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const offset = (page - 1) * limit;
    try {
        // Verify provider access
        const provider = await prisma_1.default.provider.findUnique({
            where: { id: providerId },
            // Optional: adjust filters if you need providerType / companyName checks
        });
        if (!provider)
            return res
                .status(400)
                .json({ message: "You do not have access to this endpoint" });
        // Build search filter
        const where = search
            ? {
                username: {
                    contains: search,
                    mode: "insensitive",
                },
            }
            : {};
        // Get total count
        const totalCount = await prisma_1.default.pppoeLatest.count({ where });
        // Get paginated latest records
        const latestRecords = await prisma_1.default.pppoeLatest.findMany({
            where,
            orderBy: { username: "asc" },
            skip: offset,
            take: limit,
        });
        const totalPages = Math.ceil(totalCount / limit);
        return res.status(200).json({
            data: latestRecords,
            pagination: {
                page,
                limit,
                total: totalCount,
                totalPages,
            },
        });
    }
    catch (error) {
        console.error("Error fetching latest PPPoE accounts:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};
exports.getLatestActivePPPoEAccounts = getLatestActivePPPoEAccounts;
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
        const intervalSec = Number(req.query.interval) || 2;
        // 🔥 Use generate_series for gap filling
        const data = await prisma_1.default.$queryRawUnsafe(`
      SELECT 
        gs AS "recordedAt",
        COALESCE(b.rx_mbps, 0) AS "rx_mbps",
        COALESCE(b.tx_mbps, 0) AS "tx_mbps"
      FROM generate_series(
        '${from.toISOString()}'::timestamp,
        '${to.toISOString()}'::timestamp,
        interval '${intervalSec} seconds'
      ) AS gs
      LEFT JOIN LATERAL (
        SELECT rx_mbps, tx_mbps
        FROM "pppoe_bandwidth" b
        WHERE b.username ILIKE '${username}'
          AND b."recorded_at" >= gs
          AND b."recorded_at" < gs + interval '${intervalSec} seconds'
        ORDER BY b."recorded_at" ASC
        LIMIT 1
      ) b ON true
      ORDER BY gs ASC
    `);
        return res.json(data);
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "Internal server error",
        });
    }
};
exports.getPPPoEHistory = getPPPoEHistory;
const getPPPSecrets = async (req, res) => {
    const { id, providerId } = req.user;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const search = typeof req.query.search === "string" ? req.query.search.trim().toLowerCase() : "";
    const offset = (page - 1) * limit;
    const conn = await (0, mikrotik_1.getMikrotikConnection)();
    if (!conn) {
        return res.status(400).json({ message: "Mikrotik Connection Failed" });
    }
    try {
        const pppsecrets = await conn.write("/ppp/secret/print");
        // 🔍 Search filter (you can customize fields)
        const filtered = search
            ? pppsecrets.filter((secret) => {
                return (secret.name?.toLowerCase().includes(search) ||
                    secret.service?.toLowerCase().includes(search) ||
                    secret.profile?.toLowerCase().includes(search));
            })
            : pppsecrets;
        const totalCount = filtered.length;
        const totalPages = Math.ceil(totalCount / limit);
        // 📄 Pagination
        const paginatedData = filtered.slice(offset, offset + limit);
        return res.status(200).json({
            data: paginatedData,
            pagination: {
                page,
                limit,
                total: totalCount,
                totalPages,
            },
        });
    }
    catch (error) {
        await (0, mikrotik_1.closeMikrotikConnection)();
        console.log(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};
exports.getPPPSecrets = getPPPSecrets;
//# sourceMappingURL=mikrotikContollers.js.map