import { useMemo } from 'react'

interface Candle {
  time: string
  open: number
  high: number
  low: number
  close: number
}

interface CandlestickChartProps {
  basePrice: number
  ticker: string
}

function generateCandles(basePrice: number, count = 28): Candle[] {
  const candles: Candle[] = []
  let price = basePrice * 0.98

  const times = []
  for (let h = 9; h <= 15; h++) {
    for (let m = 0; m < 60; m += 15) {
      if (h === 9 && m < 15) continue
      if (h === 15 && m > 30) continue
      times.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`)
    }
  }

  for (let i = 0; i < count; i++) {
    const change = (Math.random() - 0.48) * basePrice * 0.006
    const open = price
    const close = price + change
    const wick = basePrice * 0.003
    const high = Math.max(open, close) + Math.random() * wick
    const low = Math.min(open, close) - Math.random() * wick
    candles.push({ time: times[i] || `${i}`, open, high, low, close })
    price = close
  }
  return candles
}

export default function CandlestickChart({ basePrice, ticker }: CandlestickChartProps) {
  const candles = useMemo(() => generateCandles(basePrice), [basePrice])

  const width = 700
  const height = 280
  const padL = 16
  const padR = 56
  const padT = 16
  const padB = 28

  const allPrices = candles.flatMap(c => [c.high, c.low])
  const minP = Math.min(...allPrices)
  const maxP = Math.max(...allPrices)
  const range = maxP - minP || 1

  const chartW = width - padL - padR
  const chartH = height - padT - padB
  const candleW = Math.max(5, (chartW / candles.length) * 0.6)

  const toX = (i: number) => padL + (i + 0.5) * (chartW / candles.length)
  const toY = (p: number) => padT + chartH - ((p - minP) / range) * chartH

  const priceLabels = 5
  const priceStep = range / (priceLabels - 1)

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        style={{ minWidth: 400, height: height }}
        preserveAspectRatio="xMidYMid meet"
      >
        {Array.from({ length: priceLabels }).map((_, i) => {
          const y = padT + (i / (priceLabels - 1)) * chartH
          const price = maxP - i * priceStep
          return (
            <g key={i}>
              <line x1={padL} x2={width - padR} y1={y} y2={y} stroke="#e9ecef" strokeWidth="0.5" />
              <text x={width - padR + 4} y={y + 3.5} fontSize="9" fill="#adb5bd" fontFamily="DM Mono, monospace">
                {price.toFixed(0)}
              </text>
            </g>
          )
        })}

        {candles.map((c, i) => {
          const x = toX(i)
          const bullish = c.close >= c.open
          const color = bullish ? '#2f9e44' : '#e03131'
          const bodyTop = toY(Math.max(c.open, c.close))
          const bodyBot = toY(Math.min(c.open, c.close))
          const bodyH = Math.max(1.5, bodyBot - bodyTop)
          return (
            <g key={i}>
              <line x1={x} x2={x} y1={toY(c.high)} y2={toY(c.low)} stroke={color} strokeWidth="1" />
              <rect
                x={x - candleW / 2}
                y={bodyTop}
                width={candleW}
                height={bodyH}
                fill={color}
                opacity={0.9}
              />
            </g>
          )
        })}

        {candles.map((c, i) => {
          if (i % 4 !== 0) return null
          return (
            <text
              key={i}
              x={toX(i)}
              y={height - 4}
              fontSize="9"
              fill="#adb5bd"
              textAnchor="middle"
              fontFamily="DM Mono, monospace"
            >
              {c.time}
            </text>
          )
        })}
      </svg>
    </div>
  )
}
