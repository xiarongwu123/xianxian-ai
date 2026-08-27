const cache = new Map();
const QUOTE_TTL = 30000;
const RESEARCH_TTL = 15 * 60000;
const json = (response, status, body) => {
    response.statusCode = status;
    response.setHeader("Content-Type", "application/json; charset=utf-8");
    response.setHeader("Cache-Control", "no-store");
    response.end(JSON.stringify(body));
};
async function cached(key, ttl, loader) {
    const hit = cache.get(key);
    if (hit && hit.expiresAt > Date.now())
        return hit.value;
    const value = await loader();
    cache.set(key, { value, expiresAt: Date.now() + ttl });
    return value;
}
async function fetchJson(url) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
        const response = await fetch(url, {
            signal: controller.signal,
            headers: { "User-Agent": "XianxianAI-MVP/0.1", Accept: "application/json" },
        });
        if (!response.ok)
            throw new Error(`upstream ${response.status}`);
        return await response.json();
    }
    finally {
        clearTimeout(timeout);
    }
}
const marketId = (code) => `${code.startsWith("6") ? "1" : "0"}.${code}`;
const percent = (value) => typeof value === "number" ? `${value >= 0 ? "+" : ""}${value.toFixed(2)}%` : "暂无可核验信息";
async function loadQuote(code) {
    const fields = "f57,f58,f43,f44,f45,f46,f47,f48,f60,f170,f171";
    const payload = await fetchJson(`https://push2.eastmoney.com/api/qt/stock/get?secid=${marketId(code)}&fields=${fields}`);
    if (!payload?.data)
        throw new Error("quote not found");
    const item = payload.data;
    return {
        code: item.f57,
        name: item.f58,
        price: item.f43 / 100,
        previousClose: item.f60 / 100,
        changePercent: item.f170 / 100,
        high: item.f44 / 100,
        low: item.f45 / 100,
        open: item.f46 / 100,
        volume: item.f47,
        amount: item.f48,
        source: "东方财富公开行情接口",
        retrievedAt: new Date().toISOString(),
        verified: true,
    };
}
async function loadFundamentals(code) {
    const url = `https://datacenter-web.eastmoney.com/api/data/v1/get?reportName=RPT_LICO_FN_CPD&columns=ALL&filter=(SECURITY_CODE%3D%22${code}%22)&pageNumber=1&pageSize=8`;
    const payload = await fetchJson(url);
    const records = payload?.result?.data ?? [];
    const item = records.find((record) => record.ISNEW === "1") ?? records[0];
    if (!item)
        throw new Error("fundamentals not found");
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
async function loadAnnouncements(code) {
    const payload = await fetchJson(`https://np-anotice-stock.eastmoney.com/api/security/ann?sr=-1&page_size=5&page_index=1&ann_type=A&client_source=web&stock_list=${code}`);
    const records = payload?.data?.list ?? [];
    return {
        items: records.map((item) => ({
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
export async function buildResearch(code) {
    const settled = await Promise.allSettled([
        cached(`quote:${code}`, QUOTE_TTL, () => loadQuote(code)),
        cached(`fundamentals:${code}`, RESEARCH_TTL, () => loadFundamentals(code)),
        cached(`announcements:${code}`, RESEARCH_TTL, () => loadAnnouncements(code)),
    ]);
    const get = (index) => settled[index].status === "fulfilled" ? settled[index].value : null;
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
export async function handleResearchApi(request, response, next) {
    const match = request.url?.match(/^\/api\/research\/(\d{6})(?:\?.*)?$/);
    if (!match)
        return next();
    if (request.method !== "GET")
        return json(response, 405, { error: "method_not_allowed" });
    try {
        json(response, 200, await cached(`research:${match[1]}`, QUOTE_TTL, () => buildResearch(match[1])));
    }
    catch {
        json(response, 502, { error: "research_source_unavailable", message: "暂时无法获取可核验数据" });
    }
}
