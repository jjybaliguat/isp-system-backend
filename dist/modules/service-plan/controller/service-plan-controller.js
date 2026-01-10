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
    const { name, speedMbps, monthlyFee, descriptions } = req.body;
    const { id: userId, providerId } = req.user;
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
        // ---- LOG ACTION (non-blocking) ----
        prisma.log
            .create({
            data: {
                action: "CREATE",
                entity: "Service Plan",
                userId,
                message: `Service Plan ${servicePlan.name} created`,
                providerId,
            },
        })
            .catch(console.error);
        return res.status(200).json(servicePlan);
    }
    catch (error) {
        console.log(error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};
exports.createServicePlan = createServicePlan;
const updateServicePlan = async (req, res) => {
    const { id: userId, providerId } = req.user;
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
        // ---- LOG ACTION (non-blocking) ----
        prisma.log
            .create({
            data: {
                action: "UPDATE",
                entity: "Service Plan",
                userId,
                message: `Service Plan ${updatedPlan.name} updated`,
                providerId,
            },
        })
            .catch(console.error);
        return res.status(200).json(updatedPlan);
    }
    catch (error) {
        console.log(error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};
exports.updateServicePlan = updateServicePlan;
const deleteServicePlan = async (req, res) => {
    const { id: userId, providerId } = req.user;
    const { id } = req.params;
    try {
        const servicePlan = await prisma.servicePlan.findUnique({
            where: {
                id,
                providerId
            }
        });
        if (!servicePlan)
            return res.status(404).json({ message: "Service plan not found" });
        await prisma.servicePlan.delete({
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
                entity: "Service Plan",
                userId,
                message: `Service Plan ${servicePlan.name} deleted`,
                providerId,
            },
        })
            .catch(console.error);
        return res.status(200).json({ message: "Service plan deleted successfully" });
    }
    catch (error) {
        console.log(error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};
exports.deleteServicePlan = deleteServicePlan;
//# sourceMappingURL=service-plan-controller.js.map