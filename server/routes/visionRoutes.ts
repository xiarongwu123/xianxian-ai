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
    const message = error instanceof Error ? error.message : "vision_unknown_error";
    console.error("Vision recognition failed", { uploadId: upload.id, error: message, provider: new URL(config.openaiApiBase).host, model: config.visionModel });
    if (error instanceof DOMException && error.name === "TimeoutError") return response.status(504).json({ error: "vision_timeout", message: "图表识别超时，请重试或上传更小的图片" });
    if (message === "vision_api_not_configured") return response.status(503).json({ error: message, message: "视觉识别服务尚未配置，请检查服务器 OPENAI_API_KEY" });
    if (message === "vision_empty_response" || message === "vision_invalid_model_output") return response.status(502).json({ error: message, message: "视觉模型未返回有效的结构化识别结果" });
    if (message === "vision_invalid_upstream_response") return response.status(502).json({ error: message, message: "视觉服务返回了无法解析的响应，请检查 API 地址" });
    const upstreamStatus = (error as any)?.status;
    if (upstreamStatus === 401 || upstreamStatus === 403) return response.status(502).json({ error: "vision_provider_auth_failed", message: "视觉服务鉴权失败，请检查服务器 API Key" });
    if (upstreamStatus === 404) return response.status(502).json({ error: "vision_model_or_endpoint_not_found", message: "视觉模型或 API 地址不存在，请检查模型名称和 /v1 地址" });
    if (upstreamStatus === 429) return response.status(503).json({ error: "vision_rate_limited", message: "视觉服务额度不足或请求过多，请稍后重试" });
    if (upstreamStatus && upstreamStatus >= 500) return response.status(502).json({ error: "vision_provider_unavailable", message: "上游视觉服务暂时不可用，请稍后重试" });
    next(error);
  }
});
visionRoutes.get("/status", (_request, response) => response.json({ configured: Boolean(config.openaiApiKey), model: config.visionModel, provider: config.openaiApiKey ? new URL(config.openaiApiBase).host : null, checkedAt: now() }));
