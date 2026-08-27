import type { IncomingMessage, ServerResponse } from "node:http";

type CacheEntry = { expiresAt: number; value: unknown };
const cache = new Map<string, CacheEntry>();
const QUOTE_TTL = 30_000;
const RESEARCH_TTL = 15 * 60_000;

const json = (response: ServerResponse, status: number, body: unknown) => {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.end(JSON.stringify(body));
};

async function cached<T>(key: string, ttl: number, loader: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.value as T;
  const value = await loader();
  cache.set(key, { value, expiresAt: Date.now() + ttl });
  return value;
}

async function fetchJson(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "XianxianAI-MVP/0.1", Accept: "application/json" },
    });
    if (!response.ok) throw new Error(`upstream ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

const marketId = (code: string) => `${code.startsWith("6") ? "1" : "0"}.${code}`;
const percent = (value: unknown) => typeof value === "number" ? `${value >= 0 ? "+" : ""}${value.toFixed(2)}%` : "暂无可核验信息";

async function loadQuote(code: string) {
  try {
    const fields = "f57,f58,f43,f44,f45,f46,f47,f48,f60,f170,f171";
    const payload = await fetchJson(`https://push2.eastmoney.com/api/qt/stock/get?secid=${marketId(code)}&fields=${fields}`) as any;
    if (!payload?.data) throw new Error("quote not found");
    const item = payload.data;
    const price = Number(item.f43) / 100, previousClose = Number(item.f60) / 100;
    if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(previousClose) || previousClose <= 0) throw new Error("quote contains invalid price");
    return { code: item.f57, name: item.f58, price, previousClose, changePercent: Number(item.f170) / 100, high: Number(item.f44) / 100, low: Number(item.f45) / 100, open: Number(item.f46) / 100, volume: Number(item.f47), amount: Number(item.f48), source: "东方财富公开行情接口", retrievedAt: new Date().toISOString(), verified: true };
  } catch {
    const prefix = code.startsWith("6") ? "sh" : "sz";
    const response = await fetch(`https://qt.gtimg.cn/q=${prefix}${code}`, { headers: { "User-Agent": "XianxianAI-MVP/0.1" } });
    if (!response.ok) throw new Error("quote fallback unavailable");
    const text = new TextDecoder("gbk").decode(new Uint8Array(await response.arrayBuffer()));
    const match = text.match(/="(.+)"/);
    if (!match) throw new Error("quote fallback malformed");
    const item = match[1].split("~");
    const price = Number(item[3]), previousClose = Number(item[4]);
    if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(previousClose) || previousClose <= 0) throw new Error("quote fallback contains invalid price");
    return { code: item[2], name: item[1], price, previousClose, changePercent: Number(item[32]), high: Number(item[33]), low: Number(item[34]), open: Number(item[5]), volume: Number(item[6]), amount: Number(item[37]), source: "腾讯证券公开行情接口（备用）", retrievedAt: new Date().toISOString(), verified: true };
  }
}

async function loadFundamentals(code: string) {
  const url = `https://datacenter-web.eastmoney.com/api/data/v1/get?reportName=RPT_LICO_FN_CPD&columns=ALL&filter=(SECURITY_CODE%3D%22${code}%22)&pageNumber=1&pageSize=8`;
  const payload = await fetchJson(url) as any;
  const records = payload?.result?.data ?? [];
  const item = records.find((record: any) => record.ISNEW === "1") ?? records[0];
  if (!item) throw new Error("fundamentals not found");
  return {
    period: item.DATATYPE ?? item.REPORTDATE?.slice(0, 10),
    noticeDate: item.NOTICE_DATE?.slice(0, 10),
    metrics: [
      { label: "营收同比", value: percent(item.YSTZ) },
      { label: "归母净利同比", value: percent(item.SJLTZ) },
      { label: "加权 ROE", value: percent(item.WEIGHTAVG_ROE) },
      { label: "销售毛利率", value: percent(item.XSMLL) },
    ],
    source: "东方财富公开财务数据",
    retrievedAt: new Date().toISOString(),
    verified: true,
  };
}

async function loadAnnouncements(code: string) {
  const payload = await fetchJson(`https://np-anotice-stock.eastmoney.com/api/security/ann?sr=-1&page_size=5&page_index=1&ann_type=A&client_source=web&stock_list=${code}`) as any;
  const records = payload?.data?.list ?? [];
  return {
    items: records.map((item: any) => ({
      id: item.art_code,
      title: item.title,
      publishedAt: item.display_time ?? item.notice_date,
      source: "东方财富公告聚合（公司公告附件）",
      url: `https://data.eastmoney.com/notices/detail/${code}/${item.art_code}.html`,
      verified: Boolean(item.art_code && item.title),
    })),
    retrievedAt: new Date().toISOString(),
  };
}

export async function buildResearch(code: string) {
  const settled = await Promise.allSettled([
    cached(`quote:${code}`, QUOTE_TTL, () => loadQuote(code)),
    cached(`fundamentals:${code}`, RESEARCH_TTL, () => loadFundamentals(code)),
    cached(`announcements:${code}`, RESEARCH_TTL, () => loadAnnouncements(code)),
  ]);
  const get = <T,>(index: number): T | null => settled[index].status === "fulfilled" ? settled[index].value as T : null;
  return {
    code,
    quote: get(0),
    fundamentals: get(1),
    announcements: get(2),
    status: {
      quote: settled[0].status === "fulfilled" ? "verified" : "unavailable",
      fundamentals: settled[1].status === "fulfilled" ? "verified" : "unavailable",
      announcements: settled[2].status === "fulfilled" ? "verified" : "unavailable",
    },
    retrievedAt: new Date().toISOString(),
    disclaimer: "公开接口仅用于 MVP 验证，正式商用前需确认数据许可并替换为稳定授权数据源。",
  };
}

export async function handleResearchApi(request: IncomingMessage, response: ServerResponse, next: () => void) {
  const match = request.url?.match(/^\/api\/research\/(\d{6})(?:\?.*)?$/);
  if (!match) return next();
  if (request.method !== "GET") return json(response, 405, { error: "method_not_allowed" });
  try {
    json(response, 200, await cached(`research:${match[1]}`, QUOTE_TTL, () => buildResearch(match[1])));
  } catch {
    json(response, 502, { error: "research_source_unavailable", message: "暂时无法获取可核验数据" });
  }
}
