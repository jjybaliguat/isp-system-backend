"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCoverage = exports.updateCoverage = exports.createCoverage = exports.getCoverage = void 0;
const prisma_1 = __importDefault(require("../../../utils/prisma"));
const getCoverage = async (req, res) => {
    const { providerId } = req.user;
    try {
        const coverage = await prisma_1.default.coverage.findMany({
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
        const coverage = await prisma_1.default.coverage.create({
            data: {
                name,
                latitude,
                longitude,
                radius,
                providerId
            }
        });
        // ---- LOG ACTION (non-blocking) ----
        prisma_1.default.log
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
        const updatedCoverage = await prisma_1.default.coverage.update({
            where: {
                id,
                providerId
            },
            data: body
        });
        // ---- LOG ACTION (non-blocking) ----
        prisma_1.default.log
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
        const coverage = await prisma_1.default.coverage.findUnique({
            where: {
                id
            }
        });
        if (!coverage) {
            return res.status(404).json({ message: "Coverage not found" });
        }
        await prisma_1.default.coverage.delete({
            where: {
                id
            }
        });
        // ---- LOG ACTION (non-blocking) ----
        prisma_1.default.log
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