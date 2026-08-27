import { config } from "./config";
import { buildResearch } from "./researchGateway";

const technicalSchema = { type: "object", additionalProperties: false, properties: { summary: { type: "string" }, structure: { type: "string" }, volumePrice: { type: "string" }, indicators: { type: "string" }, keyLevels: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 4 }, evidence: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 8 } }, required: ["summary", "structure", "volumePrice", "indicators", "keyLevels", "evidence"] };
const evidenceSchema = { type: "object", additionalProperties: false, properties: { claim: { type: "string" }, source: { type: "string" } }, required: ["claim", "source"] };
const fundamentalSchema = { type: "object", additionalProperties: false, properties: { summary: { type: "string" }, stance: { type: "string", enum: ["支持", "中性", "压制", "数据不足"] }, financialView: { type: "string" }, eventImpact: { type: "string" }, catalysts: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 4 }, risks: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 5 }, evidence: { type: "array", items: evidenceSchema, minItems: 1, maxItems: 8 } }, required: ["summary", "stance", "financialView", "eventImpact", "catalysts", "risks", "evidence"] };
const synthesisSchema = { type: "object", additionalProperties: false, properties: { action: { type: "string", enum: ["关注", "等待", "试探性参与", "减仓", "回避"] }, direction: { type: "string", enum: ["偏多", "中性", "偏空"] }, conviction: { type: "string", enum: ["高", "中", "低"] }, headline: { type: "string" }, rationale: { type: "string" }, suitableFor: { type: "string" }, entryCondition: { type: "string" }, positionAdvice: { type: "string" }, stopLoss: { type: "string" }, targets: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 3 }, holdingPeriod: { type: "string" }, risks: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 5 }, invalidation: { type: "string" }, evidence: { type: "array", items: evidenceSchema, minItems: 2, maxItems: 8 } }, required: ["action", "direction", "conviction", "headline", "rationale", "suitableFor", "entryCondition", "positionAdvice", "stopLoss", "targets", "holdingPeriod", "risks", "invalidation", "evidence"] };

type DeltaHandler = (delta: string) => void;

async function structured(prompt: string, name: string, schema: object, onDelta?: DeltaHandler) {
  if (!config.openaiApiKey) throw new Error("analyst_api_not_configured");
  const response = await fetch(`${config.openaiApiBase}/responses`, { method: "POST", headers: { Authorization: `Bearer ${config.openaiApiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: config.visionModel, input: [{ role: "user", content: [{ type: "input_text", text: prompt }] }], text: { format: { type: "json_schema", name, strict: true, schema } }, stream: Boolean(onDelta) }), signal: AbortSignal.timeout(config.analystTimeoutMs) });
  if (onDelta && response.ok && response.body && response.headers.get("content-type")?.includes("text/event-stream")) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "", outputText = "";
    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const data = line.slice(5).trim();
        if (!data || data === "[DONE]") continue;
        try {
          const event = JSON.parse(data);
          if (event.type === "response.output_text.delta" && typeof event.delta === "string") {
            outputText += event.delta;
            onDelta(event.delta);
          }
        } catch { /* Ignore non-JSON heartbeat lines. */ }
      }
      if (done) break;
    }
    if (!outputText) throw new Error("analyst_empty_response");
    return JSON.parse(outputText);
  }
  const body = await response.json() as any;
  if (!response.ok) throw new Error(body?.error?.message ?? `analyst_upstream_${response.status}`);
  const outputText = body.output_text ?? body.output?.flatMap((item: any) => item.content ?? []).find((item: any) => item.type === "output_text")?.text;
  if (!outputText) throw new Error("analyst_empty_response");
  return JSON.parse(outputText);
}

const instrumentFacts = (recognition: any) => ({ symbol: recognition.symbol, name: recognition.name, interval: recognition.interval, trend: recognition.industry, evidence: recognition.visualEvidence, indicators: recognition.visibleIndicators, warnings: recognition.visualWarnings, confidence: recognition.confidence });

export async function generateTechnicalAnalysis(recognition: any, onDelta?: DeltaHandler) {
  const research = await buildResearch(String(recognition.symbol).slice(0, 6)) as any;
  const technicalAnalysis = await structured(`你是A股图表技术分析师。只分析截图识别事实和真实行情，不引用基本面，不把图中不可见指标当证据。说明结构、量价、可见指标、关键位和逐条证据；不能编造截图中不存在的数字。\n数据：${JSON.stringify({ instrument: instrumentFacts(recognition), quote: research.quote, quoteStatus: research.status?.quote })}`, "technical_analysis", technicalSchema, onDelta);
  return { technicalAnalysis, research };
}

export async function generateFundamentalAnalysis(recognition: any, onDelta?: DeltaHandler) {
  const research = await buildResearch(String(recognition.symbol).slice(0, 6)) as any;
  const fundamentalAnalysis = await structured(`你是A股基本面与事件分析师。只根据提供的财务与公告数据，判断它们对该股票是支持、中性、压制或数据不足。每条关键判断注明来源；数据缺失不得编造。\n数据：${JSON.stringify({ instrument: { symbol: recognition.symbol, name: recognition.name }, fundamentals: research.fundamentals, announcements: research.announcements?.items?.slice(0, 5), dataStatus: research.status })}`, "fundamental_analysis", fundamentalSchema, onDelta);
  return { fundamentalAnalysis, research };
}

export async function generateSynthesis(input: any, onDelta?: DeltaHandler) {
  const synthesis = await structured(`你是审慎的A股综合研究分析师。根据已经完成的技术分析、基本面事件分析和当前行情，生成有条件的最终研判。明确说明两类证据如何支持结论；不能保证收益或编造数字。仓位必须是区间且不超过30%，止损和目标必须基于当前价格或明确写等待条件。\n数据：${JSON.stringify(input)}`, "synthesis_analysis", synthesisSchema, onDelta);
  return { synthesis };
}

export async function generateAnalystConclusion(recognition: any) {
  const technical = await generateTechnicalAnalysis(recognition);
  const fundamental = await generateFundamentalAnalysis(recognition);
  const combined = await generateSynthesis({ instrument: instrumentFacts(recognition), quote: technical.research.quote, technicalAnalysis: technical.technicalAnalysis, fundamentalAnalysis: fundamental.fundamentalAnalysis });
  return { analyst: { ...combined.synthesis, technicalAnalysis: technical.technicalAnalysis, fundamentalAnalysis: fundamental.fundamentalAnalysis }, research: technical.research, model: config.visionModel };
}
