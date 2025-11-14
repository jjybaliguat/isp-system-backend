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
    const { providerId } = req.user;
    const { name } = req.body;
    try {
        const clientType = await prisma.clientType.create({
            data: {
                name,
                providerId
            }
        });
        return res.status(201).json(clientType);
    }
    catch (error) {
        console.log(error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};
exports.createClientType = createClientType;
const deleteClientType = async (req, res) => {
    const { providerId } = req.user;
    const { id } = req.params;
    try {
        await prisma.clientType.delete({
            where: {
                id,
                providerId
            }
        });
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
    try {
        const updatedClientType = await prisma.clientType.update({
            where: {
                id
            },
            data: {
                name
            }
        });
        return res.status(200).json(updatedClientType);
    }
    catch (error) {
        console.log(error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};
exports.updatedClientType = updatedClientType;
//# sourceMappingURL=client-types-controller.js.map