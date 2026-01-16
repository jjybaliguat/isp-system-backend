"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteApplicant = exports.updateApplicant = exports.createApplicant = exports.getApplicationStatus = exports.getApplicant = exports.getApplicantsCount = exports.getApplicants = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const getApplicants = async (req, res) => {
    const { providerId } = req.user;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const status = typeof req.query.status === "string" && req.query.status.toLowerCase() !== "all"
        ? req.query.status
        : undefined;
    const skip = (page - 1) * limit;
    try {
        const where = { providerId };
        if (status) {
            where.applicationStatus = status;
        }
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { applicationNumber: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search, mode: 'insensitive' } },
            ];
        }
        const [data, total] = await Promise.all([
            prisma.applicant.findMany({
                where,
                include: { coverage: true, servicePlan: true },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma.applicant.count({ where }),
        ]);
        return res.status(200).json({
            data,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit) || 0,
            },
        });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};
exports.getApplicants = getApplicants;
const getApplicantsCount = async (req, res) => {
    const { providerId } = req.user;
    try {
        const pendingApplicantsCount = await prisma.applicant.count({
            where: {
                providerId,
                applicationStatus: {
                    notIn: ["INSTALLED", "CANCELLED", "REJECTED"]
                }
            }
        });
        return res.status(200).json(pendingApplicantsCount);
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};
exports.getApplicantsCount = getApplicantsCount;
const getApplicant = async (req, res) => {
    const { id } = req.params;
    const { providerId } = req.user;
    try {
        const applicantInclude = { applicationDocuments: true, coverage: true, servicePlan: true };
        const applicant = await prisma.applicant.findFirst({
            where: { id, providerId },
            include: applicantInclude,
        });
        if (!applicant)
            return res.status(404).json({ message: 'Applicant not found' });
        return res.status(200).json(applicant);
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};
exports.getApplicant = getApplicant;
const getApplicationStatus = async (req, res) => {
    const applicationNumber = req.query.applicationNumber;
    try {
        if (!applicationNumber)
            return res.status(400).json({ message: "Missing application number" });
        const applicant = await prisma.applicant.findUnique({
            where: {
                applicationNumber
            },
            include: {
                servicePlan: {
                    select: {
                        name: true
                    }
                },
                coverage: {
                    select: {
                        name: true
                    }
                }
            }
        });
        return res.status(200).json(applicant);
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};
exports.getApplicationStatus = getApplicationStatus;
const createApplicant = async (req, res) => {
    const { providerId, name, email, phone, address, servicePlanId, coverageId, notes, idType, idCardNumber, applicationNumber } = req.body;
    if (!name || !email)
        return res.status(400).json({ message: 'Missing required fields' });
    try {
        const existing = await prisma.applicant.findUnique({ where: { email } });
        if (existing)
            return res.status(400).json({ message: 'Applicant with this email already exists' });
        // generate application number if not provided
        const appNumber = applicationNumber || `APP-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
        const data = {
            name,
            email,
            phone,
            address,
            notes,
            servicePlanId,
            coverageId,
            providerId,
            idCardNumber,
            idType,
            applicationNumber: appNumber,
        };
        const applicant = await prisma.applicant.create({ data });
        prisma.log.create({
            data: {
                action: 'CREATE',
                entity: 'Applicant',
                message: `Applicant ${applicant.name} created`,
                providerId,
            },
        }).catch(console.error);
        return res.status(201).json(applicant);
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};
exports.createApplicant = createApplicant;
const updateApplicant = async (req, res) => {
    const { id } = req.params;
    const body = req.body;
    const { id: userId, providerId } = req.user;
    try {
        const existing = await prisma.applicant.findUnique({ where: { id } });
        if (!existing)
            return res.status(404).json({ message: 'Applicant not found' });
        const updated = await prisma.applicant.update({ where: { id }, data: body });
        prisma.log.create({
            data: {
                action: 'UPDATE',
                entity: 'Applicant',
                userId,
                message: `Applicant ${updated.name} updated`,
                providerId,
            },
        }).catch(console.error);
        return res.status(200).json(updated);
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};
exports.updateApplicant = updateApplicant;
const deleteApplicant = async (req, res) => {
    const { id } = req.params;
    const { id: userId, providerId } = req.user;
    try {
        const applicant = await prisma.applicant.findUnique({ where: { id } });
        if (!applicant)
            return res.status(404).json({ message: 'Applicant not found' });
        await prisma.applicant.delete({ where: { id } });
        prisma.log.create({
            data: {
                action: 'DELETE',
                entity: 'Applicant',
                userId,
                message: `Applicant ${applicant.name} deleted`,
                providerId,
            },
        }).catch(console.error);
        return res.status(200).json({ message: 'Applicant deleted successfully' });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};
exports.deleteApplicant = deleteApplicant;
exports.default = {};
//# sourceMappingURL=applicantController.js.map