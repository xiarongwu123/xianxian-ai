import { createHash, randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { SignJWT, jwtVerify } from "jose";
import { config } from "./config";
import { db, now } from "./db";

const key = new TextEncoder().encode(config.jwtSecret);
export const hashToken = (value: string) => createHash("sha256").update(value).digest("hex");
export const hashPassword = (password: string) => { const salt = randomBytes(16).toString("hex"); return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`; };
export const verifyPassword = (password: string, stored: string) => { const [salt, hash] = stored.split(":"); if (!salt || !hash) return false; return timingSafeEqual(Buffer.from(hash, "hex"), scryptSync(password, salt, 64)); };

export async function issueTokens(userId: string) {
  const accessToken = await new SignJWT({ sub: userId, type: "access" }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime(`${config.accessTtlSeconds}s`).sign(key);
  const refreshToken = randomBytes(48).toString("base64url");
  db.prepare("INSERT INTO sessions (id,user_id,token_hash,expires_at,created_at) VALUES (?,?,?,?,?)").run(randomUUID(), userId, hashToken(refreshToken), new Date(Date.now() + config.refreshTtlSeconds * 1000).toISOString(), now());
  return { accessToken, refreshToken, expiresIn: config.accessTtlSeconds };
}

export interface AuthedRequest extends Request { userId?: string; }
export async function requireAuth(request: AuthedRequest, response: Response, next: NextFunction) {
  const token = request.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!token) return response.status(401).json({ error: "authentication_required" });
  try { const result = await jwtVerify(token, key); if (result.payload.type !== "access" || !result.payload.sub) throw new Error(); request.userId = result.payload.sub; next(); }
  catch { response.status(401).json({ error: "invalid_or_expired_token" }); }
}
