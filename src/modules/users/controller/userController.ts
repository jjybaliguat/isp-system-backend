import { Request, Response } from 'express';
import bcrypt from "bcryptjs";
import prisma from '../../../utils/prisma';

export const getUsers = async (req: Request, res: Response) => {
    const {providerId} = req.user;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const roleFilter = typeof req.query.role === "string" && req.query.role !== "All"
      ? req.query.role
      : undefined;

    if(!providerId) return res.status(400).json({message: "Unauthorized"})

    const skip = (page - 1) * limit;

    try {
        const whereClause: any = { 
            providerId,
            ...(roleFilter && { role: roleFilter }),
            ...(search && {
                OR: [
                    { email: { contains: search, mode: 'insensitive' } },
                    { employee: { fullName: { contains: search, mode: 'insensitive' } } },
                    { client : { fullName: { contains: search, mode: 'insensitive' } } }
                ]
            })
         };

         const [users, total] = await Promise.all([
            prisma.user.findMany({
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
            prisma.user.count({ where: whereClause })
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
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

export const createUser = async (req: Request, res: Response) => {
  const {
    employeeId,
    clientId,
    role,
    password
  } = req.body

  const { id: userId, providerId } = req.user

  // 🚨 Validate source
  if ((!employeeId && !clientId) || (employeeId && clientId)) {
    return res.status(400).json({
      message: "Provide either employeeId or clientId (not both)"
    })
  }

  try {
    let source: any
    let sourceField: "employeeId" | "clientId"

    /* ================= EMPLOYEE FLOW ================= */
    if (employeeId) {
      sourceField = "employeeId"

      source = await prisma.employees.findFirst({
        where: { id: employeeId, providerId }
      })

      if (!source) {
        return res.status(400).json({ message: "Employee not found" })
      }

      const isUserExist = await prisma.user.findFirst({
        where: { employeeId }
      })

      if (isUserExist) {
        return res.status(400).json({
          message: "User for this employee already exists"
        })
      }
    }

    /* ================= CLIENT FLOW ================= */
    if (clientId) {
      sourceField = "clientId"

      source = await prisma.client.findFirst({
        where: { id: clientId, providerId }
      })

      if (!source) {
        return res.status(400).json({ message: "Client not found" })
      }

      const isUserExist = await prisma.user.findFirst({
        where: { clientId }
      })

      if (isUserExist) {
        return res.status(400).json({
          message: "User for this client already exists"
        })
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const newUser = await prisma.user.create({
      data: {
        email: source.email,
        fullName: source.fullName,
        role,
        password: hashedPassword,
        providerId,
        ...(employeeId && { employeeId }),
        ...(clientId && { clientId })
      }
    })

    // ---- LOG ACTION (non-blocking) ----
    prisma.log
      .create({
        data: {
          action: "CREATE",
          entity: "User",
          userId,
          message: `User ${newUser.email} created`,
          providerId
        }
      })
      .catch(console.error)

    return res.status(201).json(newUser)

  } catch (error) {
    console.error(error)
    return res.status(500).json({ message: "Internal server error" })
  }
}

export const deleteUser = async(req: Request, res: Response) => {
    const { id } = req.params as {id: string}
    const {id: userId, providerId} = req.user

    try {
        const user = await prisma.user.findUnique({
            where: {
                id,
                providerId
            }
        })
        if(!user){
            return res.status(404).json({message: "User not found"})
        }
        await prisma.user.delete({
            where: {
                id,
                providerId
            }
        })

        // ---- LOG ACTION (non-blocking) ----
        prisma.log
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
        return res.status(200).json({message: "User deleted successfully"})
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

export const changePass = async(req: Request, res: Response) => {
    const {id} = req.params as  {id: string}
    const {
        currentPassword,
        newPassword
    } = req.body

    try {
        const user = await prisma.user.findUnique({
            where: {
                id
            },
            select: {
                password: true
            }
        })
        if(user){
            const isCurrentPasswordMatched = await bcrypt.compare(currentPassword, user?.password)

            if(!isCurrentPasswordMatched) {
                return res.status(400).json({message: "Invalid current password"})
            }

            const newPasswordHashed = await bcrypt.hash(newPassword, 10);

            await prisma.user.update({
                where: {
                    id
                },
                data: {
                    password: newPasswordHashed
                }
            })

            return res.status(200).json({message: "Password updated successfully"})
        }
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal server error" });
    }
}