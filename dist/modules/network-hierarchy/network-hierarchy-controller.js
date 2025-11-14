"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteOdpPort = exports.deleteOdp = exports.deleteOdc = exports.deleteLcp = exports.deletePonPort = exports.deleteOlt = exports.unAssignOdpPort = exports.assignOdpPort = exports.createOdpPort = exports.createOdp = exports.createOdc = exports.createLcp = exports.createPonPort = exports.createOlt = exports.getNetworkHierarchy = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const getNetworkHierarchy = async (req, res) => {
    const { providerId } = req.user;
    try {
        const olts = await prisma.oLT.findMany({
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
                        },
                    },
                },
                lcps: {
                    include: {
                        odcs: {
                            include: {
                                odps: {
                                    include: {
                                        ports: {
                                            include: {
                                                client: true,
                                            },
                                        }
                                    },
                                },
                            },
                        },
                    },
                },
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
const createOlt = async (req, res) => {
    const { providerId } = req.user;
    const body = req.body;
    const { latitude, longitude, ponCount } = body;
    try {
        const olt = await prisma.oLT.create({
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
        await prisma.ponPort.createMany({
            data: ponPortsData,
        });
        return res.status(201).json(olt);
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};
exports.createOlt = createOlt;
const createPonPort = async (req, res) => {
    const { providerId } = req.user;
    const body = req.body;
    const { oltId } = body;
    const { portNumber } = body;
    try {
        const isPonPortExists = await prisma.ponPort.findFirst({
            where: {
                portNumber: Number(portNumber),
                oltId
            }
        });
        if (isPonPortExists)
            return res.status(400).json({ message: `Pon port number ${portNumber} already exists` });
        const ponPort = await prisma.ponPort.create({
            data: {
                ...body,
                portNumber: Number(portNumber)
            }
        });
        return res.status(201).json(ponPort);
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};
exports.createPonPort = createPonPort;
const createLcp = async (req, res) => {
    const { providerId } = req.user;
    const body = req.body;
    const { latitude, longitude, ponPortId } = body;
    const lat = Number(latitude);
    const lng = Number(longitude);
    try {
        const ponPort = await prisma.ponPort.findUnique({
            where: {
                id: ponPortId
            }
        });
        const lcp = await prisma.lCP.create({
            data: {
                ...body,
                latitude: lat,
                longitude: lng,
                ponPortId: ponPortId,
                oltId: ponPort?.oltId,
                providerId
            }
        });
        return res.status(201).json(lcp);
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};
exports.createLcp = createLcp;
const createOdc = async (req, res) => {
    const { providerId } = req.user;
    const body = req.body;
    const { latitude, longitude } = body;
    const lat = Number(latitude);
    const lng = Number(longitude);
    try {
        const odc = await prisma.oDC.create({
            data: {
                ...body,
                latitude: lat,
                longitude: lng,
                providerId
            }
        });
        return res.status(201).json(odc);
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};
exports.createOdc = createOdc;
const createOdp = async (req, res) => {
    const { providerId } = req.user;
    const body = req.body;
    const { latitude, longitude, portCount } = body;
    const lat = Number(latitude);
    const lng = Number(longitude);
    const count = Number(portCount);
    try {
        const odp = await prisma.oDP.create({
            data: {
                ...body,
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
        await prisma.odpPort.createMany({
            data: portsData,
        });
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
    try {
        const isPortExist = await prisma.odpPort.findFirst({
            where: {
                portNumber: Number(portNumber),
                odpId
            }
        });
        if (isPortExist) {
            return res.status(400).json({ message: `Odp Port ${portNumber} already exists.` });
        }
        const odpPort = await prisma.odpPort.create({
            data: {
                portNumber: Number(portNumber),
                odpId
            }
        });
        return res.status(201).json(odpPort);
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};
exports.createOdpPort = createOdpPort;
const assignOdpPort = async (req, res) => {
    const { clientId, portId } = req.body;
    try {
        const client = await prisma.client.findUnique({
            where: {
                id: clientId
            }
        });
        if (!client)
            return res.status(400).json({ message: "Client not found." });
        await prisma.odpPort.update({
            where: {
                id: portId
            },
            data: {
                clientId,
                status: "OCCUPIED"
            }
        });
        return res.status(200).json({ message: "Port assigned to client successfully" });
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};
exports.assignOdpPort = assignOdpPort;
const unAssignOdpPort = async (req, res) => {
    const { clientId } = req.body;
    try {
        await prisma.odpPort.update({
            where: {
                clientId
            },
            data: {
                clientId: null,
                status: "AVAILABLE"
            }
        });
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
        await prisma.oLT.delete({
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
        await prisma.ponPort.delete({
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
        await prisma.lCP.delete({
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
        await prisma.oDC.delete({
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
        await prisma.oDP.delete({
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
        await prisma.odpPort.delete({
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