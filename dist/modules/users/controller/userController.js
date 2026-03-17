"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.changePass = exports.deleteUser = exports.createUser = exports.getUsers = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma_1 = __importDefault(require("../../../utils/prisma"));
const getUsers = async (req, res) => {
    const { providerId } = req.user;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const roleFilter = typeof req.query.role === "string" && req.query.role !== "All"
        ? req.query.role
        : undefined;
    if (!providerId)
        return res.status(400).json({ message: "Unauthorized" });
    const skip = (page - 1) * limit;
    try {
        const whereClause = {
            providerId,
            ...(roleFilter && { role: roleFilter }),
            ...(search && {
                OR: [
                    { email: { contains: search, mode: 'insensitive' } },
                    { employee: { fullName: { contains: search, mode: 'insensitive' } } },
                    { client: { fullName: { contains: search, mode: 'insensitive' } } }
                ]
            })
        };
        const [users, total] = await Promise.all([
            prisma_1.default.user.findMany({
                where: whereClause,
                include: {
                    employee: {
                        select: {
                            id: true,
                            fullName: true,
                            team: {
                                select: {
                                    id: true,
                                    name: true
                                }
                            }
                        }
                    },
                    client: {
                        select: {
                            id: true,
                            fullName: true,
                            email: true
                        }
                    }
                },
                orderBy: { createdAt: "desc" },
                skip,
                take: limit
            }),
            prisma_1.default.user.count({ where: whereClause })
        ]);
        return res.status(200).json({
            data: users,
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
        return res.status(500).json({ message: "Internal server error" });
    }
};
exports.getUsers = getUsers;
const createUser = async (req, res) => {
    const { employeeId, clientId, role, password } = req.body;
    const { id: userId, providerId } = req.user;
    // 🚨 Validate source
    if ((!employeeId && !clientId) || (employeeId && clientId)) {
        return res.status(400).json({
            message: "Provide either employeeId or clientId (not both)"
        });
    }
    try {
        let source;
        let sourceField;
        /* ================= EMPLOYEE FLOW ================= */
        if (employeeId) {
            sourceField = "employeeId";
            source = await prisma_1.default.employees.findFirst({
                where: { id: employeeId, providerId }
            });
            if (!source) {
                return res.status(400).json({ message: "Employee not found" });
            }
            const isUserExist = await prisma_1.default.user.findFirst({
                where: { employeeId }
            });
            if (isUserExist) {
                return res.status(400).json({
                    message: "User for this employee already exists"
                });
            }
        }
        /* ================= CLIENT FLOW ================= */
        if (clientId) {
            sourceField = "clientId";
            source = await prisma_1.default.client.findFirst({
                where: { id: clientId, providerId }
            });
            if (!source) {
                return res.status(400).json({ message: "Client not found" });
            }
            const isUserExist = await prisma_1.default.user.findFirst({
                where: { clientId }
            });
            if (isUserExist) {
                return res.status(400).json({
                    message: "User for this client already exists"
                });
            }
        }
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        const newUser = await prisma_1.default.user.create({
            data: {
                email: source.email,
                fullName: source.fullName,
                role,
                password: hashedPassword,
                providerId,
                ...(employeeId && { employeeId }),
                ...(clientId && { clientId })
            }
        });
        // ---- LOG ACTION (non-blocking) ----
        prisma_1.default.log
            .create({
            data: {
                action: "CREATE",
                entity: "User",
                userId,
                message: `User ${newUser.email} created`,
                providerId
            }
        })
            .catch(console.error);
        return res.status(201).json(newUser);
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};
exports.createUser = createUser;
const deleteUser = async (req, res) => {
    const { id } = req.params;
    const { id: userId, providerId } = req.user;
    try {
        const user = await prisma_1.default.user.findUnique({
            where: {
                id,
                providerId
            }
        });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        await prisma_1.default.user.delete({
            where: {
                id,
                providerId
            }
        });
        // ---- LOG ACTION (non-blocking) ----
        prisma_1.default.log
            .create({
            data: {
                action: "DELETE",
                entity: "User",
                userId,
                message: `User ${user.email} deleted`,
                providerId,
            },
        })
            .catch(console.error);
        return res.status(200).json({ message: "User deleted successfully" });
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};
exports.deleteUser = deleteUser;
const changePass = async (req, res) => {
    const { id } = req.params;
    const { currentPassword, newPassword } = req.body;
    try {
        const user = await prisma_1.default.user.findUnique({
            where: {
                id
            },
            select: {
                password: true
            }
        });
        if (user) {
            const isCurrentPasswordMatched = await bcryptjs_1.default.compare(currentPassword, user?.password);
            if (!isCurrentPasswordMatched) {
                return res.status(400).json({ message: "Invalid current password" });
            }
            const newPasswordHashed = await bcryptjs_1.default.hash(newPassword, 10);
            await prisma_1.default.user.update({
                where: {
                    id
                },
                data: {
                    password: newPasswordHashed
                }
            });
            return res.status(200).json({ message: "Password updated successfully" });
        }
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};
exports.changePass = changePass;
//# sourceMappingURL=userController.js.map