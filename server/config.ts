import "dotenv/config";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(process.cwd(), process.env.DATA_DIR ?? "data");
mkdirSync(root, { recursive: true });
mkdirSync(resolve(root, "uploads"), { recursive: true });

export const config = {
  port: Number(process.env.API_PORT ?? 8787),
  host: process.env.API_HOST ?? "127.0.0.1",
  dataDir: root,
  databasePath: resolve(root, process.env.DATABASE_FILE ?? "xianxian.sqlite"),
  uploadDir: resolve(root, "uploads"),
  jwtSecret: process.env.JWT_SECRET ?? "development-only-change-before-deploy-32chars",
  accessTtlSeconds: 15 * 60,
  refreshTtlSeconds: 30 * 24 * 60 * 60,
  devSmsCode: process.env.DEV_SMS_CODE ?? "123456",
  smsMode: process.env.SMS_MODE ?? (process.env.NODE_ENV === "production" ? "disabled" : "development"),
  exposeDevCode: process.env.NODE_ENV !== "production",
  corsOrigin: process.env.CORS_ORIGIN ?? "http://127.0.0.1:4173,http://127.0.0.1:4174",
  openaiApiKey: process.env.OPENAI_API_KEY ?? "",
  openaiApiBase: (process.env.OPENAI_API_BASE ?? "https://api.openai.com/v1").replace(/\/$/, ""),
  visionModel: process.env.OPENAI_VISION_MODEL ?? "gpt-5.6-terra",
  analystTimeoutMs: Number(process.env.ANALYST_TIMEOUT_MS ?? 150_000),
};

if (process.env.NODE_ENV === "production" && !process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is required in production");
}
if (process.env.NODE_ENV === "production" && config.smsMode === "development") {
  throw new Error("SMS_MODE=development is forbidden in production");
}
