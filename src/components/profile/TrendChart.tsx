// Presentation — hand-rolled SVG sparkline (Design §5.3). No chart library, to
// keep the zero-extra-runtime-dependency posture. Pure render from numbers.

interface Props {
  values: number[]; // chronological (oldest → newest), canonical unit
  width?: number;
  height?: number;
}

export function TrendChart({ values, width = 96, height = 24 }: Props) {
  if (values.length < 2) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const stepX = width / (values.length - 1);

  const points = values
    .map((v, i) => {
      const x = i * stepX;
      const y = height - ((v - min) / span) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const last = values[values.length - 1];
  const prev = values[values.length - 2];
  const color = last > prev ? "#16a34a" : last < prev ? "#dc2626" : "#737373";

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="marker trend sparkline"
      className="overflow-visible"
    >
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
