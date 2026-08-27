import { randomUUID } from "node:crypto";
import { extname } from "node:path";
import { Router } from "express";
import multer from "multer";
import { requireAuth, type AuthedRequest } from "../auth";
import { config } from "../config";
import { db, now } from "../db";

const allowed = new Set(["image/jpeg", "image/png", "image/webp"]);
const storage = multer.diskStorage({
  destination: config.uploadDir,
  filename: (_request, file, done) => done(null, `${randomUUID()}${extname(file.originalname).toLowerCase().slice(0, 8)}`),
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024, files: 1 }, fileFilter: (_request, file, done) => done(null, allowed.has(file.mimetype)) });

export const uploadRoutes = Router();
uploadRoutes.use(requireAuth);
uploadRoutes.post("/", upload.single("chart"), (request: AuthedRequest, response) => {
  if (!request.file) return response.status(400).json({ error: "valid_chart_image_required", allowed: [...allowed] });
  const id = randomUUID(), timestamp = now();
  db.prepare("INSERT INTO uploads (id,user_id,original_name,stored_name,mime_type,size,status,created_at) VALUES (?,?,?,?,?,?,?,?)").run(id, request.userId, request.file.originalname, request.file.filename, request.file.mimetype, request.file.size, "stored", timestamp);
  response.status(201).json({ id, originalName: request.file.originalname, mimeType: request.file.mimetype, size: request.file.size, status: "stored", createdAt: timestamp });
});
uploadRoutes.get("/", (request: AuthedRequest, response) => response.json({ items: db.prepare("SELECT id,original_name AS originalName,mime_type AS mimeType,size,status,created_at AS createdAt FROM uploads WHERE user_id=? ORDER BY created_at DESC LIMIT 50").all(request.userId) }));
