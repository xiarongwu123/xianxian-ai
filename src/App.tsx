import { useEffect, useRef, useState } from "react";
import { AppShell } from "./components/AppShell";
import { LoginModal, type SessionUser } from "./components/LoginModal";
import { api, buildAnalysisReport } from "./data/api";
import { AnalysisPage } from "./pages/AnalysisPage";
import { CapturePage } from "./pages/CapturePage";
import { ConfirmPage } from "./pages/ConfirmPage";
import { ReplayPage } from "./pages/ReplayPage";
import { WatchlistPage } from "./pages/WatchlistPage";
import { AlertsPage } from "./pages/AlertsPage";
import { ProfilePage } from "./pages/ProfilePage";
import { ReportHistory, type HistoryItem } from "./components/ReportHistory";
import type { AnalysisReport, AppPage, RecognitionResult } from "./types";

export default function App() {
  const [page, setPage] = useState<AppPage>("capture");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [recognition, setRecognition] = useState<RecognitionResult | null>(null);
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [startCreatingAlert, setStartCreatingAlert] = useState(false);
  const [user, setUser] = useState<SessionUser | null>(api.currentUser());
  const [uploadId, setUploadId] = useState<string>();
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [recognitionError, setRecognitionError] = useState("");
  const [analysisError, setAnalysisError] = useState("");
  const [reportRecordId, setReportRecordId] = useState<string>();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [replayItem, setReplayItem] = useState<HistoryItem>();
  const [streamingText, setStreamingText] = useState("");
  const [streamingStage, setStreamingStage] = useState<"technical" | "fundamental" | "combined" | null>(null);
  const streamQueue = useRef("");
  const streamTimer = useRef<number | undefined>(undefined);

  const resetStreamText = () => {
    streamQueue.current = "";
    if (streamTimer.current) window.clearInterval(streamTimer.current);
    streamTimer.current = undefined;
    setStreamingText("");
  };

  const enqueueStreamText = (delta: string) => {
    streamQueue.current += delta;
    if (streamTimer.current) return;
    streamTimer.current = window.setInterval(() => {
      const next = streamQueue.current.slice(0, 1);
      streamQueue.current = streamQueue.current.slice(1);
      if (next) setStreamingText((value) => (value + next).slice(-5000));
      if (!streamQueue.current) {
        window.clearInterval(streamTimer.current);
        streamTimer.current = undefined;
      }
    }, 18);
  };

  const loadHistory = () => { if (user) api.reports().then((result) => setHistory(result.items)).catch(() => setHistory([])); else setHistory([]); };

  const handleLogin = (nextUser: SessionUser) => {
    setUser(nextUser); setLoginOpen(false);
    if (pendingFile) {
      const file = pendingFile;
      setPendingFile(null);
      void recognizeUploadedFile(file);
    }
  };
  const handleLogout = async () => { await api.logout(); setUser(null); };
  const handleNavigate = (nextPage: AppPage) => { if (nextPage === "analysis" && page !== "confirm") setReport(null); setPage(nextPage); };

  useEffect(() => { api.me().then(setUser); }, []);
  useEffect(() => { if (user && (page === "capture" || page === "analysis" || page === "replay")) loadHistory(); else if (!user) setHistory([]); }, [page, user]);

  useEffect(() => () => {
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    if (streamTimer.current) window.clearInterval(streamTimer.current);
  }, [imageUrl]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [page]);

  const recognizeUploadedFile = async (file: File) => {
    setIsRecognizing(true);
    setRecognitionError("");
    try {
      const uploaded = await api.uploadChart(file);
      setUploadId(uploaded.id);
      const vision = await api.recognizeChart(uploaded.id);
      const detected = vision.recognition;
      const recognized: RecognitionResult = {
        symbol: detected.symbol ?? "待确认",
        name: detected.name ?? "未识别标的",
        exchange: detected.symbol?.endsWith(".SH") ? "上海证券交易所" : detected.symbol?.endsWith(".SZ") ? "深圳证券交易所" : "待确认交易所",
        industry: detected.trend || "图表识别结果",
        visualEvidence: detected.evidence ?? [],
        visibleIndicators: detected.visibleIndicators ?? [],
        visualWarnings: detected.warnings ?? [],
        interval: detected.interval === "周 K" ? "周 K" : "日 K",
        adjustment: detected.adjustment === "不复权" ? "不复权" : "前复权",
        capturedAt: new Date().toLocaleString("zh-CN", { hour12: false }),
        confidence: detected.confidence,
        imageMatch: { priceError: 0, matchedBars: 0, totalBars: 0, volumeAligned: detected.visibleIndicators?.some((item: string) => item.includes("成交量")) ?? false },
      };
      setRecognition(recognized);
      const draft: AnalysisReport = {
        id: crypto.randomUUID(), recognition: recognized, price: 0, priceChange: 0,
        summary: "视觉识别完成，等待 AI 分析师生成结论", detail: recognized.industry,
        state: "待分析", support: [0, 0], resistance: 0, invalidation: 0, scenarios: [], fundamentals: [], events: [], dataStatus: "unavailable", status: "recognized",
      };
      const saved = await api.saveReport(draft, uploaded.id);
      setReportRecordId(saved.id);
    } catch (error) {
      console.error("Vision recognition failed", error);
      setRecognition(null);
      setRecognitionError(error instanceof Error ? error.message : "视觉识别失败，请重试");
    } finally { setIsRecognizing(false); }
  };

  const handleFileSelected = async (file: File) => {
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    setImageUrl(URL.createObjectURL(file));
    setRecognition(null);
    setPage("confirm");
    if (!user) {
      setPendingFile(file);
      setRecognitionError("登录后将自动继续识别这张图片");
      setLoginOpen(true);
      return;
    }
    await recognizeUploadedFile(file);
  };

  const handleConfirm = async () => {
    if (!recognition || !/^\d{6}\.(?:SZ|SH)$/.test(recognition.symbol)) return;
    setIsGenerating(true);
    setAnalysisError("");
    resetStreamText();
    const collectDelta = (stage: "technical" | "fundamental" | "combined") => {
      setStreamingStage(stage);
      return enqueueStreamText;
    };
    try {
      const streamingDraft: AnalysisReport = {
        id: crypto.randomUUID(), recognition, price: 0, priceChange: 0, summary: "AI 正在读取图表证据", detail: "分析内容将实时显示",
        state: "生成中", support: [0, 0], resistance: 0, invalidation: 0, scenarios: [], fundamentals: [], events: [], dataStatus: "unavailable", status: "recognized", generationStage: "recognized",
      };
      setReport(streamingDraft);
      setPage("analysis");
      const technical = await api.streamTechnical(recognition, collectDelta("technical"));
      let result = buildAnalysisReport(recognition, technical.research, { technicalAnalysis: technical.technicalAnalysis }, "technical");
      setReport(result);
      let activeReportId = reportRecordId;
      if (user) {
        if (activeReportId) await api.updateReport(activeReportId, result);
        else { const saved = await api.saveReport(result, uploadId); activeReportId = saved.id; setReportRecordId(saved.id); }
        loadHistory();
      }
      setIsGenerating(false);

      resetStreamText();
      const fundamental = await api.streamFundamental(recognition, collectDelta("fundamental"));
      result = buildAnalysisReport(recognition, fundamental.research, { technicalAnalysis: technical.technicalAnalysis, fundamentalAnalysis: fundamental.fundamentalAnalysis }, "fundamental");
      setReport(result);
      if (user && activeReportId) await api.updateReport(activeReportId, result);

      resetStreamText();
      const combined = await api.streamSynthesis({ recognition, quote: technical.research.quote, technicalAnalysis: technical.technicalAnalysis, fundamentalAnalysis: fundamental.fundamentalAnalysis }, collectDelta("combined"));
      result = buildAnalysisReport(recognition, technical.research, { ...combined.synthesis, technicalAnalysis: technical.technicalAnalysis, fundamentalAnalysis: fundamental.fundamentalAnalysis }, "completed");
      setReport(result);
      if (user && activeReportId) { await api.updateReport(activeReportId, result); loadHistory(); }
      setStreamingStage(null); resetStreamText();
    } catch (error) {
      console.error("AI analysis failed", error);
      const message = error instanceof Error ? error.message : "AI 分析生成失败，请稍后重试";
      setAnalysisError(message);
      setStreamingStage(null);
      setReport((current) => current ? { ...current, detail: `${current.detail} 后续阶段失败：${message}` } : current);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <AppShell page={page} onNavigate={handleNavigate} user={user} onOpenLogin={() => setLoginOpen(true)} onLogout={handleLogout}>
      {page === "capture" && <CapturePage userLoggedIn={Boolean(user)} history={history} onRequireLogin={() => setLoginOpen(true)} onFileSelected={handleFileSelected} onOpenReport={(item) => { setReport(item.payload); setReportRecordId(item.id); setPage("analysis"); }} onViewAll={() => handleNavigate("analysis")} />}
      {page === "confirm" && <ConfirmPage imageUrl={imageUrl} recognition={recognition} recognitionError={recognitionError} analysisError={analysisError} isRecognizing={isRecognizing} isGenerating={isGenerating} onBack={() => setPage("capture")} onConfirm={handleConfirm} />}
      {page === "analysis" && (report ? <AnalysisPage report={report} streamingStage={streamingStage} streamingText={streamingText} /> : <div className="page workspace-page"><div className="workspace-heading"><div><span className="eyebrow">RESEARCH ARCHIVE</span><h1>分析记录</h1><p>每次识别与 AI 分析都会自动保存</p></div><button className="button button-primary" type="button" onClick={() => setPage("capture")}>新建识别</button></div><ReportHistory items={history} onOpen={(item) => { setReport(item.payload); setReportRecordId(item.id); }} /></div>)}
      {page === "replay" && <ReplayPage userLoggedIn={Boolean(user)} reports={history} selected={replayItem} onSelect={setReplayItem} onLogin={() => setLoginOpen(true)} />}
      {page === "watchlist" && <WatchlistPage user={user} onLogin={() => setLoginOpen(true)} onCreateAlert={() => { setStartCreatingAlert(true); setPage("alerts"); }} />}
      {page === "alerts" && <AlertsPage user={user} onLogin={() => setLoginOpen(true)} startCreating={startCreatingAlert} />}
      {page === "profile" && <ProfilePage user={user} onLogin={() => setLoginOpen(true)} onLogout={handleLogout} onNavigate={setPage} />}
      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} onSuccess={handleLogin} />
    </AppShell>
  );
}
