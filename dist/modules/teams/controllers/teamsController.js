"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateTeam = exports.deleteTeam = exports.createTeam = exports.getTeams = void 0;
const prisma_1 = __importDefault(require("../../../utils/prisma"));
const getTeams = async (req, res) => {
    const { providerId } = req.user;
    try {
        const teams = await prisma_1.default.employeesTeam.findMany({
            where: {
                providerId
            },
            include: {
                employees: {
                    select: {
                        id: true,
                        fullName: true
                    }
                }
            }
        });
        return res.status(200).json(teams);
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};
exports.getTeams = getTeams;
const createTeam = async (req, res) => {
    const { teamName } = req.body;
    const { providerId } = req.user;
    try {
        const newTeam = await prisma_1.default.employeesTeam.create({
            data: {
                name: teamName,
                providerId
            }
        });
        res.status(201).json(newTeam);
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};
exports.createTeam = createTeam;
const deleteTeam = async (req, res) => {
    const { id } = req.params;
    const { id: userId, providerId } = req.user;
    try {
        await prisma_1.default.employeesTeam.delete({
            where: {
                id,
                providerId
            }
        });
        // implement logs
        res.status(200).json({ message: "Team deleted successfully" });
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};
exports.deleteTeam = deleteTeam;
const updateTeam = async (req, res) => {
    const { id } = req.params;
    const { teamName } = req.body;
    const { providerId } = req.user;
    try {
        const updateTeam = await prisma_1.default.employeesTeam.update({
            where: {
                id,
                providerId
            },
            data: {
                name: teamName
            }
        });
        // implement logs
        return res.status(200).json(updateTeam);
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};
exports.updateTeam = updateTeam;
//# sourceMappingURL=teamsController.js.map