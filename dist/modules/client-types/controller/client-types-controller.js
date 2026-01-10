"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatedClientType = exports.deleteClientType = exports.createClientType = exports.getClientTypes = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const getClientTypes = async (req, res) => {
    const { providerId } = req.user;
    if (!providerId) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    try {
        const clientTypes = await prisma.clientType.findMany({
            where: {
                providerId
            }
        });
        return res.status(200).json(clientTypes);
    }
    catch (error) {
        console.log(error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};
exports.getClientTypes = getClientTypes;
const createClientType = async (req, res) => {
    const { id: userId, providerId } = req.user;
    const { name } = req.body;
    try {
        const clientType = await prisma.clientType.create({
            data: {
                name,
                providerId
            }
        });
        // ---- LOG ACTION (non-blocking) ----
        prisma.log
            .create({
            data: {
                action: "CREATE",
                entity: "Client Type",
                userId,
                message: `Client Type ${clientType.name} created`,
                providerId,
            },
        })
            .catch(console.error);
        return res.status(201).json(clientType);
    }
    catch (error) {
        console.log(error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};
exports.createClientType = createClientType;
const deleteClientType = async (req, res) => {
    const { id: userId, providerId } = req.user;
    const { id } = req.params;
    try {
        const clientType = await prisma.clientType.findUnique({
            where: {
                id,
                providerId
            }
        });
        if (!clientType) {
            return res.status(404).json({ message: "Client type not found" });
        }
        await prisma.clientType.delete({
            where: {
                id,
                providerId
            }
        });
        // ---- LOG ACTION (non-blocking) ----
        prisma.log
            .create({
            data: {
                action: "DELETE",
                entity: "Client Type",
                userId,
                message: `Client Type ${clientType.name} deleted`,
                providerId,
            },
        })
            .catch(console.error);
        return res.status(200).json({ message: "Client type deleted successfully" });
    }
    catch (error) {
        console.log(error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};
exports.deleteClientType = deleteClientType;
const updatedClientType = async (req, res) => {
    const { id } = req.params;
    const { name } = req.body;
    const { id: userId, providerId } = req.user;
    try {
        const updatedClientType = await prisma.clientType.update({
            where: {
                id,
                providerId
            },
            data: {
                name
            }
        });
        // ---- LOG ACTION (non-blocking) ----
        prisma.log
            .create({
            data: {
                action: "UPDATE",
                entity: "Client Type",
                userId,
                message: `Client Type ${updatedClientType.name} updated`,
                providerId,
            },
        })
            .catch(console.error);
        return res.status(200).json(updatedClientType);
    }
    catch (error) {
        console.log(error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};
exports.updatedClientType = updatedClientType;
//# sourceMappingURL=client-types-controller.js.map