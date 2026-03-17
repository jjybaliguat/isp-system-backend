"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteOdpPort = exports.deleteOdp = exports.deleteOdc = exports.deleteLcp = exports.deletePonPort = exports.deleteOlt = exports.unAssignOdpPort = exports.assignOdpPort = exports.createOdpPort = exports.createOdp = exports.createOdc = exports.createLcp = exports.createPonPort = exports.createOlt = exports.getOdpPort = exports.getOdpPorts = exports.getOdps = exports.getNetworkHierarchy = void 0;
const prisma_1 = __importDefault(require("../../utils/prisma"));
const getNetworkHierarchy = async (req, res) => {
    const { providerId } = req.user;
    try {
        const olts = await prisma_1.default.oLT.findMany({
            where: {
                providerId,
            },
            orderBy: {
                createdAt: "asc"
            },
            include: {
                ponPorts: {
                    include: {
                        lcps: {
                            include: {
                                odcs: {
                                    include: {
                                        odps: {
                                            include: {
                                                ports: {
                                                    include: {
                                                        client: true,
                                                        account: {
                                                            include: {
                                                                client: true
                                                            }
                                                        }
                                                    },
                                                    orderBy: {
                                                        portNumber: 'asc'
                                                    }
                                                }
                                            },
                                        },
                                    }
                                },
                                odps: {
                                    include: {
                                        ports: {
                                            include: {
                                                client: true,
                                                account: {
                                                    include: {
                                                        client: true
                                                    }
                                                }
                                            },
                                            orderBy: {
                                                portNumber: 'asc'
                                            }
                                        }
                                    },
                                },
                            },
                        },
                    },
                }
            },
        });
        return res.status(200).json(olts);
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};
exports.getNetworkHierarchy = getNetworkHierarchy;
const getOdps = async (req, res) => {
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const { providerId } = req.user;
    try {
        const odps = await prisma_1.default.oDP.findMany({
            where: {
                providerId,
                odpCode: {
                    contains: search,
                    mode: "insensitive"
                }
            }
        });
        return res.status(200).json(odps);
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};
exports.getOdps = getOdps;
const getOdpPorts = async (req, res) => {
    const odpId = typeof req.query.odpId === "string" ? req.query.odpId.trim() : "";
    const { providerId } = req.user;
    try {
        const odpPorts = await prisma_1.default.odpPort.findMany({
            where: {
                odp: {
                    id: odpId,
                    providerId
                }
            },
            include: {
                odp: true
            },
            orderBy: {
                portNumber: "asc"
            }
        });
        return res.status(200).json(odpPorts);
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};
exports.getOdpPorts = getOdpPorts;
const getOdpPort = async (req, res) => {
    const accountId = typeof req.query.odpId === "string" ? req.query.odpId.trim() : "";
    const { providerId } = req.user;
    try {
        const odpPort = await prisma_1.default.odpPort.findUnique({
            where: {
                accountId
            }
        });
        return res.status(200).json(odpPort);
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};
exports.getOdpPort = getOdpPort;
const createOlt = async (req, res) => {
    const { id: userId, providerId } = req.user;
    const body = req.body;
    const { latitude, longitude, ponCount } = body;
    try {
        const olt = await prisma_1.default.oLT.create({
            data: {
                ...body,
                latitude: Number(latitude),
                longitude: Number(longitude),
                ponCount: Number(ponCount),
                providerId
            }
        });
        const ponPortsData = Array.from({ length: Number(ponCount) }, (_, i) => ({
            portNumber: i + 1,
            oltId: olt.id,
        }));
        await prisma_1.default.ponPort.createMany({
            data: ponPortsData,
        });
        // ---- LOG ACTION (non-blocking) ----
        prisma_1.default.log
            .create({
            data: {
                action: "CREATE",
                entity: "Network",
                userId,
                message: `Network OLT created`,
                providerId,
            },
        })
            .catch(console.error);
        return res.status(201).json(olt);
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};
exports.createOlt = createOlt;
const createPonPort = async (req, res) => {
    const { id: userId, providerId } = req.user;
    const body = req.body;
    const { oltId } = body;
    const { portNumber } = body;
    try {
        const isPonPortExists = await prisma_1.default.ponPort.findFirst({
            where: {
                portNumber: Number(portNumber),
                oltId
            }
        });
        if (isPonPortExists)
            return res.status(400).json({ message: `Pon port number ${portNumber} already exists` });
        const ponPort = await prisma_1.default.ponPort.create({
            data: {
                ...body,
                portNumber: Number(portNumber)
            }
        });
        // ---- LOG ACTION (non-blocking) ----
        prisma_1.default.log
            .create({
            data: {
                action: "CREATE",
                entity: "Network",
                userId,
                message: `Network PON Port created`,
                providerId,
            },
        })
            .catch(console.error);
        return res.status(201).json(ponPort);
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};
exports.createPonPort = createPonPort;
const createLcp = async (req, res) => {
    const { id: userId, providerId } = req.user;
    const body = req.body;
    const { latitude, longitude, ponPortId } = body;
    const lat = Number(latitude);
    const lng = Number(longitude);
    try {
        const ponPort = await prisma_1.default.ponPort.findUnique({
            where: {
                id: ponPortId
            }
        });
        const lcp = await prisma_1.default.lCP.create({
            data: {
                ...body,
                latitude: lat,
                longitude: lng,
                ponPortId: ponPortId,
                oltId: ponPort?.oltId,
                providerId
            }
        });
        // ---- LOG ACTION (non-blocking) ----
        prisma_1.default.log
            .create({
            data: {
                action: "CREATE",
                entity: "Network",
                userId,
                message: `Network LCP created`,
                providerId,
            },
        })
            .catch(console.error);
        return res.status(201).json(lcp);
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};
exports.createLcp = createLcp;
const createOdc = async (req, res) => {
    const { id: userId, providerId } = req.user;
    const body = req.body;
    const { latitude, longitude } = body;
    const lat = Number(latitude);
    const lng = Number(longitude);
    try {
        const odc = await prisma_1.default.oDC.create({
            data: {
                ...body,
                latitude: lat,
                longitude: lng,
                providerId
            }
        });
        // ---- LOG ACTION (non-blocking) ----
        prisma_1.default.log
            .create({
            data: {
                action: "CREATE",
                entity: "Network",
                userId,
                message: `Network ODC created`,
                providerId,
            },
        })
            .catch(console.error);
        return res.status(201).json(odc);
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};
exports.createOdc = createOdc;
const createOdp = async (req, res) => {
    const { id: userId, providerId } = req.user;
    const body = req.body;
    const { latitude, longitude, portCount } = body;
    const { odcId, lcpId } = body;
    const lat = Number(latitude);
    const lng = Number(longitude);
    const count = Number(portCount);
    try {
        const lcp = await prisma_1.default.lCP.findUnique({
            where: {
                id: lcpId
            }
        });
        const odc = await prisma_1.default.oDC.findUnique({
            where: {
                id: odcId
            }
        });
        const odp = await prisma_1.default.oDP.create({
            data: {
                ...body,
                odcId: odc ? odc.id : undefined,
                lcpId: lcp ? lcp.id : undefined,
                latitude: lat,
                longitude: lng,
                portCount: count,
                providerId
            }
        });
        const portsData = Array.from({ length: count }, (_, i) => ({
            portNumber: i + 1,
            odpId: odp.id,
        }));
        await prisma_1.default.odpPort.createMany({
            data: portsData,
        });
        // ---- LOG ACTION (non-blocking) ----
        prisma_1.default.log
            .create({
            data: {
                action: "CREATE",
                entity: "Network",
                userId,
                message: `Network ODP created`,
                providerId,
            },
        })
            .catch(console.error);
        return res.status(201).json(odp);
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};
exports.createOdp = createOdp;
const createOdpPort = async (req, res) => {
    const { portNumber, odpId } = req.body;
    const { id: userId, providerId } = req.user;
    try {
        const isPortExist = await prisma_1.default.odpPort.findFirst({
            where: {
                portNumber: Number(portNumber),
                odpId
            }
        });
        if (isPortExist) {
            return res.status(400).json({ message: `Odp Port ${portNumber} already exists.` });
        }
        const odpPort = await prisma_1.default.odpPort.create({
            data: {
                portNumber: Number(portNumber),
                odpId
            }
        });
        // ---- LOG ACTION (non-blocking) ----
        prisma_1.default.log
            .create({
            data: {
                action: "CREATE",
                entity: "Network",
                userId,
                message: `Network ODP Port created`,
                providerId,
            },
        })
            .catch(console.error);
        return res.status(201).json(odpPort);
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};
exports.createOdpPort = createOdpPort;
const assignOdpPort = async (req, res) => {
    const { accountId, portId } = req.body;
    const { id: userId, providerId } = req.user;
    try {
        const account = await prisma_1.default.accounts.findUnique({
            where: {
                id: accountId
            },
            include: {
                client: {
                    select: {
                        fullName: true
                    }
                }
            }
        });
        if (!account)
            return res.status(400).json({ message: "Client not found." });
        const odpPort = await prisma_1.default.odpPort.update({
            where: {
                id: portId
            },
            data: {
                accountId,
                status: "OCCUPIED"
            },
            include: {
                odp: {
                    select: {
                        odpCode: true
                    }
                }
            }
        });
        // ---- LOG ACTION (non-blocking) ----
        prisma_1.default.log
            .create({
            data: {
                action: "ASSIGN",
                entity: "Network",
                userId,
                message: `Network ODP ${odpPort.odp.odpCode} Port ${odpPort.portNumber} assigned to client ${account.client.fullName}`,
                providerId,
            },
        })
            .catch(console.error);
        return res.status(200).json({ message: "Port assigned to client successfully" });
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};
exports.assignOdpPort = assignOdpPort;
const unAssignOdpPort = async (req, res) => {
    const { accountId } = req.body;
    const { id: userId, providerId } = req.user;
    try {
        const odpPort = await prisma_1.default.odpPort.findUnique({
            where: {
                accountId
            },
            include: {
                account: {
                    include: {
                        client: true
                    }
                }
            }
        });
        if (!odpPort) {
            return res.status(400).json({ message: "ODP Port not found." });
        }
        const odpPortUpdated = await prisma_1.default.odpPort.update({
            where: {
                accountId
            },
            data: {
                clientId: null,
                accountId: null,
                status: "AVAILABLE"
            },
            include: {
                odp: {
                    select: {
                        odpCode: true
                    }
                }
            }
        });
        // ---- LOG ACTION (non-blocking) ----
        prisma_1.default.log
            .create({
            data: {
                action: "UNASSIGN",
                entity: "Network",
                userId,
                message: `Network ODP ${odpPortUpdated.odp.odpCode} Port ${odpPortUpdated.portNumber} unassigned to client ${odpPort.account?.client.fullName}`,
                providerId,
            },
        })
            .catch(console.error);
        return res.status(200).json({ message: "Port unassigned to client successfully" });
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};
exports.unAssignOdpPort = unAssignOdpPort;
const deleteOlt = async (req, res) => {
    const { id } = req.params;
    try {
        await prisma_1.default.oLT.delete({
            where: {
                id
            }
        });
        return res.status(200).json({ message: "Olt delete successfully" });
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};
exports.deleteOlt = deleteOlt;
const deletePonPort = async (req, res) => {
    const { id } = req.params;
    try {
        await prisma_1.default.ponPort.delete({
            where: {
                id
            }
        });
        return res.status(200).json({ message: "Olt delete successfully" });
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};
exports.deletePonPort = deletePonPort;
const deleteLcp = async (req, res) => {
    const { id } = req.params;
    try {
        await prisma_1.default.lCP.delete({
            where: {
                id
            }
        });
        return res.status(200).json({ message: "Olt delete successfully" });
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};
exports.deleteLcp = deleteLcp;
const deleteOdc = async (req, res) => {
    const { id } = req.params;
    try {
        await prisma_1.default.oDC.delete({
            where: {
                id
            }
        });
        return res.status(200).json({ message: "Olt delete successfully" });
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};
exports.deleteOdc = deleteOdc;
const deleteOdp = async (req, res) => {
    const { id } = req.params;
    try {
        await prisma_1.default.oDP.delete({
            where: {
                id
            }
        });
        return res.status(200).json({ message: "Olt delete successfully" });
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};
exports.deleteOdp = deleteOdp;
const deleteOdpPort = async (req, res) => {
    const { id } = req.params;
    console.log(id);
    try {
        await prisma_1.default.odpPort.delete({
            where: {
                id
            }
        });
        return res.status(200).json({ message: "Olt delete successfully" });
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};
exports.deleteOdpPort = deleteOdpPort;
//# sourceMappingURL=network-hierarchy-controller.js.map