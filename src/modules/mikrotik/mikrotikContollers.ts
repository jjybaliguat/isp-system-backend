import { Request, Response } from "express";
import prisma from "../../utils/prisma";
import { closeMikrotikConnection, getMikrotikConnection } from "../../helpers/mikrotik";

export const getLatestActivePPPoEAccounts = async (
  req: Request,
  res: Response
) => {
  const { providerId } = req.user;
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const search =
    typeof req.query.search === "string" ? req.query.search.trim().toLowerCase() : "";

  const offset = (page - 1) * limit;

  const conn = await getMikrotikConnection()
  if(!conn) return res.status(400).json({message: "Failed connecting to mikrotik"})

  try {
    const pppActive = await conn.write("/ppp/active/print");
    // 🔍 Search filter (you can customize fields)
    const filtered = search
      ? pppActive.filter((secret: any) => {
          return (
            secret.name?.toLowerCase().includes(search) ||
            secret.service?.toLowerCase().includes(search) ||
            secret.address?.toLowerCase().includes(search)
          );
        })
      : pppActive;

    const totalCount = filtered.length;
    const totalPages = Math.ceil(totalCount / limit);

    // 📄 Pagination
    const paginatedData = filtered.slice(offset, offset + limit);

    return res.status(200).json({
      data: paginatedData,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages,
      },
    });
  } catch (error) {
    await closeMikrotikConnection();
    console.error("Error fetching latest PPPoE accounts:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getPPPoEHistory = async (req: Request, res: Response) => {
  try {
    const username = req.query.username as string;

    if (!username) {
      return res.status(400).json({ message: "username is required" });
    }

    const from = req.query.from
      ? new Date(req.query.from as string)
      : new Date(Date.now() - 5 * 60 * 1000);

    const to = req.query.to
      ? new Date(req.query.to as string)
      : new Date();

    const intervalSec = Number(req.query.interval) || 2;

    const diffSec = (to.getTime() - from.getTime()) / 1000;

    if (diffSec / intervalSec > 1000) {
      return res.status(400).json({
        message: "Too many data points. Increase interval.",
      });
    }

    // 🔥 Use generate_series for gap filling
    const data = await prisma.$queryRaw`
      SELECT 
        gs AS "recordedAt",
        COALESCE(b.rx_mbps, 0) AS "rx_mbps",
        COALESCE(b.tx_mbps, 0) AS "tx_mbps"
      FROM generate_series(
        ${from.toISOString()}::timestamp,
        ${to.toISOString()}::timestamp,
        interval '${intervalSec} seconds'
      ) AS gs
      LEFT JOIN LATERAL (
        SELECT rx_mbps, tx_mbps
        FROM "pppoe_bandwidth" b
        WHERE b.username = ${'<pppoe-' + username + '>'}
          AND b."recorded_at" >= gs
          AND b."recorded_at" < gs + interval '${intervalSec} seconds'
        ORDER BY b."recorded_at" ASC
        LIMIT 1
      ) b ON true
      ORDER BY gs ASC
    `;

    return res.json(data);

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

export const getPPPSecrets = async (req: Request, res: Response) => {
  const { id, providerId } = req.user;

  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const search =
    typeof req.query.search === "string" ? req.query.search.trim().toLowerCase() : "";

  const offset = (page - 1) * limit;

  const conn = await getMikrotikConnection();
  if (!conn) {
    return res.status(400).json({ message: "Mikrotik Connection Failed" });
  }

  try {
    const pppsecrets = await conn.write("/ppp/secret/print");

    // 🔍 Search filter (you can customize fields)
    const filtered = search
      ? pppsecrets.filter((secret: any) => {
          return (
            secret.name?.toLowerCase().includes(search) ||
            secret.service?.toLowerCase().includes(search) ||
            secret.profile?.toLowerCase().includes(search)
          );
        })
      : pppsecrets;

    const totalCount = filtered.length;
    const totalPages = Math.ceil(totalCount / limit);

    // 📄 Pagination
    const paginatedData = filtered.slice(offset, offset + limit);

    return res.status(200).json({
      data: paginatedData,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages,
      },
    });
  } catch (error) {
    await closeMikrotikConnection();
    console.log(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};