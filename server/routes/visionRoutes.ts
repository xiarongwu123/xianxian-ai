import { resolve } from "node:path";
import { Router } from "express";
import { requireAuth, type AuthedRequest } from "../auth";
import { config } from "../config";
import { db, now } from "../db";
import { recognizeChartImage } from "../visionService";

export const visionRoutes = Router();
visionRoutes.use(requireAuth);
visionRoutes.post("/recognize/:uploadId", async (request: AuthedRequest, response, next) => {
  const upload = db.prepare("SELECT * FROM uploads WHERE id=? AND user_id=?").get(request.params.uploadId, request.userId) as any;
  if (!upload) return response.status(404).json({ error: "upload_not_found" });
  try {
    db.prepare("UPDATE uploads SET status='recognizing' WHERE id=?").run(upload.id);
    const result = await recognizeChartImage(resolve(config.uploadDir, upload.stored_name), upload.mime_type);
    db.prepare("UPDATE uploads SET status='recognized' WHERE id=?").run(upload.id);
    response.json({ uploadId: upload.id, ...result });
  } catch (error) {
    db.prepare("UPDATE uploads SET status='recognition_failed' WHERE id=?").run(upload.id);
    next(error);
  }
});
visionRoutes.get("/status", (_request, response) => response.json({ configured: Boolean(config.openaiApiKey), model: config.visionModel, provider: config.openaiApiKey ? new URL(config.openaiApiBase).host : null, checkedAt: now() }));
