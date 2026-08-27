import { Router } from "express";
import { buildResearch } from "../researchGateway";

export const researchRoutes = Router();
researchRoutes.get("/search/suggest", async (request, response, next) => {
  const query = String(request.query.q ?? "").trim();
  if (!query || query.length > 30) return response.status(400).json({ error: "invalid_search_query" });
  try {
    const upstream = await fetch(`https://searchapi.eastmoney.com/api/suggest/get?input=${encodeURIComponent(query)}&type=14&token=D43BF722C8E33BDC906FB84D85E326E8`, { signal: AbortSignal.timeout(8_000) });
    if (!upstream.ok) throw new Error(`search upstream ${upstream.status}`);
    const body = await upstream.json() as any;
    const items = (body?.QuotationCodeTable?.Data ?? []).filter((item: any) => item.Classify === "AStock").slice(0, 8).map((item: any) => ({ code: item.Code, symbol: `${item.Code}.${item.MktNum === "1" ? "SH" : "SZ"}`, name: item.Name, market: item.SecurityTypeName }));
    response.json({ items });
  } catch (error) { next(error); }
});
researchRoutes.get("/:code", async (request, response, next) => {
  if (!/^\d{6}$/.test(request.params.code)) return response.status(400).json({ error: "invalid_symbol" });
  try { response.json(await buildResearch(request.params.code)); } catch (error) { next(error); }
});
