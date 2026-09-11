/** Mini bar chart (stat-card right edge) — pure SVG, zero deps. */
export function Sparkline({
  points,
  color = '#0FA958',
  className = 'h-9 w-11 shrink-0',
}: {
  points: number[];
  color?: string;
  className?: string;
}) {
  const max = Math.max(...points, 1);
  const w = 44;
  const h = 36;
  const gap = 4;
  const bw = Math.max(3, (w - gap * (points.length - 1)) / Math.max(points.length, 1));
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={className} aria-hidden="true">
      {points.map((p, i) => {
        const bh = Math.max(3, Math.round((p / max) * h));
        return <rect key={i} x={i * (bw + gap)} y={h - bh} width={bw} height={bh} rx={1.5} fill={color} />;
      })}
    </svg>
  );
}