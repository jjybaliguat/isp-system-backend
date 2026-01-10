"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCoverage = exports.updateCoverage = exports.createCoverage = exports.getCoverage = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const getCoverage = async (req, res) => {
    const { providerId } = req.user;
    try {
        const coverage = await prisma.coverage.findMany({
            where: {
                providerId
            },
            include: {
                clients: {
                    select: {
                        id: true,
                        fullName: true
                    }
                }
            }
        });
        return res.status(200).json(coverage);
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};
exports.getCoverage = getCoverage;
const createCoverage = async (req, res) => {
    const { name, latitude, longitude, radius } = req.body;
    if (!name || !latitude || !longitude)
        return res.status(400).json({ message: "Missing required fields" });
    const { id: userId, providerId } = req.user;
    try {
        const coverage = await prisma.coverage.create({
            data: {
                name,
                latitude,
                longitude,
                radius,
                providerId
            }
        });
        // ---- LOG ACTION (non-blocking) ----
        prisma.log
            .create({
            data: {
                action: "CREATE",
                entity: "Coverage",
                userId,
                message: `Coverage ${coverage.name} created`,
                providerId,
            },
        })
            .catch(console.error);
        return res.status(201).json(coverage);
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};
exports.createCoverage = createCoverage;
const updateCoverage = async (req, res) => {
    const { id } = req.params;
    const body = req.body;
    const { id: userId, providerId } = req.user;
    try {
        const updatedCoverage = await prisma.coverage.update({
            where: {
                id,
                providerId
            },
            data: body
        });
        // ---- LOG ACTION (non-blocking) ----
        prisma.log
            .create({
            data: {
                action: "UPDATE",
                entity: "Coverage",
                userId,
                message: `Coverage ${updatedCoverage.name} updated`,
                providerId,
            },
        })
            .catch(console.error);
        return res.status(200).json(updatedCoverage);
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};
exports.updateCoverage = updateCoverage;
const deleteCoverage = async (req, res) => {
    const { id } = req.params;
    const { id: userId, providerId } = req.user;
    try {
        const coverage = await prisma.coverage.findUnique({
            where: {
                id
            }
        });
        if (!coverage) {
            return res.status(404).json({ message: "Coverage not found" });
        }
        await prisma.coverage.delete({
            where: {
                id
            }
        });
        // ---- LOG ACTION (non-blocking) ----
        prisma.log
            .create({
            data: {
                action: "DELETE",
                entity: "Coverage",
                userId,
                message: `Coverage ${coverage.name} deleted`,
                providerId,
            },
        })
            .catch(console.error);
        return res.status(200).json({ message: "Coverage deleted successfully" });
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};
exports.deleteCoverage = deleteCoverage;
//# sourceMappingURL=coverageController.js.map