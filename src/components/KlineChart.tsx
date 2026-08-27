interface KlineChartProps {
  annotated?: boolean;
  imageMode?: boolean;
}

const candles = [
  [45, 218, 240, 223, 235, false],
  [70, 208, 234, 213, 227, true],
  [95, 199, 225, 205, 218, true],
  [120, 192, 221, 199, 213, false],
  [145, 182, 212, 188, 204, true],
  [170, 173, 206, 179, 197, true],
  [195, 169, 202, 176, 194, false],
  [220, 158, 192, 165, 183, true],
  [245, 146, 180, 153, 171, true],
  [270, 140, 176, 148, 167, false],
  [295, 124, 161, 131, 153, true],
  [320, 110, 147, 117, 139, true],
  [345, 97, 137, 104, 128, true],
  [370, 88, 129, 97, 120, false],
  [395, 75, 116, 83, 106, true],
  [420, 66, 109, 73, 100, true],
  [445, 72, 122, 82, 111, false],
  [470, 80, 128, 88, 116, true],
  [495, 62, 114, 72, 101, true],
  [520, 48, 101, 58, 89, true],
  [545, 42, 115, 65, 97, false],
] as const;

export function KlineChart({ annotated = false, imageMode = false }: KlineChartProps) {
  return (
    <svg
      className={`kline-chart${imageMode ? " image-chart" : ""}`}
      viewBox="0 0 620 310"
      role="img"
      aria-label="天娱数科日 K 图，近期放量上涨后冲高回落"
    >
      <g className="chart-grid">
        <path d="M20 38H580M20 90H580M20 142H580M20 194H580M20 246H580" />
        <path d="M120 25V250M240 25V250M360 25V250M480 25V250" />
      </g>
      {annotated && (
        <>
          <rect className="support-zone" x="20" y="160" width="560" height="28" />
          <line className="resistance-line" x1="20" y1="70" x2="580" y2="70" />
          <line className="support-line" x1="20" y1="174" x2="580" y2="174" />
        </>
      )}
      <g className="axis-labels">
        <text x="584" y="41">7.00</text>
        <text x="584" y="93">6.70</text>
        <text x="584" y="145">6.40</text>
        <text x="584" y="197">6.10</text>
        <text x="22" y="265">07/21</text>
        <text x="270" y="265">08/06</text>
        <text x="520" y="265">08/25</text>
        {annotated && (
          <>
            <text x="493" y="64" className="resistance-text">压力 6.68</text>
            <text x="448" y="187">支撑 6.32–6.38</text>
          </>
        )}
      </g>
      <path
        className="moving-average"
        d="M32 207 C92 196 118 202 168 185 S252 171 302 150 S390 117 443 104 S520 91 570 97"
      />
      <g strokeWidth="2">
        {candles.map(([x, high, low, open, close, up], index) => {
          const y = Math.min(open, close);
          const height = Math.max(Math.abs(open - close), 4);
          return (
            <g className={up ? "candle-up" : "candle-down"} key={index}>
              <line x1={x} x2={x} y1={high} y2={low} />
              <rect x={x - 6} y={y} width="12" height={height} />
            </g>
          );
        })}
      </g>
      <g className="volume-bars">
        {candles.map(([x, , , , , up], index) => {
          const height = 14 + ((index * 7) % 37);
          return (
            <rect
              className={up ? "volume-up" : "volume-down"}
              key={index}
              x={x - 6}
              y={300 - height}
              width="12"
              height={height}
            />
          );
        })}
      </g>
    </svg>
  );
}
