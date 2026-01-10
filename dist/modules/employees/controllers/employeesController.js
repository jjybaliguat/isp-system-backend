"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteEmployee = exports.updateEmployee = exports.createEmployee = exports.getEmployees = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const getEmployees = async (req, res) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const status = typeof req.query.status === "string" && req.query.status !== "all"
        ? req.query.status
        : undefined;
    const providerId = req.user.providerId;
    const skip = (page - 1) * limit;
    if (!providerId)
        return res.status(400).json({ message: "Unauthorized" });
    try {
        const whereClause = {
            providerId
        };
        if (status)
            whereClause.status = status;
        if (search) {
            whereClause.OR = [
                {
                    fullName: { contains: search, mode: 'insensitive' }
                },
                {
                    phoneNumber: { contains: search, mode: 'insensitive' }
                },
                {
                    email: { contains: search, mode: 'insensitive' }
                }
            ];
        }
        const [data, total] = await Promise.all([
            prisma.employees.findMany({
                where: whereClause,
                include: {
                    team: {
                        select: {
                            id: true,
                            name: true
                        }
                    }
                },
                orderBy: { createdAt: "desc" },
                skip,
                take: limit,
            }),
            prisma.employees.count({
                where: whereClause
            })
        ]);
        return res.status(200).json({
            data,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        });
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};
exports.getEmployees = getEmployees;
const createEmployee = async (req, res) => {
    const { fullName, email, phoneNumber, address, role, teamId, hireDate, status } = req.body;
    const { providerId, role: userRole, id: userId } = req.user;
    const dateHired = new Date(hireDate);
    if (isNaN(dateHired.getTime()))
        return res.status(400).json({ message: "Hired date is not a valid date" });
    if (userRole !== "SUPERADMIN")
        res.status(401).json({ message: "You are not allowed to perform this operation" });
    if (!fullName || !email || !phoneNumber || !address || !role || !hireDate) {
        return res.status(400).json({ message: "Missing required fields" });
    }
    const isEmailExist = await prisma.employees.findUnique({
        where: {
            email: email
        }
    });
    if (isEmailExist)
        return res.status(400).json({ message: "Email already exists" });
    try {
        const user = await prisma.user.findUnique({
            where: {
                id: userId
            }
        });
        const newEmployee = await prisma.employees.create({
            data: {
                fullName,
                email,
                phoneNumber,
                address,
                role,
                teamId: teamId || null,
                hireDate: dateHired,
                status,
                providerId
            }
        });
        await prisma.log.create({
            data: {
                action: "CREATE",
                entity: "Employee",
                message: `Employee ${newEmployee.fullName} created by ${user?.fullName}`,
                providerId: providerId,
                userId
            }
        });
        res.status(201).json(newEmployee);
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};
exports.createEmployee = createEmployee;
const updateEmployee = async (req, res) => {
    const { id } = req.params;
    const { id: userId, providerId } = req.user;
    const { fullName, email, address, phoneNumber, role, hireDate, status, teamId } = req.body;
    const dataToUpdate = {};
    if (fullName !== undefined)
        dataToUpdate.fullName = fullName;
    if (email !== undefined)
        dataToUpdate.email = email;
    if (address !== undefined)
        dataToUpdate.address = address;
    if (phoneNumber !== undefined)
        dataToUpdate.phoneNumber = phoneNumber;
    if (role !== undefined)
        dataToUpdate.role = role;
    if (status !== undefined)
        dataToUpdate.status = status;
    if (teamId !== undefined)
        dataToUpdate.teamId = teamId || null;
    // Handle hireDate separately since it needs validation
    if (hireDate !== undefined) {
        const dateHired = new Date(hireDate);
        if (isNaN(dateHired.getTime())) {
            return res.status(400).json({ message: "Hire Date is invalid" });
        }
        dataToUpdate.hireDate = dateHired;
    }
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId }
        });
        const updatedEmployee = await prisma.employees.update({
            where: { id, providerId },
            data: dataToUpdate
        });
        await prisma.log.create({
            data: {
                userId,
                providerId,
                entity: "Employee",
                action: "UPDATE",
                message: `Employee ${updatedEmployee.fullName} updated by ${user?.fullName}`
            }
        });
        return res.status(200).json(updatedEmployee);
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};
exports.updateEmployee = updateEmployee;
const deleteEmployee = async (req, res) => {
    const { id } = req.params;
    const { id: userId, providerId } = req.user;
    try {
        const user = await prisma.user.findUnique({
            where: {
                id: userId
            }
        });
        const employee = await prisma.employees.findUnique({
            where: {
                id
            }
        });
        await prisma.employees.delete({
            where: {
                id,
                providerId
            }
        });
        await prisma.log.create({
            data: {
                entity: "Employee",
                action: "DELETE",
                message: `Employee ${employee?.fullName} delete by ${user?.fullName}`,
                userId,
                providerId
            }
        });
        return res.status(200).json({ message: "Employee deleted successfully" });
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};
exports.deleteEmployee = deleteEmployee;
//# sourceMappingURL=employeesController.js.map