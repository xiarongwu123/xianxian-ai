import { ArrowDownRight, ArrowUpRight, CheckCircle2, Crosshair, Gauge, Info, Newspaper, ShieldCheck, Sparkles, Target, TrendingUp, Waves } from "lucide-react";
import { useState } from "react";
import type { AnalysisReport } from "../types";
import { KlineChart } from "../components/KlineChart";

type ReportView = "technical" | "fundamental" | "combined";

function readableStream(raw: string) {
  const values: string[] = [];
  const pattern = /:\s*"((?:\\.|[^"\\])*)(?:"|$)/g;
  for (const match of raw.matchAll(pattern)) {
    const value = match[1].replace(/\\n/g, "\n").replace(/\\"/g, "\"").replace(/\\\\/g, "\\");
    if (value && !values.includes(value)) values.push(value);
  }
  return values.join("\n");
}

export function AnalysisPage({ report, streamingStage, streamingText = "" }: { report: AnalysisReport; streamingStage?: "technical" | "fundamental" | "combined" | null; streamingText?: string }) {
  const [view, setView] = useState<ReportView>("technical");
  const { recognition, analyst } = report;
  const technical = analyst?.technicalAnalysis;
  const fundamental = analyst?.fundamentalAnalysis;
  const stage = report.generationStage ?? "completed";
  const directionClass = analyst?.direction === "偏空" ? "bearish" : analyst?.direction === "中性" ? "neutral" : "";

  return <div className="page analysis-page">
    <div className="asset-heading">
      <div><div className="asset-name-row"><h1>{recognition.name}</h1><span>{recognition.symbol}</span><em className={`status-tag ${report.dataStatus === "unavailable" ? "pending" : "verified"}`}><CheckCircle2 />{report.price > 0 ? "行情已核验" : "行情暂不可用"}</em></div><p>{recognition.interval} · {recognition.adjustment} · 截图识别于 {recognition.capturedAt}</p></div>
      <div className="asset-price">{report.price > 0 ? report.price.toFixed(2) : "--"}<small>{report.price > 0 ? `${report.priceChange >= 0 ? "+" : ""}${report.priceChange.toFixed(2)}%` : "等待可靠行情"}</small></div>
    </div>

    <div className="report-tabs three-tabs" role="tablist" aria-label="三层分析报告">
      <button className={view === "technical" ? "active" : ""} onClick={() => setView("technical")}><TrendingUp />图表技术分析<small>{stage === "recognized" ? "生成中" : "已完成"}</small></button>
      <button className={view === "fundamental" ? "active" : ""} onClick={() => setView("fundamental")}><Newspaper />基本面与事件<small>{stage === "technical" ? "生成中" : "已完成"}</small></button>
      <button className={view === "combined" ? "active" : ""} onClick={() => setView("combined")}><Sparkles />综合研判<small>{stage === "completed" ? "已完成" : stage === "fundamental" ? "生成中" : "排队中"}</small></button>
    </div>
    {streamingStage && <section className="live-analysis"><div><Sparkles className="spin" /><strong>{streamingStage === "technical" ? "正在分析图表技术证据" : streamingStage === "fundamental" ? "正在分析基本面与事件" : "正在生成综合研判"}</strong><span>实时生成</span></div><p>{readableStream(streamingText) || "正在连接 AI 分析师..."}<i /></p></section>}

    {view === "technical" && <>
      <section className="section-intro technical-intro"><span><TrendingUp />01 图表技术分析</span><h2>{technical?.summary ?? recognition.industry}</h2><p>结论只基于上传截图中可见的 K 线、量价和指标，并结合真实行情核验，不使用基本面替代图表证据。</p></section>
      <section className="signal-grid technical-signals">
        <div><span className="signal-icon green"><TrendingUp /></span><p>走势结构</p><strong>{technical?.structure ?? recognition.industry}</strong><small>截图可见结构</small></div>
        <div><span className="signal-icon amber"><Waves /></span><p>量价关系</p><strong>{technical?.volumePrice ?? (recognition.imageMatch.volumeAligned ? "成交量可见，待结合走势判断" : "截图未见可靠成交量")}</strong><small>量能与价格配合</small></div>
        <div><span className="signal-icon green"><Gauge /></span><p>可见指标</p><strong>{technical?.indicators ?? recognition.visibleIndicators?.join("、") ?? "未识别到可靠指标"}</strong><small>不推测被裁切指标</small></div>
        <div><span className="signal-icon amber"><Crosshair /></span><p>识别可信度</p><strong>{Math.round(recognition.confidence * 100)}%</strong><small>视觉模型识别</small></div>
      </section>
      <div className="analysis-grid">
        <section className="panel chart-panel"><div className="panel-title">上传图表证据<span>截图信号与关键位</span></div><KlineChart annotated /><div className="level-grid"><div><span>当前结构</span><strong>{report.state}</strong></div><div><span>参考支撑</span><strong>{report.price > 0 ? `${report.support[0]}–${report.support[1]}` : "待行情核验"}</strong></div><div><span>参考压力</span><strong>{report.resistance || "待行情核验"}</strong></div></div></section>
        <section className="panel evidence-panel"><div className="panel-title">逐条技术证据<span>{technical?.evidence.length ?? recognition.visualEvidence?.length ?? 0} 条</span></div>{(technical?.evidence ?? recognition.visualEvidence ?? ["截图证据不足，建议上传包含完整 K 线、成交量和指标名称的图片"]).map((item, index) => <div className="evidence-row" key={`${index}-${item}`}><b>{String(index + 1).padStart(2, "0")}</b><p>{item}</p></div>)}{technical?.keyLevels?.length ? <div className="key-levels"><span>模型识别关键位</span><div className="target-pills">{technical.keyLevels.map((level) => <em key={level}>{level}</em>)}</div></div> : null}</section>
      </div>
    </>}

    {view === "fundamental" && <>
      {!fundamental && <div className="stage-loading"><Sparkles className="spin" /><strong>正在生成基本面与事件分析</strong><span>技术分析已经可以查看，本阶段完成后会自动更新。</span></div>}
      <section className="section-intro fundamental-intro"><span><Newspaper />02 基本面与事件分析</span><h2>{fundamental?.summary ?? "公开财务与公告信息核验"}</h2><p>{fundamental?.financialView ?? "根据可获取的公开财务数据评估经营质量与估值风险。"}</p><em className={`stance-tag stance-${fundamental?.stance ?? "数据不足"}`}>{fundamental?.stance ?? "数据不足"}</em></section>
      {fundamental && <div className="fundamental-thesis"><div><span>事件影响</span><strong>{fundamental.eventImpact}</strong></div><div><span>潜在催化</span><strong>{fundamental.catalysts.join("；")}</strong></div><div><span>基本面风险</span><strong>{fundamental.risks.join("；")}</strong></div></div>}
      <div className="analysis-lower-grid news-view">
        <section className="panel fundamentals-panel"><div className="panel-title">基本面快照<span>{report.dataStatus === "verified" ? "公开数据已核验" : "部分数据可用"}</span></div><div className="fundamentals-grid">{report.fundamentals.map((item) => <div key={item.label}><span>{item.label}</span><strong>{item.value}</strong></div>)}</div>{fundamental?.evidence.map((item) => <div className="source-evidence" key={`${item.claim}-${item.source}`}><p>{item.claim}</p><small>{item.source}</small></div>)}</section>
        <section className="panel events-panel"><div className="panel-title">公告与事件<span>交易所 / 公司信源</span></div>{report.events.length ? report.events.map((event, index) => <div className={`event-row event-${index}`} key={`${event.date}-${event.title}`} onClick={() => event.url && window.open(event.url, "_blank", "noopener,noreferrer")}><time>{event.date}</time><div><strong>{event.title}</strong><span>来源：{event.source} · {event.publishedAt}</span></div><ArrowUpRight /></div>) : <div className="empty-inline">暂无可核验的近期公告事件</div>}</section>
      </div>
    </>}

    {view === "combined" && <>
      {stage !== "completed" && <div className="stage-loading"><Sparkles className="spin" /><strong>{stage === "fundamental" ? "正在生成综合研判" : "等待基本面与事件分析完成"}</strong><span>最终行动、仓位和风控结论会在这里自动出现。</span></div>}
      <section className="section-intro combined-intro"><span><Sparkles />03 综合研判</span><h2>图表证据 + 基本面事件 + 真实行情</h2><p>综合结论必须能够追溯到前两部分证据，并使用条件、仓位和失效点表达，不提供无条件买卖指令。</p></section>
      <section className="ai-plan"><div className="plan-copy"><span><Sparkles />AI 分析师结论</span><strong>{analyst?.action ?? report.state}</strong><h2>{report.summary}</h2><p>{report.detail}</p></div><div className={`plan-direction ${directionClass}`}>{analyst?.direction === "偏空" ? <ArrowDownRight /> : <ArrowUpRight />}<span>{analyst?.direction ?? "待判断"}</span></div><div className="plan-meta"><span>综合确信度</span><strong>{analyst?.conviction ?? "低"}</strong><span>适用周期</span><strong>{analyst?.holdingPeriod ?? recognition.interval}</strong></div></section>
      {stage === "completed" && analyst && <section className="analyst-grid"><div className="analyst-action-card"><span><Crosshair />执行方案</span><div><p>入场/操作条件</p><strong>{analyst.entryCondition}</strong></div><div><p>仓位建议</p><strong>{analyst.positionAdvice}</strong></div><div><p>适合人群</p><strong>{analyst.suitableFor}</strong></div></div><div className="analyst-action-card risk"><span><ShieldCheck />风控方案</span><div><p>止损设置</p><strong>{analyst.stopLoss}</strong></div><div><p>判断失效</p><strong>{analyst.invalidation}</strong></div><div><p>主要风险</p><strong>{analyst.risks?.join("；")}</strong></div></div><div className="analyst-targets"><span><Target />目标与综合证据</span><div className="target-pills">{analyst.targets?.map((target) => <em key={target}>{target}</em>)}</div>{analyst.evidence?.map((item) => <div className="analyst-evidence" key={`${item.claim}-${item.source}`}><p>{item.claim}</p><small>{item.source}</small></div>)}</div></section>}
      <section className="panel scenarios-panel combined-scenarios"><div className="panel-title">条件化执行路径<span>不是收益承诺</span></div>{report.scenarios.map((scenario) => <div className={`scenario ${scenario.kind}`} key={scenario.kind}><div><strong>{scenario.title}</strong><b>{scenario.trigger}</b></div><p>{scenario.description}</p></div>)}<div className="scenario-note"><Info />不显示虚假的涨跌概率，仅展示触发条件与失效点。</div></section>
    </>}

    <div className="data-disclosure"><ShieldCheck /><span><strong>风险提示：</strong>AI 结论基于当前截图和可用公开数据生成，是有条件的研究建议，不保证收益。来源：{report.dataSource?.quote ?? "行情暂不可用"} / {report.dataSource?.fundamentals ?? "财务暂不可用"}。</span></div>
  </div>;
}
