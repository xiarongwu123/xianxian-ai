import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../auth";
import { generateAnalystConclusion, generateFundamentalAnalysis, generateSynthesis, generateTechnicalAnalysis } from "../analystService";

export const analysisRoutes = Router();
analysisRoutes.use(requireAuth);
const recognitionSchema = z.object({ symbol: z.string().regex(/^\d{6}\.(?:SZ|SH)$/), name: z.string().min(1), interval: z.string(), industry: z.string(), confidence: z.number() }).passthrough();
const handleError = (error: unknown, response: any, next: any) => {
  if (error instanceof DOMException && error.name === "TimeoutError") return response.status(504).json({ error: "analyst_timeout", message: "本阶段 AI 分析生成超时，请重试" });
  if (error instanceof Error && error.message === "analyst_api_not_configured") return response.status(503).json({ error: "analyst_api_not_configured", message: "AI 分析服务尚未配置" });
  if (error instanceof Error && error.message === "analyst_empty_response") return response.status(502).json({ error: "analyst_empty_response", message: "AI 服务未返回有效结论，请重试" });
  next(error);
};

const streamStage = async (response: any, run: (onDelta: (delta: string) => void) => Promise<unknown>) => {
  response.status(200).set({ "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive", "X-Accel-Buffering": "no" });
  response.flushHeaders();
  try {
    const result = await run((delta) => response.write(`${JSON.stringify({ type: "delta", delta })}\n`));
    response.write(`${JSON.stringify({ type: "complete", result })}\n`);
  } catch (error) {
    const message = error instanceof DOMException && error.name === "TimeoutError" ? "本阶段 AI 分析生成超时，请重试" : error instanceof Error ? error.message : "AI 分析生成失败";
    response.write(`${JSON.stringify({ type: "error", message })}\n`);
  } finally { response.end(); }
};

analysisRoutes.post("/technical", async (request, response, next) => { const parsed = z.object({ recognition: recognitionSchema }).safeParse(request.body); if (!parsed.success) return response.status(400).json({ error: "confirmed_instrument_required" }); try { response.json(await generateTechnicalAnalysis(parsed.data.recognition)); } catch (error) { handleError(error, response, next); } });
analysisRoutes.post("/fundamental", async (request, response, next) => { const parsed = z.object({ recognition: recognitionSchema }).safeParse(request.body); if (!parsed.success) return response.status(400).json({ error: "confirmed_instrument_required" }); try { response.json(await generateFundamentalAnalysis(parsed.data.recognition)); } catch (error) { handleError(error, response, next); } });
analysisRoutes.post("/synthesis", async (request, response, next) => { const parsed = z.object({ recognition: recognitionSchema, quote: z.unknown(), technicalAnalysis: z.record(z.string(), z.unknown()), fundamentalAnalysis: z.record(z.string(), z.unknown()) }).safeParse(request.body); if (!parsed.success) return response.status(400).json({ error: "analysis_stages_required" }); try { response.json(await generateSynthesis(parsed.data)); } catch (error) { handleError(error, response, next); } });
analysisRoutes.post("/technical/stream", async (request, response) => { const parsed = z.object({ recognition: recognitionSchema }).safeParse(request.body); if (!parsed.success) return response.status(400).json({ error: "confirmed_instrument_required" }); await streamStage(response, (onDelta) => generateTechnicalAnalysis(parsed.data.recognition, onDelta)); });
analysisRoutes.post("/fundamental/stream", async (request, response) => { const parsed = z.object({ recognition: recognitionSchema }).safeParse(request.body); if (!parsed.success) return response.status(400).json({ error: "confirmed_instrument_required" }); await streamStage(response, (onDelta) => generateFundamentalAnalysis(parsed.data.recognition, onDelta)); });
analysisRoutes.post("/synthesis/stream", async (request, response) => { const parsed = z.object({ recognition: recognitionSchema, quote: z.unknown(), technicalAnalysis: z.record(z.string(), z.unknown()), fundamentalAnalysis: z.record(z.string(), z.unknown()) }).safeParse(request.body); if (!parsed.success) return response.status(400).json({ error: "analysis_stages_required" }); await streamStage(response, (onDelta) => generateSynthesis(parsed.data, onDelta)); });

analysisRoutes.post("/generate", async (request, response, next) => {
  const parsed = z.object({ recognition: recognitionSchema }).safeParse(request.body);
  if (!parsed.success) return response.status(400).json({ error: "confirmed_instrument_required" });
  try {
    response.json(await generateAnalystConclusion(parsed.data.recognition));
  } catch (error) { handleError(error, response, next); }
});
