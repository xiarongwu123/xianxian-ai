export type AppPage = "capture" | "confirm" | "analysis" | "replay" | "watchlist" | "alerts" | "profile";

export interface RecognitionResult {
  symbol: string;
  name: string;
  exchange: string;
  industry: string;
  visualEvidence?: string[];
  visibleIndicators?: string[];
  visualWarnings?: string[];
  interval: "日 K" | "周 K";
  adjustment: "前复权" | "不复权";
  capturedAt: string;
  confidence: number;
  imageMatch: {
    priceError: number;
    matchedBars: number;
    totalBars: number;
    volumeAligned: boolean;
  };
}

export interface Scenario {
  kind: "bullish" | "range" | "bearish";
  title: string;
  trigger: string;
  description: string;
}

export interface MarketEvent {
  date: string;
  title: string;
  source: string;
  publishedAt: string;
  url?: string;
}

export interface AnalysisReport {
  id: string;
  recognition: RecognitionResult;
  price: number;
  priceChange: number;
  summary: string;
  detail: string;
  state: string;
  support: [number, number];
  resistance: number;
  invalidation: number;
  scenarios: Scenario[];
  fundamentals: Array<{ label: string; value: string }>;
  events: MarketEvent[];
  dataStatus?: "verified" | "partial" | "unavailable";
  dataSource?: { quote?: string; fundamentals?: string; retrievedAt?: string };
  status?: "recognized" | "completed" | "failed";
  generationStage?: "recognized" | "technical" | "fundamental" | "completed";
  analyst?: {
    technicalAnalysis?: {
      summary: string;
      structure: string;
      volumePrice: string;
      indicators: string;
      keyLevels: string[];
      evidence: string[];
    };
    fundamentalAnalysis?: {
      summary: string;
      stance: "支持" | "中性" | "压制" | "数据不足";
      financialView: string;
      eventImpact: string;
      catalysts: string[];
      risks: string[];
      evidence: Array<{ claim: string; source: string }>;
    };
    action?: "关注" | "等待" | "试探性参与" | "减仓" | "回避";
    direction?: "偏多" | "中性" | "偏空";
    conviction?: "高" | "中" | "低";
    headline?: string;
    rationale?: string;
    suitableFor?: string;
    entryCondition?: string;
    positionAdvice?: string;
    stopLoss?: string;
    targets?: string[];
    holdingPeriod?: string;
    risks?: string[];
    invalidation?: string;
    evidence?: Array<{ claim: string; source: string }>;
  };
}
