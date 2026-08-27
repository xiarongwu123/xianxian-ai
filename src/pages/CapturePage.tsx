import { ArrowDownRight, ArrowUpRight, Camera, Database, FileCheck2, FileSearch, ImageUp, RotateCcw, ScanLine, ScanText, ShieldCheck } from "lucide-react";
import { useRef } from "react";
import type { HistoryItem } from "../components/ReportHistory";

interface CapturePageProps {
  userLoggedIn: boolean;
  history: HistoryItem[];
  onRequireLogin: () => void;
  onFileSelected: (file: File) => void;
  onOpenReport: (item: HistoryItem) => void;
  onViewAll: () => void;
}

const trustItems = [
  { icon: ScanText, title: "识别标的与周期", copy: "低置信度时让你选择，不让 AI 自行猜测。" },
  { icon: Database, title: "匹配真实行情", copy: "价格、成交量和指标全部基于统一行情计算。" },
  { icon: FileCheck2, title: "来源与时间可追溯", copy: "财报、公告和事件都显示来源与发布时间。" },
  { icon: RotateCcw, title: "收盘后自动复盘", copy: "检查情景是否触发，记录判断为何成立或失效。" },
];

export function CapturePage({ userLoggedIn, history, onRequireLogin, onFileSelected, onOpenReport, onViewAll }: CapturePageProps) {
  const cameraInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);
  const openInput = (input: React.RefObject<HTMLInputElement | null>) => userLoggedIn ? input.current?.click() : onRequireLogin();
  const receiveFile = (event: React.ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (file) onFileSelected(file); event.target.value = ""; };

  return <div className="page capture-page">
    <div className="page-heading"><div><span className="eyebrow">CHART SCANNER</span><h1>拍下 K 线，获得可核验的 AI 研判</h1><p>识别图表后匹配真实 A 股行情、基本面与公告事件</p></div></div>
    <div className="capture-grid">
      <section className="capture-dropzone">
        <div className="capture-icon"><ScanLine /></div><span className="capture-kicker">新建分析</span><h2>拍摄或上传 K 线图</h2><p>对准完整图表，系统将识别趋势、量能与关键价位，并用真实行情二次核验。</p>
        <div className="capture-buttons"><button className="button button-accent capture-primary" type="button" onClick={() => openInput(cameraInput)}><Camera />扫描图表</button><button className="button button-secondary" type="button" onClick={() => openInput(galleryInput)}><ImageUp />从相册上传</button></div>
        <input ref={cameraInput} className="visually-hidden" type="file" accept="image/*" capture="environment" onChange={receiveFile} />
        <input ref={galleryInput} className="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp" onChange={receiveFile} />
        <div className="privacy-note"><ShieldCheck />自动遮挡账号、资产和持仓信息</div>
      </section>
      <section className="panel trust-panel"><div className="panel-title">为什么先核对？</div>{trustItems.map((item) => { const Icon = item.icon; return <div className="trust-item" key={item.title}><div className="trust-item-icon"><Icon /></div><div><strong>{item.title}</strong><p>{item.copy}</p></div></div>; })}</section>
    </div>
    <section className="panel recent-panel"><div className="panel-title">最近分析<button type="button" onClick={userLoggedIn ? onViewAll : onRequireLogin}>查看全部</button></div>
      {!userLoggedIn ? <div className="empty-state"><FileSearch /><strong>登录后查看分析记录</strong><span>最近识别与报告将从你的服务端账户读取</span><button className="button button-secondary" type="button" onClick={onRequireLogin}>立即登录</button></div> : history.length === 0 ? <div className="empty-state"><FileSearch /><strong>还没有分析记录</strong><span>完成第一次图表识别后会自动出现在这里</span></div> : <div className="recent-table" role="table" aria-label="最近分析">{history.slice(0, 3).map((item) => { const direction = item.payload?.analyst?.direction; return <button className="recent-row" role="row" type="button" key={item.id} onClick={() => onOpenReport(item)}><span className={`history-direction ${direction === "偏多" ? "positive" : direction === "偏空" ? "negative" : "neutral"}`}>{direction === "偏空" ? <ArrowDownRight /> : <ArrowUpRight />}</span><span><strong>{item.name}</strong><small>{item.symbol} · {item.interval} · {new Date(item.createdAt).toLocaleString("zh-CN", { hour12: false })}</small><b>{item.payload?.analyst?.headline ?? item.payload?.summary ?? "等待生成分析"}</b></span><span className={`direction-orb ${direction === "偏多" ? "bullish" : "neutral"}`}>{direction === "偏空" ? <ArrowDownRight /> : <ArrowUpRight />}<small>{direction ?? "待分析"}</small></span></button>; })}</div>}
    </section>
  </div>;
}
