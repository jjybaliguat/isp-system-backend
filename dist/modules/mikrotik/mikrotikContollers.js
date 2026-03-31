"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatePPPSecrets = exports.getPPPSecrets = exports.getPPPoEHistory = exports.getPPPActiveV2 = exports.getPPPActive = exports.deleteMikrotikRouter = exports.getMikrotikStatus = exports.getMikrotikRouters = exports.createMikrotikRouter = void 0;
const prisma_1 = __importDefault(require("../../utils/prisma"));
const mikrotik_1 = require("../../helpers/mikrotik");
const hasher_1 = require("../../utils/hasher");
const generateMikrotikScript_1 = require("../../helpers/generateMikrotikScript");
const node_routeros_1 = require("node-routeros");
const createMikrotikRouter = async (req, res) => {
    const { id: userId, providerId } = req.user;
    const { name, username, password } = req.body;
    try {
        const provider = await prisma_1.default.provider.findUnique({
            where: { id: providerId },
            select: {
                mikrotikRouters: true,
                mikrotikRouterLimit: true,
            },
        });
        if (!provider) {
            return res.status(404).json({ message: "Provider not found" });
        }
        if (provider?.mikrotikRouters.length >= provider?.mikrotikRouterLimit) {
            return res.status(400).json({
                message: "Mikrotik router limit reached for this account.",
            });
        }
        // Get **one available WireGuard key**
        const availableWireGuardKey = await prisma_1.default.wireguardKeys.findFirst({
            where: { mikrotikRouterId: null },
        });
        if (!availableWireGuardKey) {
            return res.status(400).json({
                message: "No available WireGuard keys. Please generate more keys before creating a router.",
            });
        }
        const decryptedPrivateKey = (0, hasher_1.decrypt)(availableWireGuardKey.privateKey);
        const connectScript = (0, generateMikrotikScript_1.generateMikrotikConnectScript)(name, { ...availableWireGuardKey, privateKey: decryptedPrivateKey }, 51820, process.env.SERVER_WG_PUBLIC_KEY, process.env.SERVER_IP);
        const encryptedPassword = (0, hasher_1.encrypt)(password);
        const newRouter = await prisma_1.default.mikrotikRouter.create({
            data: {
                providerId,
                name,
                connectScript,
                username,
                password: encryptedPassword,
                // One-to-one relation
                wireguardKeys: {
                    connect: { id: availableWireGuardKey.id },
                },
            },
            include: {
                wireguardKeys: true, // return the connected key
            },
        });
        // Log the action
        await prisma_1.default.log.create({
            data: {
                action: "CREATE",
                entity: "MikrotikRouter",
                userId,
                providerId,
                message: `Created Mikrotik Router ${name}`,
            },
        });
        return res.status(201).json({ message: "Mikrotik Router created", router: newRouter });
    }
    catch (error) {
        console.log("Error creating Mikrotik Router:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};
exports.createMikrotikRouter = createMikrotikRouter;
const getMikrotikRouters = async (req, res) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = typeof req.query.search === "string" ? req.query.search.trim().toLowerCase() : "";
    const { providerId } = req.user;
    try {
        const [routers, total] = await prisma_1.default.$transaction([
            prisma_1.default.mikrotikRouter.findMany({
                where: {
                    providerId,
                    name: {
                        contains: search,
                        mode: "insensitive",
                    }
                },
                include: {
                    wireguardKeys: true,
                },
                skip: offset,
                take: limit,
            }),
            prisma_1.default.mikrotikRouter.count({
                where: {
                    providerId,
                    name: {
                        contains: search,
                        mode: "insensitive",
                    }
                }
            })
        ]);
        const paginatedResult = {
            data: routers,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
        return res.status(200).json(paginatedResult);
    }
    catch (error) {
        console.log("Error fetching Mikrotik Routers:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};
exports.getMikrotikRouters = getMikrotikRouters;
const getMikrotikStatus = async (req, res) => {
    const { providerId } = req.user;
    const routerId = req.params.id;
    try {
        const router = await prisma_1.default.mikrotikRouter.findUnique({
            where: { id: routerId, providerId },
            include: { wireguardKeys: true },
        });
        const device = new node_routeros_1.RouterOSAPI({
            host: router?.wireguardKeys?.assignedIp,
            user: router?.username,
            password: (0, hasher_1.decrypt)(router?.password),
        });
        let connection = null;
        try {
            connection = await device.connect();
        }
        catch (err) {
            return res.status(200).json({
                status: "offline",
                error: err.message,
            });
        }
        connection.close();
        return res.status(200).json({ status: "online" });
    }
    catch (error) {
        return res.status(404).json({ message: "Mikrotik Router not found" });
    }
};
exports.getMikrotikStatus = getMikrotikStatus;
const deleteMikrotikRouter = async (req, res) => {
    const { id: userId, providerId } = req.user;
    const routerId = req.params.id;
    try {
        const router = await prisma_1.default.mikrotikRouter.findUnique({
            where: { id: routerId, providerId },
        });
        if (!router) {
            return res.status(404).json({ message: "Mikrotik Router not found" });
        }
        await prisma_1.default.mikrotikRouter.delete({
            where: { id: routerId, providerId },
        });
        // Log the action
        await prisma_1.default.log.create({
            data: {
                action: "DELETE",
                entity: "MikrotikRouter",
                userId,
                providerId,
                message: `Deleted Mikrotik Router ${router.name}`,
            },
        });
        return res.status(200).json({ message: "Mikrotik Router deleted" });
    }
    catch (error) {
        console.log("Error deleting Mikrotik Router:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};
exports.deleteMikrotikRouter = deleteMikrotikRouter;
const getPPPActive = async (req, res) => {
    const { providerId } = req.user;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const search = typeof req.query.search === "string" ? req.query.search.trim().toLowerCase() : "";
    const offset = (page - 1) * limit;
    const conn = await (0, mikrotik_1.getMikrotikConnection)();
    if (!conn)
        return res.status(400).json({ message: "Failed connecting to mikrotik" });
    try {
        const pppActive = await conn.write("/ppp/active/print");
        // 🔍 Search filter (you can customize fields)
        const filtered = search
            ? pppActive.filter((secret) => {
                return (secret.name?.toLowerCase().includes(search) ||
                    secret.service?.toLowerCase().includes(search) ||
                    secret.address?.toLowerCase().includes(search));
            })
            : pppActive;
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
        console.error("Error fetching latest PPPoE accounts:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};
exports.getPPPActive = getPPPActive;
const getPPPActiveV2 = async (req, res) => {
    const { providerId } = req.user;
    const { id } = req.params;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const search = typeof req.query.search === "string" ? req.query.search.trim().toLowerCase() : "";
    const offset = (page - 1) * limit;
    try {
        const router = await prisma_1.default.mikrotikRouter.findUnique({
            where: { id },
            include: { wireguardKeys: true },
        });
        const routerPass = (0, hasher_1.decrypt)(router?.password);
        if (!router)
            return res.status(404).json({ message: "Mikrotik router not found" });
        const conn = new node_routeros_1.RouterOSAPI({ host: router?.wireguardKeys?.assignedIp, user: router?.username, password: routerPass, port: 8728, timeout: 5000, keepalive: true });
        try {
            await conn.connect();
            if (!conn)
                return res.status(400).json({ message: "Failed connecting to mikrotik" });
            const pppActive = await conn.write("/ppp/active/print");
            // 🔍 Search filter (you can customize fields)
            const filtered = search
                ? pppActive.filter((secret) => {
                    return (secret.name?.toLowerCase().includes(search) ||
                        secret.service?.toLowerCase().includes(search) ||
                        secret.address?.toLowerCase().includes(search));
                })
                : pppActive;
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
            await conn.close();
            // console.log("Error fetching latest PPPoE accounts:", error);
            return res.status(500).json({ message: "Connection Error" });
        }
    }
    catch (error) {
        console.log("Error fetching latest PPPoE accounts:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};
exports.getPPPActiveV2 = getPPPActiveV2;
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
        const diffSec = (to.getTime() - from.getTime()) / 1000;
        if (diffSec / intervalSec > 1000) {
            return res.status(400).json({
                message: "Too many data points. Increase interval.",
            });
        }
        // 🔥 Use generate_series for gap filling
        const data = await prisma_1.default.$queryRaw `
      SELECT 
        gs AS "recordedAt",
        COALESCE(b.rx_mbps, 0) AS "rx_mbps",
        COALESCE(b.tx_mbps, 0) AS "tx_mbps"
      FROM generate_series(
        ${from.toISOString()}::timestamp,
        ${to.toISOString()}::timestamp,
        interval '${intervalSec} seconds'
      ) AS gs
      LEFT JOIN LATERAL (
        SELECT rx_mbps, tx_mbps
        FROM "pppoe_bandwidth" b
        WHERE b.username = ${'<pppoe-' + username + '>'}
          AND b."recorded_at" >= gs
          AND b."recorded_at" < gs + interval '${intervalSec} seconds'
        ORDER BY b."recorded_at" ASC
        LIMIT 1
      ) b ON true
      ORDER BY gs ASC
    `;
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
    const status = typeof req.query.status === "string" ? req.query.status.trim().toLowerCase() : "All";
    const search = typeof req.query.search === "string" ? req.query.search.trim().toLowerCase() : "";
    const offset = (page - 1) * limit;
    const conn = await (0, mikrotik_1.getMikrotikConnection)();
    if (!conn) {
        return res.status(400).json({ message: "Mikrotik Connection Failed" });
    }
    try {
        const pppsecrets = await conn.write("/ppp/secret/print");
        const normalizedSearch = search?.toLowerCase();
        const filtered = pppsecrets.filter((secret) => {
            const matchesSearch = normalizedSearch
                ? [
                    secret.name,
                    secret.service,
                    secret.profile,
                ].some(field => field?.toLowerCase().includes(normalizedSearch))
                : true;
            const matchesStatus = status === "enabled"
                ? secret.disabled === "false"
                : status === "disabled"
                    ? secret.disabled === "true"
                    : true;
            return matchesSearch && matchesStatus;
        });
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
const updatePPPSecrets = async (req, res) => {
    const { id, providerId } = req.user;
    const { names, action } = req.body;
    // ids: string[] (e.g. ["*1", "*2"])
    // action: "delete" | "enable" | "disable"
    let conn;
    try {
        conn = await (0, mikrotik_1.getMikrotikConnection)();
        if (!conn) {
            return res.status(500).json({ message: "Failed to connect to MikroTik" });
        }
        for (const name of names) {
            const secrets = await conn.write("/ppp/secret/print", [`?name=${name}`]);
            const secretId = secrets[0]?.['.id'];
            if (!secretId) {
                console.warn(`Secret not found: ${name}`);
                continue;
            }
            let actionStr = '';
            switch (action) {
                case "delete":
                    actionStr = "deleted";
                    await conn.write("/ppp/secret/remove", [`=.id=${secretId}`]);
                    break;
                case "disable":
                    actionStr = "disabled";
                    await conn.write("/ppp/secret/disable", [`=.id=${secretId}`]);
                    const activeSession = await conn.write("/ppp/active/print", [`?name=${name}`]);
                    if (!activeSession[0]?.['.id'])
                        break;
                    else
                        await conn.write("/ppp/active/remove", [`=.id=${activeSession[0]['.id']}`]);
                    break;
                case "enable":
                    actionStr = "enabled";
                    await conn.write("/ppp/secret/enable", [`=.id=${secretId}`]);
                    break;
                default:
                    return res.status(400).json({ message: "Invalid action" });
            }
            await prisma_1.default.log.create({
                data: {
                    action: action.toUpperCase(),
                    entity: "Mikrotik",
                    userId: id,
                    providerId,
                    message: `Mikrotik PPP ${name} ${actionStr}`
                }
            });
        }
        await (0, mikrotik_1.closeMikrotikConnection)();
        return res.status(200).json({
            message: `PPP secrets ${action}d successfully`,
        });
    }
    catch (error) {
        if (conn)
            await (0, mikrotik_1.closeMikrotikConnection)();
        console.error(error);
        return res.status(500).json({
            message: "Internal Server Error",
        });
    }
};
exports.updatePPPSecrets = updatePPPSecrets;
//# sourceMappingURL=mikrotikContollers.js.map