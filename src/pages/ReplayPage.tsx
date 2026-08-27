import { AlertCircle, Check, FileSearch, LoaderCircle, RotateCcw, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { HistoryItem } from "../components/ReportHistory";
import { api } from "../data/api";

export function ReplayPage({ userLoggedIn, reports, selected, onSelect, onLogin }: { userLoggedIn: boolean; reports: HistoryItem[]; selected?: HistoryItem; onSelect: (item: HistoryItem) => void; onLogin: () => void; }) {
  const item = selected ?? reports.find((entry) => entry.payload?.status === "completed") ?? reports[0];
  const report = item?.payload;
  const [live, setLive] = useState<any>(null), [loading, setLoading] = useState(false), [error, setError] = useState("");
  useEffect(() => { if (!report || !/^\d{6}\.(?:SZ|SH)$/.test(report.recognition.symbol)) { setLive(null); return; } setLoading(true); setError(""); api.research(report.recognition.symbol).then(setLive).catch((reason) => setError(reason instanceof Error ? reason.message : "真实行情核验失败")).finally(() => setLoading(false)); }, [item?.id]);
  if (!userLoggedIn) return <EmptyReplay title="登录后查看真实复盘" copy="复盘只使用你的历史报告与当前可核验行情" action={onLogin} />;
  if (!report || !item) return <EmptyReplay title="没有可复盘的报告" copy="先完成一次K线识别和分析，这里不会展示演示数据" />;
  const currentPrice = live?.quote?.price ?? 0, originalPrice = report.price ?? 0;
  const sinceChange = currentPrice > 0 && originalPrice > 0 ? (currentPrice / originalPrice - 1) * 100 : null;
  const supportHeld = currentPrice > 0 && report.support[0] > 0 ? currentPrice >= report.support[0] : null;
  const resistancePassed = currentPrice > 0 && report.resistance > 0 ? currentPrice >= report.resistance : null;
  const newAnnouncements = live?.announcements?.items?.filter((announcement: any) => Date.parse(announcement.publishedAt) > Date.parse(item.createdAt)) ?? [];
  const checks = [
    { passed: supportHeld, title: supportHeld === null ? "支撑位无法核验" : supportHeld ? "关键支撑仍有效" : "关键支撑已经跌破", copy: report.support[0] > 0 ? `原支撑区间 ${report.support[0]}–${report.support[1]}，当前价 ${currentPrice || "--"}。` : "原报告没有可靠支撑价格。" },
    { passed: resistancePassed, title: resistancePassed === null ? "压力位无法核验" : resistancePassed ? "主要压力已突破" : "主要压力尚未突破", copy: report.resistance > 0 ? `原压力位 ${report.resistance}，当前价 ${currentPrice || "--"}。` : "原报告没有可靠压力价格。" },
    { passed: newAnnouncements.length === 0, title: newAnnouncements.length ? `新增 ${newAnnouncements.length} 条公告事件` : "分析后暂无新增公告", copy: newAnnouncements[0]?.title ?? "公告源未发现晚于原分析时间的新记录。" },
  ];
  return <div className="page replay-page">
    <div className="page-heading"><div><h1>分析复盘</h1><p>{report.recognition.name} · {report.recognition.symbol} · 原分析时间 {new Date(item.createdAt).toLocaleString("zh-CN", { hour12: false })}</p></div><select className="replay-select" value={item.id} onChange={(event) => { const next = reports.find((entry) => entry.id === event.target.value); if (next) onSelect(next); }}>{reports.map((entry) => <option value={entry.id} key={entry.id}>{entry.name} · {new Date(entry.createdAt).toLocaleDateString("zh-CN")}</option>)}</select></div>
    {loading ? <ReplayStatus icon={<LoaderCircle className="spin" />} title="正在核验当前真实行情" copy="从行情与公告网关获取最新可用数据" /> : error ? <ReplayStatus icon={<AlertCircle />} title="真实数据暂不可用" copy={error} error /> : <section className="replay-status"><span className="replay-status-icon"><RotateCcw /></span><div><strong>{sinceChange === null ? "等待可靠行情" : `相较原分析价 ${sinceChange >= 0 ? "+" : ""}${sinceChange.toFixed(2)}%`}</strong><p>原结论：{report.summary}</p></div><span>核验时间<br />{live?.retrievedAt ? new Date(live.retrievedAt).toLocaleString("zh-CN", { hour12: false }) : "--"}</span></section>}
    <div className="replay-grid"><section className="panel replay-facts"><div className="panel-title">原报告与当前行情<span>真实数据对照</span></div><div className="replay-metrics"><div><span>原分析价格</span><strong>{originalPrice || "--"}</strong></div><div><span>当前价格</span><strong>{currentPrice || "--"}</strong></div><div><span>原方向</span><strong>{report.analyst?.direction ?? "待分析"}</strong></div><div><span>原建议</span><strong>{report.analyst?.action ?? "待分析"}</strong></div></div><div className="replay-conclusion"><strong>原综合研判：</strong>{report.detail}</div><div className="replay-source">当前行情来源：{live?.quote?.source ?? "暂不可用"}</div></section><section className="panel conditions-panel"><div className="panel-title">条件核验<span>基于当前报价</span></div>{checks.map((condition) => <div className="condition" key={condition.title}><span className={condition.passed === false ? "missed" : "passed"}>{condition.passed === false ? <X /> : <Check />}</span><div><strong>{condition.title}</strong><p>{condition.copy}</p></div></div>)}</section></div>
    <p className="workspace-disclosure">复盘使用原报告存档和当前公开行情进行条件核验，不伪造历史K线序列；不等同于收益归因。</p>
  </div>;
}

function EmptyReplay({ title, copy, action }: { title: string; copy: string; action?: () => void }) { return <div className="page replay-page"><div className="page-heading"><div><h1>分析复盘</h1><p>使用真实行情核验历史判断</p></div></div><section className="panel"><div className="empty-state"><FileSearch /><strong>{title}</strong><span>{copy}</span>{action && <button className="button button-primary" type="button" onClick={action}>立即登录</button>}</div></section></div>; }
function ReplayStatus({ icon, title, copy, error }: { icon: React.ReactNode; title: string; copy: string; error?: boolean }) { return <section className={`replay-status ${error ? "error" : ""}`}><span className="replay-status-icon">{icon}</span><div><strong>{title}</strong><p>{copy}</p></div></section>; }
