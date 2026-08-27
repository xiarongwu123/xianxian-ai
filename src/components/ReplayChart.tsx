export function ReplayChart() {
  return (
    <svg
      className="replay-chart"
      viewBox="0 0 620 265"
      role="img"
      aria-label="原判断区间与之后三个交易日实际走势"
    >
      <g className="chart-grid">
        <path d="M25 35H590M25 85H590M25 135H590M25 185H590M25 235H590" />
        <path d="M165 25V235M305 25V235M445 25V235" />
      </g>
      <rect className="forecast-range" x="25" y="82" width="565" height="105" />
      <line className="trigger-line" x1="25" y1="82" x2="590" y2="82" />
      <path
        className="actual-path"
        d="M38 142 C78 130 112 111 152 98 S211 104 246 116 S302 137 341 128 S400 111 438 120 S506 143 574 134"
      />
      <g className="actual-points">
        {[[38, 142], [152, 98], [246, 116], [341, 128], [438, 120], [574, 134]].map(([x, y]) => (
          <circle key={x} cx={x} cy={y} r="4" />
        ))}
      </g>
      <g className="axis-labels">
        <text x="594" y="38">6.92</text>
        <text x="594" y="85">6.68</text>
        <text x="594" y="138">6.48</text>
        <text x="594" y="188">6.32</text>
        <text x="32" y="255">08/21 拍照</text>
        <text x="255" y="255">08/22</text>
        <text x="498" y="255">08/25</text>
        <text x="476" y="75">偏强触发 6.68</text>
        <text x="38" y="181">原震荡区间</text>
      </g>
    </svg>
  );
}
