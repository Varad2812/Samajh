interface Props {
  values: number[];
  width?: number;
  height?: number;
  color: string;
  /** Fixed y-range; defaults to 0..1 (mastery). */
  min?: number;
  max?: number;
  label: string;
  className?: string;
}

/** Tiny inline SVG trend line with an end dot. Fewer than 2 points → dashed baseline. */
export function Sparkline({ values, width = 64, height = 18, color, min = 0, max = 1, label, className }: Props) {
  const pad = 2;
  const y = (v: number) => pad + (1 - (Math.min(max, Math.max(min, v)) - min) / (max - min || 1)) * (height - pad * 2);
  if (values.length < 2) {
    return (
      <svg width={width} height={height} className={className} role="img" aria-label={`${label}: not enough history`}>
        <line x1={pad} x2={width - pad} y1={height / 2} y2={height / 2} stroke="var(--unknown)" strokeDasharray="2 3" />
      </svg>
    );
  }
  const step = (width - pad * 2) / (values.length - 1);
  const pts = values.map((v, i) => `${(pad + i * step).toFixed(1)},${y(v).toFixed(1)}`);
  const last = values[values.length - 1];
  return (
    <svg width={width} height={height} className={className} role="img" aria-label={`${label}: ${values.map((v) => v.toFixed(2)).join(", ")}`}>
      <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" opacity={0.9} />
      <circle cx={width - pad} cy={y(last)} r={2} fill={color} />
    </svg>
  );
}
