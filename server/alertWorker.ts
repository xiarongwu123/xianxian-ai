import { randomUUID } from "node:crypto";
import { db, now } from "./db";
import { buildResearch } from "./researchGateway";

export async function evaluateAlerts(userId?: string) {
  const alerts = (userId
    ? db.prepare("SELECT * FROM alerts WHERE active=1 AND user_id=?").all(userId)
    : db.prepare("SELECT * FROM alerts WHERE active=1").all()) as any[];
  const results = [];
  for (const alert of alerts) {
    try {
      const code = alert.symbol.slice(0, 6);
      const research = await buildResearch(code) as any;
      const quote = research.quote;
      if (!quote) { results.push({ id: alert.id, status: "source_unavailable" }); continue; }
      const observed = alert.kind === "change_percent" ? quote.changePercent : alert.kind === "volume" ? quote.volume : quote.price;
      const triggered = alert.operator === "gte" ? observed >= alert.target_value : observed <= alert.target_value;
      if (!triggered) { results.push({ id: alert.id, status: "not_triggered", observed }); continue; }
      const last = alert.last_triggered_at ? Date.parse(alert.last_triggered_at) : 0;
      if (Date.now() - last < 30 * 60_000) { results.push({ id: alert.id, status: "deduplicated", observed }); continue; }
      const timestamp = now();
      db.transaction(() => {
        db.prepare("INSERT INTO alert_events (id,alert_id,observed_value,message,created_at) VALUES (?,?,?,?,?)").run(randomUUID(), alert.id, observed, `${alert.name} ${alert.kind} 已满足 ${alert.operator} ${alert.target_value}`, timestamp);
        db.prepare("UPDATE alerts SET last_triggered_at=?,updated_at=? WHERE id=?").run(timestamp, timestamp, alert.id);
      })();
      results.push({ id: alert.id, status: "triggered", observed, delivery: "stored_only" });
    } catch { results.push({ id: alert.id, status: "error" }); }
  }
  return results;
}
