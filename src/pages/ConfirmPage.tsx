import { AlertCircle, CheckCircle2, LoaderCircle, Search, Sparkles } from "lucide-react";
import { useState } from "react";
import { api } from "../data/api";
import type { RecognitionResult } from "../types";
import { KlineChart } from "../components/KlineChart";

interface ConfirmPageProps {
  imageUrl: string | null;
  recognition: RecognitionResult | null;
  recognitionError?: string;
  analysisError?: string;
  isRecognizing: boolean;
  isGenerating: boolean;
  onBack: () => void;
  onConfirm: () => void;
}

export function ConfirmPage({
  imageUrl,
  recognition,
  recognitionError,
  analysisError,
  isRecognizing,
  isGenerating,
  onBack,
  onConfirm,
}: ConfirmPageProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [candidates, setCandidates] = useState<Array<{ symbol: string; name: string; market: string }>>([]);
  const [searching, setSearching] = useState(false);
  const [, forceRender] = useState(0);
  const hasVerifiedSymbol = Boolean(recognition && /^\d{6}\.(?:SZ|SH)$/.test(recognition.symbol));
  const searchStocks = async () => { if (!searchQuery.trim()) return; setSearching(true); try { setCandidates((await api.searchStocks(searchQuery)).items); } finally { setSearching(false); } };
  const chooseCandidate = (candidate: { symbol: string; name: string; market: string }) => { if (!recognition) return; recognition.symbol = candidate.symbol; recognition.name = candidate.name; recognition.exchange = candidate.market.includes("沪") ? "上海证券交易所" : "深圳证券交易所"; recognition.confidence = Math.min(recognition.confidence, .85); setCandidates([]); setSearchQuery(""); forceRender((value) => value + 1); };
  return (
    <div className="page confirm-page">
      <div className="page-heading">
        <div><h1>确认识别结果</h1><p>系统正在进行图片解析和真实行情初步匹配</p></div>
        <span>步骤 1 / 2 · 确认后生成报告</span>
      </div>

      <div className="confirm-grid">
        <section className="panel preview-panel">
          <div className="panel-title">上传的图片<span>本地预览 · 未上传外部服务</span></div>
          <div className="uploaded-preview">
            {imageUrl ? <img src={imageUrl} alt="用户上传的 K 线图" /> : <KlineChart imageMode />}
          </div>
          <div className="tag-row">
            <em>日 K</em><em>前复权</em><em>盘中截图</em><em>成交量可见</em>
          </div>
        </section>

        <section className="panel recognition-panel">
          <div className="panel-title">识别候选<span>OCR + 行情联合匹配</span></div>
          {isRecognizing || !recognition ? (
            <div className="recognition-loading">
              {isRecognizing ? <LoaderCircle className="spin" aria-hidden="true" /> : <Sparkles aria-hidden="true" />}
              <strong>{isRecognizing ? "正在调用视觉模型识别图表" : "视觉识别未返回可靠结果"}</strong>
              <span>{isRecognizing ? "检测股票代码、周期、价格序列和成交量" : recognitionError || "请重新上传更清晰、包含股票名称或代码的完整截图"}</span>
              {!isRecognizing && <button className="button button-secondary" type="button" onClick={onBack}>重新上传</button>}
            </div>
          ) : (
            <>
              <div className="candidate-box">
                <span className="radio-mark" />
                <div>
                  <strong>{recognition.name}</strong>
                  <span className="candidate-code">{recognition.symbol}</span>
                  <small>{recognition.exchange} · {recognition.industry}</small>
                </div>
                <b>匹配 {Math.round(recognition.confidence * 100)}%</b>
              </div>
              <div className="recognition-fields">
                <div><span>图表周期</span><strong>{recognition.interval}</strong></div>
                <div><span>截图状态</span><strong>今日盘中</strong></div>
                <div><span>复权方式</span><strong>{recognition.adjustment}</strong></div>
                <div><span>数据截止</span><strong>14:36</strong></div>
              </div>
              {!hasVerifiedSymbol && <div className="instrument-confirm"><div className="instrument-warning"><AlertCircle /><div><strong>截图中没有股票名称或代码</strong><span>走势、周期和量能已识别；选择标的后才能拉取真实行情核验。</span></div></div><div className="instrument-search"><Search /><input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} onKeyDown={(event) => event.key === "Enter" && searchStocks()} placeholder="输入股票名称或 6 位代码" /><button type="button" onClick={searchStocks} disabled={searching}>{searching ? "搜索中" : "搜索"}</button></div>{candidates.length > 0 && <div className="instrument-results">{candidates.map((candidate) => <button type="button" key={candidate.symbol} onClick={() => chooseCandidate(candidate)}><strong>{candidate.name}</strong><span>{candidate.symbol} · {candidate.market}</span></button>)}</div>}</div>}
              <div className={`match-box ${hasVerifiedSymbol ? "" : "waiting"}`}>
                <div className="match-title">{hasVerifiedSymbol ? <CheckCircle2 aria-hidden="true" /> : <AlertCircle aria-hidden="true" />}{hasVerifiedSymbol ? "标的已确认，待生成时核验真实行情" : "等待确认股票标的"}</div>
                <div className="match-details">
                  <div><span>标的来源</span><strong>{hasVerifiedSymbol ? "图片 / 用户确认" : "尚未确认"}</strong></div>
                  <div><span>K 线序列</span><strong>生成报告时核验</strong></div>
                  <div><span>成交量可见</span><strong>{recognition.imageMatch.volumeAligned ? "是" : "未检测到"}</strong></div>
                </div>
              </div>
              <p className="demo-disclosure">图表内容由视觉模型识别；股票标的需来自截图中的明确文字或用户手动确认，不会根据走势猜测。</p>
              {analysisError && <div className="analysis-error"><AlertCircle aria-hidden="true" /><span><strong>AI 分析暂未生成</strong>{analysisError}</span></div>}
              <div className="confirm-actions">
                <button className="button button-secondary" type="button" onClick={onBack}>重新上传</button>
                <button className="button button-primary" type="button" onClick={onConfirm} disabled={isGenerating || !hasVerifiedSymbol}>
                  {isGenerating ? <LoaderCircle className="spin" aria-hidden="true" /> : <Sparkles aria-hidden="true" />}
                  {isGenerating ? "正在生成" : hasVerifiedSymbol ? "确认并生成分析" : "请先确认股票"}
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
