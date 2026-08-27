import { Check, CheckCircle2, RotateCcw, X } from "lucide-react";
import { ReplayChart } from "../components/ReplayChart";

const conditions = [
  { passed: false, title: "偏强触发：未满足", copy: "没有连续收盘站稳 6.68，成交量也未达到 20 日均量 1.3 倍。" },
  { passed: true, title: "震荡区间：成立", copy: "三个交易日收盘价均处于 6.32–6.68。" },
  { passed: true, title: "关键支撑：有效", copy: "最低触及 6.35 后回升，尚未跌破区间下沿。" },
  { passed: true, title: "期间无重大新公告", copy: "原判断未被突发公司事件干扰。" },
];

export function ReplayPage() {
  return (
    <div className="page replay-page">
      <div className="page-heading">
        <div><h1>分析复盘</h1><p>天娱数科 · 002354.SZ · 原分析时间 2026/08/21 14:36</p></div>
        <span>复盘窗口：3 个交易日</span>
      </div>

      <section className="replay-status">
        <span className="replay-status-icon"><RotateCcw aria-hidden="true" /></span>
        <div><strong>震荡情景成立，偏强条件未触发</strong><p>价格始终未有效站稳 6.68，原分析没有发出追涨结论。</p></div>
        <span>自动复盘<br />08/25 15:10</span>
      </section>

      <div className="replay-grid">
        <section className="panel replay-chart-panel">
          <div className="panel-title">判断与实际走势<span>前复权 · 收盘价</span></div>
          <ReplayChart />
          <div className="replay-conclusion"><strong>复盘结论：</strong>突破时成交量没有继续放大，价格两次接近 6.68 后回落；原设定的震荡情景覆盖了实际走势，6.32 支撑暂未被破坏。</div>
        </section>
        <section className="panel conditions-panel">
          <div className="panel-title">条件核验<span>程序自动判断</span></div>
          {conditions.map((condition) => (
            <div className="condition" key={condition.title}>
              <span className={condition.passed ? "passed" : "missed"}>{condition.passed ? <Check /> : <X />}</span>
              <div><strong>{condition.title}</strong><p>{condition.copy}</p></div>
            </div>
          ))}
        </section>
      </div>

      <div className="replay-timeline">
        <div><strong>08/21 · 拍照分析</strong><span>识别盘中放量冲高，等待收盘确认。</span></div>
        <div><strong>08/21 · 收盘复核</strong><span>未站稳 6.68，自动转入震荡观察。</span></div>
        <div><strong>08/22 · 条件检查</strong><span>支撑有效，量能继续回落。</span></div>
        <div><strong>08/25 · 自动复盘</strong><span>震荡情景成立，记录影响因素。</span></div>
      </div>
    </div>
  );
}
