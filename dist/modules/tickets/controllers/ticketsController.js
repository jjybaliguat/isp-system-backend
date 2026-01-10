"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAssignedTickets = exports.deleteTicketComment = exports.getTicketComments = exports.createTicketComment = exports.deleteTicket = exports.getTicketLogs = exports.updateTicket = exports.createTicket = exports.getTickets = void 0;
const extract_image_from_markdown_1 = require("../../../utils/extract-image-from-markdown");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const imageSizeLimiter_1 = require("../../../middlewares/imageSizeLimiter");
const multer_1 = __importDefault(require("multer"));
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const getTickets = async (req, res) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const month = typeof req.query.month === "string" ? req.query.month : undefined;
    const year = typeof req.query.year === "string" ? req.query.year : undefined;
    const providerId = req.user.providerId;
    const skip = (page - 1) * limit;
    if (!providerId)
        return res.status(400).json({ message: "Unauthorized" });
    try {
        const whereClause = {
            providerId
        };
        if (month && year) {
            const startDate = new Date(Number(year), Number(month) - 1, 1);
            const endDate = new Date(Number(year), Number(month), 0, 23, 59, 59);
            whereClause.createdAt = {
                gte: startDate,
                lte: endDate,
            };
        }
        if (search) {
            whereClause.OR = [
                {
                    subject: { contains: search, mode: 'insensitive' }
                },
                {
                    description: { contains: search, mode: 'insensitive' }
                },
                {
                    client: {
                        fullName: { contains: search, mode: 'insensitive' }
                    }
                }
            ];
        }
        const [data, total] = await Promise.all([
            prisma.ticket.findMany({
                where: whereClause,
                include: {
                    client: {
                        select: {
                            id: true,
                            fullName: true
                        }
                    },
                    assignedToTeam: {
                        select: {
                            id: true,
                            name: true
                        }
                    },
                    assignedToEmployee: {
                        select: {
                            id: true,
                            fullName: true
                        }
                    }
                },
                orderBy: { createdAt: "desc" },
                skip,
                take: limit,
            }),
            prisma.ticket.count({
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
exports.getTickets = getTickets;
const createTicket = async (req, res) => {
    const body = req.body;
    const { dueDate } = body;
    const { id: userId, providerId } = req.user;
    try {
        let parsedDueDate = null;
        if (dueDate) {
            const dateValue = new Date(dueDate);
            if (!isNaN(dateValue.getTime())) {
                parsedDueDate = dateValue;
            }
            else {
                return res.status(400).json({ error: "Invalid dueDate format" });
            }
        }
        const ticket = await prisma.ticket.create({
            data: {
                ...body,
                dueDate: parsedDueDate,
                providerId,
                createdById: userId
            }
        });
        // ---- LOG ACTION (non-blocking) ----
        prisma.log
            .create({
            data: {
                action: "CREATE",
                entity: "Ticket",
                userId,
                message: `Ticket ${ticket.subject} created`,
                providerId,
            },
        })
            .catch(console.error);
        return res.status(200).json(ticket);
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};
exports.createTicket = createTicket;
const updateTicket = async (req, res) => {
    const body = req.body;
    const { id } = req.params;
    const { id: userId, providerId } = req.user;
    const { assignedToTeamId, assignedToEmployeeId } = body;
    console.log("Request Body:", body);
    try {
        // Get the existing ticket first
        const ticket = await prisma.ticket.findUnique({
            where: { id, providerId },
        });
        if (!ticket) {
            return res.status(404).json({ error: "Ticket not found" });
        }
        const updatedAssignment = {
            assignedToTeamId: assignedToTeamId === "unassigned"
                ? null
                : assignedToTeamId || ticket.assignedToTeamId,
            assignedToEmployeeId: assignedToEmployeeId === "unassigned"
                ? null
                : assignedToEmployeeId || ticket.assignedToEmployeeId,
        };
        // Update the ticket
        console.log("Updated Assignment:", updatedAssignment);
        const updatedTicket = await prisma.ticket.update({
            where: { id, providerId },
            data: {
                ...body,
                ...updatedAssignment,
            },
        });
        // Determine what changed
        const changes = [];
        if (ticket.status !== updatedTicket.status) {
            changes.push(`status changed from ${ticket.status} to ${updatedTicket.status}`);
        }
        if (ticket.category !== updatedTicket.category) {
            changes.push(`category changed from ${ticket.category} to ${updatedTicket.category}`);
        }
        if (ticket.priority !== updatedTicket.priority) {
            changes.push(`priority changed from ${ticket.priority} to ${updatedTicket.priority}`);
        }
        if ((assignedToTeamId !== updatedTicket.assignedToTeamId) || (assignedToEmployeeId !== updatedTicket.assignedToEmployeeId)) {
            if (assignedToTeamId === "unassigned" && assignedToEmployeeId === "unassigned") {
                changes.push(`ticket unassigned`);
            }
            if (assignedToEmployeeId) {
                if (assignedToEmployeeId !== "unassigned") {
                    const employee = await prisma.employees.findUnique({
                        where: {
                            id: assignedToEmployeeId
                        }
                    });
                    changes.push(`ticket assigned to ${employee?.fullName}`);
                }
            }
            if (assignedToTeamId) {
                if (assignedToTeamId !== "unassigned") {
                    const team = await prisma.employeesTeam.findUnique({
                        where: {
                            id: assignedToTeamId
                        }
                    });
                    changes.push(`ticket assigned to ${team?.name}`);
                }
            }
        }
        if (ticket.dueDate?.toISOString() !== updatedTicket.dueDate?.toISOString()) {
            changes.push(`due date updated`);
        }
        // Only log if something actually changed
        if (changes.length > 0) {
            await prisma.ticketLog.create({
                data: {
                    action: `Updated ticket: ${changes.join(", ")}`,
                    ticketId: id,
                    userId,
                },
            });
        }
        // ---- LOG ACTION (non-blocking) ----
        prisma.log
            .create({
            data: {
                action: "UPDATE",
                entity: "Ticket",
                userId,
                message: `Ticket ${updatedTicket.subject} updated`,
                providerId,
            },
        })
            .catch(console.error);
        return res.status(200).json(updatedTicket);
    }
    catch (error) {
        console.error("Error updating ticket:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};
exports.updateTicket = updateTicket;
const getTicketLogs = async (req, res) => {
    const { id: ticketId } = req.params;
    const providerId = req.user.providerId;
    try {
        const ticketLogs = await prisma.ticketLog.findMany({
            where: {
                ticketId,
                user: {
                    providerId
                }
            },
            include: {
                user: {
                    select: {
                        id: true,
                        fullName: true,
                        employee: {
                            select: {
                                id: true,
                                fullName: true
                            }
                        }
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        return res.status(200).json(ticketLogs);
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};
exports.getTicketLogs = getTicketLogs;
const deleteTicket = async (req, res) => {
    const { id } = req.params;
    const { id: userId, providerId } = req.user;
    try {
        const ticket = await prisma.ticket.findUnique({
            where: {
                id
            },
            include: {
                comments: {
                    select: {
                        message: true
                    }
                }
            }
        });
        await prisma.ticket.delete({
            where: {
                id
            }
        });
        if (ticket && ticket?.comments?.length > 0) {
            ticket.comments.map((comment) => {
                const urls = (0, extract_image_from_markdown_1.extractImageUrls)(comment.message);
                urls.forEach((url) => {
                    const relativePath = url.replace(/^https?:\/\/[^/]+/, "");
                    const filePath = path_1.default.join(process.cwd(), relativePath);
                    if (fs_1.default.existsSync(filePath))
                        fs_1.default.unlinkSync(filePath);
                });
            });
        }
        // ---- LOG ACTION (non-blocking) ----
        prisma.log
            .create({
            data: {
                action: "DELETE",
                entity: "Ticket",
                userId,
                message: `Ticket ${ticket?.subject} deleted`,
                providerId,
            },
        })
            .catch(console.error);
        return res.status(200).json({ message: "Ticket deleted successfully" });
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};
exports.deleteTicket = deleteTicket;
const createTicketComment = async (req, res) => {
    const { id: ticketId } = req.params;
    const { id: userId, providerId } = req.user;
    (0, imageSizeLimiter_1.upload)(req, res, async (err) => {
        if (err) {
            if (err instanceof multer_1.default.MulterError && err.code === "LIMIT_FILE_SIZE") {
                return res.status(400).json({ message: "File too large. Max size is 5 MB" });
            }
            return res.status(400).json({ message: err.message });
        }
        try {
            let message = req.body.message || "";
            if (req.file) {
                const provider = await prisma.provider.findUnique({
                    where: {
                        id: providerId
                    },
                    select: {
                        companyName: true
                    }
                });
                const folderName = provider?.companyName.trim().replace(/\s+/g, "_");
                const fileUrl = `${req.protocol}://${req.get("host")}/uploads/${folderName}/${req.file.filename}`;
                message += `\n\n![${req.file.originalname}](${fileUrl})`;
            }
            const comment = await prisma.ticketComment.create({
                data: {
                    ticketId,
                    userId,
                    message,
                },
            });
            return res.status(201).json(comment);
        }
        catch (error) {
            console.error(error);
            return res.status(500).json({ message: "Internal Server Error" });
        }
    });
};
exports.createTicketComment = createTicketComment;
const getTicketComments = async (req, res) => {
    const { id: ticketId } = req.params;
    try {
        const comments = await prisma.ticketComment.findMany({
            where: {
                ticketId
            },
            include: {
                user: {
                    select: {
                        id: true,
                        fullName: true
                    }
                }
            }
        });
        return res.status(200).json(comments);
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};
exports.getTicketComments = getTicketComments;
const deleteTicketComment = async (req, res) => {
    const { id } = req.params;
    try {
        const comment = await prisma.ticketComment.findUnique({
            where: {
                id
            }
        });
        await prisma.ticketComment.delete({
            where: {
                id
            }
        });
        if (comment) {
            const imageUrls = (0, extract_image_from_markdown_1.extractImageUrls)(comment.message);
            imageUrls.forEach((url) => {
                const relativePath = url.replace(/^https?:\/\/[^/]+/, "");
                const filePath = path_1.default.join(process.cwd(), relativePath);
                if (fs_1.default.existsSync(filePath))
                    fs_1.default.unlinkSync(filePath);
            });
        }
        return res.status(200).json({ message: "Ticket Comment Deleted Successfully" });
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};
exports.deleteTicketComment = deleteTicketComment;
const getAssignedTickets = async (req, res) => {
    const assignedTo = typeof req.query.assignedTo === "string" ? req.query.assignedTo : undefined;
    try {
        const user = await prisma.user.findUnique({
            where: { id: assignedTo },
            include: {
                employee: {
                    select: {
                        id: true,
                        teamId: true,
                    },
                },
            },
        });
        if (!user?.employee) {
            return res.status(404).json({ message: "Employee not found" });
        }
        const orFilters = [
            { assignedToEmployeeId: user.employee.id },
        ];
        if (user.employee.teamId) {
            orFilters.push({ assignedToTeamId: user.employee.teamId });
        }
        const tickets = await prisma.ticket.findMany({
            where: {
                OR: orFilters,
            },
            include: {
                assignedToEmployee: true,
                assignedToTeam: true,
            },
        });
        return res.status(200).json(tickets);
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};
exports.getAssignedTickets = getAssignedTickets;
//# sourceMappingURL=ticketsController.js.map