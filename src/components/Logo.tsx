export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="brand-lockup">
      <span className="brand-mark">析</span>
      <span>
        析线 AI
        {!compact && <small>可信图表研究工具</small>}
      </span>
    </div>
  );
}
