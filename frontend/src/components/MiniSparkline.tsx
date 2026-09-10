interface MiniSparklineProps {
  positive: boolean
  width?: number
  height?: number
}

export default function MiniSparkline({ positive, width = 60, height = 24 }: MiniSparklineProps) {
  const points = positive
    ? [0, 4, 2, 8, 5, 10, 7, 14, 10, 18, 14, 20, 16, 24]
    : [0, 20, 16, 24, 20, 18, 22, 14, 20, 10, 18, 6, 20, 2]

  const pts = points
    .map((y, i) => `${(i / (points.length - 1)) * width},${height - 1 - y * ((height - 2) / 24)}`)
    .join(' ')

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} fill="none">
      <polyline
        points={pts}
        stroke={positive ? '#2f9e44' : '#e03131'}
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
