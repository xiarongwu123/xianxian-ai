import { readFile } from "node:fs/promises";
import { config } from "./config";

const schema = {
  type: "object",
  additionalProperties: false,
  properties: {
    symbol: { type: ["string", "null"], description: "股票代码，尽量包含交易所后缀，如 002354.SZ" },
    name: { type: ["string", "null"] },
    interval: { type: ["string", "null"], enum: ["日 K", "周 K", "月 K", "分钟 K", null] },
    adjustment: { type: ["string", "null"], enum: ["前复权", "后复权", "不复权", "未知", null] },
    capturedPrice: { type: ["number", "null"] },
    visibleIndicators: { type: "array", items: { type: "string" } },
    trend: { type: "string" },
    evidence: { type: "array", items: { type: "string" } },
    warnings: { type: "array", items: { type: "string" } },
    confidence: { type: "number", minimum: 0, maximum: 1 },
  },
  required: ["symbol", "name", "interval", "adjustment", "capturedPrice", "visibleIndicators", "trend", "evidence", "warnings", "confidence"],
};

export async function recognizeChartImage(path: string, mimeType: string) {
  if (!config.openaiApiKey) throw new Error("vision_api_not_configured");
  const base64 = (await readFile(path)).toString("base64");
  const response = await fetch(`${config.openaiApiBase}/responses`, {
    method: "POST",
    headers: { Authorization: `Bearer ${config.openaiApiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: config.visionModel,
      input: [{ role: "user", content: [
        { type: "input_text", text: "你是中文证券图表识别器。只提取截图中可见事实，不猜测被裁切或模糊的信息。识别股票名称/代码、K线周期、复权、截图价格、指标、趋势证据和风险。无法确定的字段必须为 null，并降低 confidence。" },
        { type: "input_image", image_url: `data:${mimeType};base64,${base64}`, detail: "high" },
      ] }],
      text: { format: { type: "json_schema", name: "chart_recognition", strict: true, schema } },
    }),
    signal: AbortSignal.timeout(60_000),
  });
  const body = await response.json() as any;
  if (!response.ok) throw new Error(body?.error?.message ?? `vision_upstream_${response.status}`);
  const outputText = body.output_text ?? body.output?.flatMap((item: any) => item.content ?? []).find((item: any) => item.type === "output_text")?.text;
  if (!outputText) throw new Error("vision_empty_response");
  return { recognition: JSON.parse(outputText), provider: new URL(config.openaiApiBase).host, model: config.visionModel, responseId: body.id, createdAt: new Date().toISOString() };
}
