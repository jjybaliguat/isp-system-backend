import { Request, Response } from "express";
import prisma from "../../utils/prisma";

export const getLatestActivePPPoEAccounts = async (
  req: Request,
  res: Response
) => {
  const { providerId } = req.user;
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const search =
    typeof req.query.search === "string" ? req.query.search.trim() : "";

  const offset = (page - 1) * limit;

  try {
    // Verify provider access
    const provider = await prisma.provider.findUnique({
      where: { id: providerId },
      // Optional: adjust filters if you need providerType / companyName checks
    });

    if (!provider)
      return res
        .status(400)
        .json({ message: "You do not have access to this endpoint" });

    // Build search filter
    const where = search
      ? {
          username: {
            contains: search,
            mode: "insensitive" as const,
          },
        }
      : {};

    // Get total count
    const totalCount = await prisma.pppoeLatest.count({ where });

    // Get paginated latest records
    const latestRecords = await prisma.pppoeLatest.findMany({
      where,
      orderBy: { username: "asc" },
      skip: offset,
      take: limit,
    });

    const totalPages = Math.ceil(totalCount / limit);

    return res.status(200).json({
      data: latestRecords,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages,
      },
    });
  } catch (error) {
    console.error("Error fetching latest PPPoE accounts:", error);
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