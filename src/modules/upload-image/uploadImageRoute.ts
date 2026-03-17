import express, { Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { authenticateProvider } from "../../middlewares/authMiddleware";
import { upload } from "../../middlewares/imageSizeLimiter";

const router = express.Router();


router.post(
  "/",
  authenticateProvider,
  async (req: Request, res: Response) => {
    upload(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({ message: "File too large. Max size is 5 MB" });
        }
        return res.status(400).json({ message: err.message });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

  // Determine protocol: prefer HTTPS in production, otherwise honor x-forwarded-proto or req.protocol
      // Determine protocol: prefer HTTPS in production, otherwise honor x-forwarded-proto or req.protocol
  // In production, force https to ensure publicly accessible HTTPS URLs are returned.
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : req.protocol;

      const fileUrl = `${protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  res.json({ url: fileUrl });
    });
  }
);

export default router;
