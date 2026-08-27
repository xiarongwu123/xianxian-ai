import { randomUUID } from "node:crypto";
import { hashPassword } from "../auth";
import { db, now } from "../db";

const phone = process.env.SEED_USER_PHONE?.trim();
const password = process.env.SEED_USER_PASSWORD;

if (!phone || !/^1\d{10}$/.test(phone)) {
  throw new Error("SEED_USER_PHONE must be a valid 11-digit mainland China phone number");
}
if (!password || password.length < 8 || password.length > 72) {
  throw new Error("SEED_USER_PASSWORD must contain 8-72 characters");
}

const timestamp = now();
const existing = db.prepare("SELECT id FROM users WHERE phone=?").get(phone) as { id: string } | undefined;

if (existing) {
  db.prepare("UPDATE users SET password_hash=?,updated_at=? WHERE id=?").run(hashPassword(password), timestamp, existing.id);
  console.log(`Updated password login for test user ${phone.slice(0, 3)}****${phone.slice(-4)}`);
} else {
  db.prepare("INSERT INTO users (id,phone,display_name,password_hash,created_at,updated_at) VALUES (?,?,?,?,?,?)").run(
    randomUUID(), phone, `内测用户 ${phone.slice(-4)}`, hashPassword(password), timestamp, timestamp,
  );
  console.log(`Created test user ${phone.slice(0, 3)}****${phone.slice(-4)}`);
}

db.close();
