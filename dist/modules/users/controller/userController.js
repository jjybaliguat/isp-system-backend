"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.changePass = exports.deleteUser = exports.createUser = exports.getUsers = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const getUsers = async (req, res) => {
    const { providerId } = req.user;
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    console.log(search);
    if (!providerId)
        return res.status(400).json({ message: "Unauthorized" });
    try {
        const users = await prisma.user.findMany({
            where: {
                providerId,
                OR: [
                    { email: { contains: search, mode: 'insensitive' } },
                    { employee: { fullName: { contains: search, mode: 'insensitive' } } }
                ]
            },
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
                }
            },
            orderBy: { createdAt: "asc" }
        });
        return res.status(200).json(users);
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};
exports.getUsers = getUsers;
const createUser = async (req, res) => {
    const { employeeId, role, password } = req.body;
    const { providerId } = req.user;
    try {
        const employee = await prisma.employees.findUnique({
            where: { id: employeeId, providerId }
        });
        if (!employee) {
            return res.status(400).json({ message: "Employee not found" });
        }
        const isUserExist = await prisma.user.findUnique({
            where: { employeeId }
        });
        if (isUserExist) {
            return res.status(400).json({ message: "User for this employee already exists" });
        }
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        const newUser = await prisma.user.create({
            data: {
                email: employee.email,
                fullName: employee.fullName,
                employeeId,
                role,
                password: hashedPassword,
                providerId
            }
        });
        return res.status(201).json(newUser);
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};
exports.createUser = createUser;
const deleteUser = async (req, res) => {
    const { id } = req.params;
    const { providerId } = req.user;
    try {
        await prisma.user.delete({
            where: {
                id,
                providerId
            }
        });
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
        const user = await prisma.user.findUnique({
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
            await prisma.user.update({
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