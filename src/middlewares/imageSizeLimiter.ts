import express, { Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import prisma from "../utils/prisma";

const storage = multer.diskStorage({
  destination: async (req: Request, _file, cb) => {
    try {
      const { providerId } = req.user;

      const provider = await prisma.provider.findUnique({
        where: { id: providerId },
        select: { companyName: true },
      });

      if (!provider || !provider.companyName) {
        return cb(new Error("Provider not found or missing username"), "");
      }

      const folderName = provider.companyName.trim().replace(/\s+/g, "_");
      const userDir = path.resolve(__dirname, "../../uploads", folderName);
      if (!fs.existsSync(userDir)) {
        fs.mkdirSync(userDir, { recursive: true });
      }

      cb(null, userDir);
    } catch (err) {
      cb(err as Error, "");
    }
  },

  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB limit
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed"));
    }
    cb(null, true);
  },
}).single("image");
