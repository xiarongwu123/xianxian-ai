import assert from "node:assert/strict";
import test from "node:test";
import request from "supertest";
import { app } from "./app";

const phone = `138${String(Date.now()).slice(-8)}`;
let accessToken = "";
let refreshToken = "";

test("health endpoint", async () => {
  const response = await request(app).get("/health").expect(200);
  assert.equal(response.body.status, "ok");
});

test("SMS login creates a server session", async () => {
  const codeResponse = await request(app).post("/api/auth/sms/request").send({ phone }).expect(202);
  assert.equal(codeResponse.body.devCode, "123456");
  const login = await request(app).post("/api/auth/sms/login").send({ phone, code: "123456" }).expect(200);
  accessToken = login.body.tokens.accessToken;
  refreshToken = login.body.tokens.refreshToken;
  assert.equal(login.body.user.phone, phone);
  await request(app).get("/api/auth/me").set("Authorization", `Bearer ${accessToken}`).expect(200);
});

test("watchlist and alert resources persist", async () => {
  const auth = { Authorization: `Bearer ${accessToken}` };
  const watch = await request(app).post("/api/watchlist").set(auth).send({ symbol: "002354.SZ", name: "天娱数科", groupName: "重点观察" }).expect(201);
  assert.ok(watch.body.id);
  const alert = await request(app).post("/api/alerts").set(auth).send({ symbol: "002354.SZ", name: "天娱数科", kind: "price", operator: "gte", targetValue: 6.68, intervalName: "实时" }).expect(201);
  await request(app).patch(`/api/alerts/${alert.body.id}`).set(auth).send({ active: false }).expect(204);
  const list = await request(app).get("/api/watchlist").set(auth).expect(200);
  assert.equal(list.body.items[0].symbol, "002354.SZ");
});

test("report storage preserves structured payload", async () => {
  const auth = { Authorization: `Bearer ${accessToken}` };
  const saved = await request(app).post("/api/reports").set(auth).send({ symbol: "002354.SZ", name: "天娱数科", interval: "日 K", dataStatus: "verified", payload: { conclusion: "震荡偏强", sources: ["公告"] } }).expect(201);
  const report = await request(app).get(`/api/reports/${saved.body.id}`).set(auth).expect(200);
  assert.equal(report.body.payload.conclusion, "震荡偏强");
});

test("refresh tokens rotate and logout revokes session", async () => {
  const rotated = await request(app).post("/api/auth/refresh").send({ refreshToken }).expect(200);
  await request(app).post("/api/auth/refresh").send({ refreshToken }).expect(401);
  await request(app).post("/api/auth/logout").send({ refreshToken: rotated.body.tokens.refreshToken }).expect(204);
  await request(app).post("/api/auth/refresh").send({ refreshToken: rotated.body.tokens.refreshToken }).expect(401);
});
