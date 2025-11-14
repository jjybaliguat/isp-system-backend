"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteServicePlan = exports.updateServicePlan = exports.createServicePlan = exports.getServicePlans = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const getServicePlans = async (req, res) => {
    const { providerId } = req.user;
    try {
        const servicePlans = await prisma.servicePlan.findMany({
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
            },
            orderBy: {
                speedMbps: "asc"
            }
        });
        return res.status(200).json(servicePlans);
    }
    catch (error) {
        console.log(error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};
exports.getServicePlans = getServicePlans;
const createServicePlan = async (req, res) => {
    const { providerId } = req.user;
    const { name, speedMbps, monthlyFee, descriptions } = req.body;
    if (!name || !speedMbps || !monthlyFee)
        return res.status(400).json({ message: "Missing required fields" });
    try {
        const servicePlan = await prisma.servicePlan.create({
            data: {
                name,
                monthlyFee,
                speedMbps,
                descriptions,
                providerId
            }
        });
        return res.status(200).json(servicePlan);
    }
    catch (error) {
        console.log(error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};
exports.createServicePlan = createServicePlan;
const updateServicePlan = async (req, res) => {
    const { providerId } = req.user;
    const { id } = req.params;
    const body = req.body;
    try {
        const updatedPlan = await prisma.servicePlan.update({
            where: {
                id,
                providerId
            },
            data: body
        });
        return res.status(200).json(exports.updateServicePlan);
    }
    catch (error) {
        console.log(error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};
exports.updateServicePlan = updateServicePlan;
const deleteServicePlan = async (req, res) => {
    const { providerId } = req.user;
    const { id } = req.params;
    try {
        await prisma.servicePlan.delete({
            where: {
                id,
                providerId
            }
        });
        return res.status(200).json({ message: "Service plan deleted successfully" });
    }
    catch (error) {
        console.log(error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};
exports.deleteServicePlan = deleteServicePlan;
//# sourceMappingURL=service-plan-controller.js.map