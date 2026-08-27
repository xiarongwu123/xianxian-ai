import { createHash, randomUUID } from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { config } from "../config";
import { db, now } from "../db";
import { hashPassword, hashToken, issueTokens, requireAuth, type AuthedRequest, verifyPassword } from "../auth";

export const authRoutes = Router();
const phoneSchema = z.string().regex(/^1\d{10}$/);
const codeHash = (phone: string, code: string) => createHash("sha256").update(`${phone}:${code}:${config.jwtSecret}`).digest("hex");

authRoutes.post("/sms/request", (request, response) => {
  if (config.smsMode === "disabled") return response.status(503).json({ error: "sms_not_configured", message: "短信登录暂未开放，请使用内测账号密码登录" });
  const parsed = z.object({ phone: phoneSchema }).safeParse(request.body);
  if (!parsed.success) return response.status(400).json({ error: "invalid_phone" });
  const createdAt = now();
  db.prepare("INSERT INTO sms_codes (phone,code_hash,expires_at,attempts,created_at) VALUES (?,?,?,?,?) ON CONFLICT(phone) DO UPDATE SET code_hash=excluded.code_hash,expires_at=excluded.expires_at,attempts=0,created_at=excluded.created_at").run(parsed.data.phone, codeHash(parsed.data.phone, config.devSmsCode), new Date(Date.now() + 5 * 60_000).toISOString(), 0, createdAt);
  response.status(202).json({ accepted: true, expiresIn: 300, ...(config.exposeDevCode ? { devCode: config.devSmsCode } : {}) });
});

authRoutes.post("/sms/login", async (request, response) => {
  if (config.smsMode === "disabled") return response.status(503).json({ error: "sms_not_configured", message: "短信登录暂未开放" });
  const parsed = z.object({ phone: phoneSchema, code: z.string().length(6) }).safeParse(request.body);
  if (!parsed.success) return response.status(400).json({ error: "invalid_credentials" });
  const record = db.prepare("SELECT * FROM sms_codes WHERE phone=?").get(parsed.data.phone) as any;
  if (!record || record.attempts >= 5 || record.expires_at < now() || record.code_hash !== codeHash(parsed.data.phone, parsed.data.code)) {
    if (record) db.prepare("UPDATE sms_codes SET attempts=attempts+1 WHERE phone=?").run(parsed.data.phone);
    return response.status(401).json({ error: "invalid_or_expired_code" });
  }
  let user = db.prepare("SELECT * FROM users WHERE phone=?").get(parsed.data.phone) as any;
  if (!user) { const timestamp = now(); const id = randomUUID(); db.prepare("INSERT INTO users (id,phone,display_name,created_at,updated_at) VALUES (?,?,?,?,?)").run(id, parsed.data.phone, `用户 ${parsed.data.phone.slice(-4)}`, timestamp, timestamp); user = db.prepare("SELECT * FROM users WHERE id=?").get(id); }
  db.prepare("DELETE FROM sms_codes WHERE phone=?").run(parsed.data.phone);
  response.json({ user: publicUser(user), tokens: await issueTokens(user.id) });
});

authRoutes.post("/password/set", requireAuth, (request: AuthedRequest, response) => {
  const parsed = z.object({ password: z.string().min(8).max(72) }).safeParse(request.body);
  if (!parsed.success) return response.status(400).json({ error: "weak_password" });
  db.prepare("UPDATE users SET password_hash=?,updated_at=? WHERE id=?").run(hashPassword(parsed.data.password), now(), request.userId);
  response.status(204).end();
});

authRoutes.post("/password/login", async (request, response) => {
  const parsed = z.object({ phone: phoneSchema, password: z.string().min(8).max(72) }).safeParse(request.body);
  if (!parsed.success) return response.status(400).json({ error: "invalid_credentials" });
  const user = db.prepare("SELECT * FROM users WHERE phone=?").get(parsed.data.phone) as any;
  if (user && !user.password_hash) return response.status(409).json({ error: "password_not_set", message: "该账户尚未设置密码，请先使用验证码登录" });
  if (!user?.password_hash || !verifyPassword(parsed.data.password, user.password_hash)) return response.status(401).json({ error: "invalid_credentials", message: "手机号或密码错误" });
  response.json({ user: publicUser(user), tokens: await issueTokens(user.id) });
});

authRoutes.post("/refresh", async (request, response) => {
  const parsed = z.object({ refreshToken: z.string().min(32) }).safeParse(request.body);
  if (!parsed.success) return response.status(400).json({ error: "invalid_refresh_token" });
  const tokenHash = hashToken(parsed.data.refreshToken);
  const session = db.prepare("SELECT * FROM sessions WHERE token_hash=? AND revoked_at IS NULL AND expires_at>?").get(tokenHash, now()) as any;
  if (!session) return response.status(401).json({ error: "invalid_refresh_token" });
  db.prepare("UPDATE sessions SET revoked_at=? WHERE id=?").run(now(), session.id);
  response.json({ tokens: await issueTokens(session.user_id) });
});

authRoutes.post("/logout", (request, response) => { const parsed = z.object({ refreshToken: z.string() }).safeParse(request.body); if (parsed.success) db.prepare("UPDATE sessions SET revoked_at=? WHERE token_hash=?").run(now(), hashToken(parsed.data.refreshToken)); response.status(204).end(); });
authRoutes.get("/me", requireAuth, (request: AuthedRequest, response) => { const user = db.prepare("SELECT * FROM users WHERE id=?").get(request.userId) as any; if (!user) return response.status(404).json({ error: "user_not_found" }); response.json({ user: publicUser(user) }); });

function publicUser(user: any) { return { id: user.id, phone: user.phone, displayName: user.display_name, hasPassword: Boolean(user.password_hash), createdAt: user.created_at }; }
