import cors from "cors";
import express from "express";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { ZodError } from "zod";
import { config } from "./config";
import "./db";
import { authRoutes } from "./routes/authRoutes";
import { researchRoutes } from "./routes/researchRoutes";
import { resourceRoutes } from "./routes/resourceRoutes";
import { uploadRoutes } from "./routes/uploadRoutes";
import { visionRoutes } from "./routes/visionRoutes";
import { analysisRoutes } from "./routes/analysisRoutes";
import { evaluateAlerts } from "./alertWorker";
import { requireAuth } from "./auth";

export const app = express();
app.disable("x-powered-by");
app.use(cors({ origin: config.corsOrigin.split(","), credentials: false }));
app.use(express.json({ limit: "1mb" }));
app.use((request, response, next) => { response.setHeader("X-Content-Type-Options", "nosniff"); response.setHeader("X-Frame-Options", "DENY"); response.setHeader("Referrer-Policy", "no-referrer"); next(); });

app.get("/health", (_request, response) => response.json({ status: "ok", service: "xianxian-api", time: new Date().toISOString() }));
app.use("/api/auth", authRoutes);
app.use("/api/research", researchRoutes);
app.use("/api", resourceRoutes);
app.use("/api/uploads", uploadRoutes);
app.use("/api/vision", visionRoutes);
app.use("/api/analysis", analysisRoutes);
app.post("/api/alerts/evaluate", requireAuth, async (request, response, next) => { try { response.json({ results: await evaluateAlerts((request as any).userId) }); } catch (error) { next(error); } });

if (process.env.NODE_ENV === "production") {
  const frontendDir = resolve(process.cwd(), "dist");
  if (!existsSync(frontendDir)) throw new Error("Production frontend build is missing. Run npm run build first.");
  app.use(express.static(frontendDir, { index: false, maxAge: "1y", immutable: true }));
  app.get("/{*path}", (request, response, next) => {
    if (request.path.startsWith("/api/") || request.path === "/health") return next();
    response.sendFile(resolve(frontendDir, "index.html"));
  });
}

app.use((_request, response) => response.status(404).json({ error: "not_found" }));
app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
  if (error instanceof ZodError) return response.status(400).json({ error: "validation_failed", details: error.issues });
  if ((error as any)?.code === "LIMIT_FILE_SIZE") return response.status(413).json({ error: "file_too_large", maxBytes: 10 * 1024 * 1024 });
  console.error(error);
  response.status(500).json({ error: "internal_server_error" });
});
