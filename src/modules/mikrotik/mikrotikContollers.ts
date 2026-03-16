import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";
import { getMikrotikConnection } from "../../helpers/mikrotik";

const prisma = new PrismaClient();

export const getActivePPPoEAccounts = async (
  req: Request,
  res: Response
) => {
  const {id, providerId} = req.user
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const search =
    typeof req.query.search === "string" ? req.query.search.trim() : "";

  const offset = (page - 1) * limit;

  try {
    const provider = await prisma.provider.findUnique({
      where: {
        id: providerId,
        providerType: "MAIN",
        companyName: {
          contains: "Sierra",
          mode: "insensitive"
        }
      }
    })

    if(!provider) return res.status(400).json({message: "You do not have access to this edpoint"})

    // Get latest bandwidth per user with pagination
    const where = search
    ? {
        username: {
            contains: search,
            mode: "insensitive" as const,
        },
        }
    : {};

    const [usernames, total] = await Promise.all([
        prisma.pppoeBandwidth.findMany({
            where,
            distinct: ["username"],
            select: { username: true },
            skip: offset,
            take: limit,
        }),
        prisma.pppoeBandwidth.groupBy({
            by: ["username"],
            where,
        }),
    ]);

        const latestRecords = await prisma.pppoeBandwidth.findMany({
        where: {
            username: {
            in: usernames.map((u) => u.username),
            },
        },
        orderBy: [
            { username: "asc" },
            { recordedAt: "desc" },
        ],
        distinct: ["username"],
    });

    const data = latestRecords;

    const totalCount = total.length;

    const totalPages = Math.ceil(totalCount / limit);

    const response = {
      data,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages,
      },
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getPPPoEHistory = async (req: Request, res: Response) => {
  try {
    const username = req.query.username as string
    
    if (!username) {
      return res.status(400).json({ message: "username is required" })
    }
    
    const from = req.query.from
    ? new Date(req.query.from as string)
    : new Date(Date.now() - 5 * 60 * 1000)
    
    const to = req.query.to
    ? new Date(req.query.to as string)
    : new Date()
    
    const data = await prisma.pppoeBandwidth.findMany({
      where: {
        username,
        recordedAt: {
          gte: from,
          lte: to
        }
      },
      orderBy: {
        recordedAt: "asc"
      }
    })

    return res.json(data)

  } catch (error) {
    console.error(error)
    return res.status(500).json({
      message: "Internal server error"
    })
  }
}