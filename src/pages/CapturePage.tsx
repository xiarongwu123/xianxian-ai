import {
  ArrowUpRight,
  Camera,
  Database,
  FileCheck2,
  ImageUp,
  RotateCcw,
  ScanLine,
  ScanText,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import { KlineChart } from "../components/KlineChart";
import { useRef } from "react";

interface CapturePageProps {
  onFileSelected: (file: File) => void;
  onOpenReplay: () => void;
}

const trustItems = [
  {
    icon: ScanText,
    title: "识别标的与周期",
    copy: "低置信度时让你选择，不让 AI 自行猜测。",
  },
  {
    icon: Database,
    title: "匹配真实行情",
    copy: "价格、成交量和指标全部基于统一行情计算。",
  },
  {
    icon: FileCheck2,
    title: "来源与时间可追溯",
    copy: "财报、公告和事件都显示来源与发布时间。",
  },
  {
    icon: RotateCcw,
    title: "收盘后自动复盘",
    copy: "检查情景是否触发，记录判断为何成立或失效。",
  },
];

export function CapturePage({ onFileSelected, onOpenReplay }: CapturePageProps) {
  const fileInput = useRef<HTMLInputElement>(null);

  const chooseFile = () => fileInput.current?.click();

  return (
    <div className="page capture-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">CHART SCANNER</span>
          <h1>拍下 K 线，获得可核验的 AI 研判</h1>
          <p>识别图表后匹配真实 A 股行情、基本面与公告事件</p>
        </div>
        <span>今天剩余 3 次免费分析</span>
      </div>

      <div className="capture-grid">
        <section className="capture-dropzone">
          <div className="capture-icon"><ScanLine aria-hidden="true" /></div>
          <span className="capture-kicker">新建分析</span>
          <h2>拍摄或上传 K 线图</h2>
          <p>
            对准完整图表，系统将识别趋势、量能与关键价位，并用真实行情二次核验。
          </p>
          <div className="capture-buttons">
            <button className="button button-accent capture-primary" type="button" onClick={chooseFile}>
              <Camera aria-hidden="true" />扫描图表
            </button>
            <button className="button button-secondary" type="button" onClick={chooseFile}>
              <ImageUp aria-hidden="true" />从相册上传
            </button>
          </div>
          <input
            ref={fileInput}
            className="visually-hidden"
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onFileSelected(file);
            }}
          />
          <div className="privacy-note"><ShieldCheck aria-hidden="true" />自动遮挡账号、资产和持仓信息</div>
        </section>

        <section className="panel trust-panel">
          <div className="panel-title">为什么先核对？</div>
          {trustItems.map((item) => {
            const Icon = item.icon;
            return (
              <div className="trust-item" key={item.title}>
                <div className="trust-item-icon"><Icon aria-hidden="true" /></div>
                <div><strong>{item.title}</strong><p>{item.copy}</p></div>
              </div>
            );
          })}
        </section>
      </div>

      <section className="panel recent-panel">
        <div className="panel-title">最近分析<button type="button">查看全部</button></div>
        <div className="recent-table" role="table" aria-label="最近分析">
          <button className="recent-row" role="row" type="button" onClick={onOpenReplay}>
            <span className="history-chart"><KlineChart /></span>
            <span><strong>天娱数科</strong><small>002354.SZ · 日 K · 08/21 14:36</small><b>突破后等待量能确认</b></span>
            <span className="direction-orb bullish"><ArrowUpRight /><small>偏强</small></span>
          </button>
          <div className="recent-row" role="row">
            <span className="history-chart alt"><TrendingUp /></span>
            <span><strong>贵州茅台</strong><small>600519.SH · 周 K · 08/19 10:12</small><b>中期趋势等待确认</b></span>
            <span className="direction-orb neutral"><ArrowUpRight /><small>观察</small></span>
          </div>
        </div>
      </section>
    </div>
  );
}
