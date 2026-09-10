import { useState } from 'react'
import type { Company } from '../App'
import { NIFTY50_COMPANIES } from '../App'
import CandlestickChart from '../components/CandlestickChart'
import ApiStatusBanner from '../components/ApiStatusBanner'
import { usePrediction } from '../hooks/usePrediction'
import { RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer } from 'recharts'

interface AnalyticsProps {
  selectedCompany: Company
  onSelectCompany?: (company: Company) => void
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)
}

const trendLevels = ['Strong Bearish', 'Bearish', 'Bullish', 'Strong Bullish']

export default function Analytics({ selectedCompany, onSelectCompany }: AnalyticsProps) {
  const [timeframe, setTimeframe] = useState<'15m' | '30m'>('15m')
  const { data: prediction, loading, error } = usePrediction(selectedCompany.ticker)

  const isPositive = prediction ? prediction.direction === 'UP' : selectedCompany.changePct >= 0
  const currentPrice = prediction?.current_price ?? selectedCompany.price
  const priceChange = prediction?.change ?? (prediction?.analytics.ltp_change.change ?? selectedCompany.change)
  const priceChangePct = prediction?.change_percent ?? (prediction?.analytics.ltp_change.change_pct ?? selectedCompany.changePct)
  const isPriceUp = priceChange >= 0

  // Technical momentum indicators (merged from Market Analytics)
  const rsi = prediction?.analytics.momentum.rsi_14 ?? (isPositive ? 61.4 : 38.2)
  const macdStatus = prediction?.analytics.momentum.macd_status
  const macd = macdStatus ?? (isPositive ? 'Bullish Crossover' : 'Bearish Crossover')
  const macdIsPositive = macdStatus ? (macdStatus.startsWith('Positive') || macdStatus.includes('Bullish')) : isPositive

  // Volatility & expected moves
  const volatility = prediction?.analytics.volatility_20_pct ?? 14.6
  const atr = prediction?.analytics.expected_move.atr_14_points ?? selectedCompany.price * 0.0008

  // ML predictions & scores
  const predictedReturn = prediction?.predicted_return_pct ?? (isPositive ? 2.14 : -2.09)
  const targetPrice = prediction?.predicted_price ?? (isPositive ? selectedCompany.price * 1.021 : selectedCompany.price * 0.978)
  const tradeScore = prediction?.analytics.trade_score ?? (isPositive ? 82 : 78)
  const confidence = prediction?.ai_insights.confidence_pct ?? (isPositive ? 72.4 : 77.1)
  const trend = prediction?.analytics.market_trend ?? (isPositive ? 'Bullish' : 'Strong Bearish')
  const trendIdx = Math.max(0, trendLevels.indexOf(trend))
  const riskRewardRatio = prediction?.analytics.risk_reward_guard.risk_reward_ratio ?? '1:2.25'
  const riskRating = prediction?.analytics.risk_rating ?? 'LOW'
  const aiRec = prediction?.analytics.ai_recommendation ?? (isPositive ? 'BUY CALL' : 'BUY PUT')


  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header with Company Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-[#0f1117]">Analytics</h1>
          <p className="text-sm text-[#868e96] mt-0.5">
            {selectedCompany.ticker} • {selectedCompany.name} • {selectedCompany.sector}
          </p>
        </div>

        {onSelectCompany && (
          <select
            value={selectedCompany.ticker}
            onChange={e => {
              const company = NIFTY50_COMPANIES.find(c => c.ticker === e.target.value)
              if (company) onSelectCompany(company)
            }}
            className="text-sm border border-[#e9ecef] rounded px-3 py-2 bg-white text-[#0f1117] focus:outline-none focus:border-[#1c7ed6] shadow-xs cursor-pointer font-medium"
          >
            {NIFTY50_COMPANIES.map(c => (
              <option key={c.ticker} value={c.ticker}>
                {c.ticker} — {c.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <ApiStatusBanner loading={loading} error={error} isLive={prediction?.is_live} />

      {/* Top summary cards: Live Price, Return Forecast, Signal, Score & Confidence */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <AnalCard
          label="Current Price"
          value={`₹${fmt(currentPrice)}`}
          sub={`${isPriceUp ? '+' : ''}${fmt(priceChange)} (${isPriceUp ? '+' : ''}${priceChangePct.toFixed(2)}%)`}
          colored={isPriceUp ? 'green' : 'red'}
        />
        <AnalCard
          label="Predicted Return"
          value={`${predictedReturn > 0 ? '+' : ''}${predictedReturn.toFixed(2)}%`}
          sub={`Target ₹${fmt(targetPrice)}`}
          colored={predictedReturn >= 0 ? 'green' : 'red'}
        />
        <AnalCard
          label="AI Recommendation"
          value={aiRec}
          sub="30-min horizon"
          colored={isPositive ? 'green' : 'red'}
        />
        <AnalCard
          label="Trade Score"
          value={`${tradeScore} / 100`}
          sub="ML Model Rating"
        />
        <AnalCard
          label="Risk / Reward"
          value={riskRewardRatio}
          sub={`Risk: ${riskRating}`}
          colored="green"
        />
      </div>

      {/* Price Chart & Timeframe switcher */}
      <div className="bg-white border border-[#e9ecef] rounded p-4 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-semibold text-[#0f1117]">Price Action & Candlestick Chart</p>
            <p className="text-xs text-[#868e96]">{selectedCompany.ticker} • Intraday {timeframe}</p>
          </div>
          <div className="flex items-center gap-1">
            <span
              onClick={() => setTimeframe('15m')}
              className={`text-[10px] px-2.5 py-1 rounded cursor-pointer font-medium transition-colors ${
                timeframe === '15m' ? 'bg-[#0f1117] text-white' : 'bg-[#f1f3f5] text-[#868e96] hover:bg-[#e9ecef]'
              }`}
            >
              15m
            </span>
            <span
              onClick={() => setTimeframe('30m')}
              className={`text-[10px] px-2.5 py-1 rounded cursor-pointer font-medium transition-colors ${
                timeframe === '30m' ? 'bg-[#0f1117] text-white' : 'bg-[#f1f3f5] text-[#868e96] hover:bg-[#e9ecef]'
              }`}
            >
              30m
            </span>
          </div>
        </div>

        <CandlestickChart basePrice={currentPrice} ticker={selectedCompany.ticker} />

        <div className="flex items-center gap-4 mt-3 pt-2.5 border-t border-[#e9ecef]">
          <LegendItem color="#2f9e44" label="Bullish Bar" />
          <LegendItem color="#e03131" label="Bearish Bar" />
          <span className="text-[10px] text-[#adb5bd] ml-auto">Live updates every 15s</span>
        </div>
      </div>

      {/* Technical Momentum & Indicators Grid (RSI 14, MACD, Volatility, ATR 14) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* RSI 14 Card */}
        <div className="bg-white border border-[#e9ecef] rounded p-4 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[10px] text-[#868e96] uppercase tracking-widest font-medium">RSI 14</p>
              <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                rsi > 70 ? 'bg-[#fff5f5] text-[#e03131]' :
                rsi < 30 ? 'bg-[#ebfbee] text-[#2f9e44]' :
                'bg-[#f1f3f5] text-[#495057]'
              }`}>
                {rsi > 70 ? 'Overbought' : rsi < 30 ? 'Oversold' : 'Neutral'}
              </span>
            </div>
            <p className={`text-2xl font-bold font-mono ${
              rsi > 70 ? 'text-[#e03131]' : rsi < 30 ? 'text-[#2f9e44]' : 'text-[#0f1117]'
            }`}>
              {rsi.toFixed(1)}
            </p>
          </div>

          <div className="mt-3 space-y-1.5">
            <div className="w-full h-2 bg-[#e9ecef] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  rsi > 70 ? 'bg-[#e03131]' : rsi < 30 ? 'bg-[#2f9e44]' : 'bg-[#1c7ed6]'
                }`}
                style={{ width: `${Math.min(100, Math.max(0, rsi))}%` }}
              />
            </div>
            <div className="flex justify-between text-[9px] text-[#adb5bd] font-mono">
              <span>0 (Oversold)</span>
              <span>50</span>
              <span>100 (Overbought)</span>
            </div>
          </div>
        </div>

        {/* MACD Card */}
        <div className="bg-white border border-[#e9ecef] rounded p-4 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[10px] text-[#868e96] uppercase tracking-widest font-medium">MACD Indicator</p>
              <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                macdIsPositive ? 'bg-[#ebfbee] text-[#2f9e44]' : 'bg-[#fff5f5] text-[#e03131]'
              }`}>
                {macdIsPositive ? 'Bullish' : 'Bearish'}
              </span>
            </div>
            <p className={`text-base font-bold leading-tight ${macdIsPositive ? 'text-[#2f9e44]' : 'text-[#e03131]'}`}>
              {macd}
            </p>
          </div>

          <div className="mt-3 pt-2.5 border-t border-[#f1f3f5]">
            <p className="text-xs text-[#495057] font-medium">
              {macdIsPositive ? 'Buying confirmation active' : 'Selling pressure detected'}
            </p>
            <p className="text-[10px] text-[#868e96] mt-0.5">Dual EMA signal line divergence</p>
          </div>
        </div>

        {/* Volatility Card */}
        <div className="bg-white border border-[#e9ecef] rounded p-4 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[10px] text-[#868e96] uppercase tracking-widest font-medium">Volatility (20)</p>
              <span className="text-[10px] px-2 py-0.5 bg-[#f1f3f5] text-[#495057] rounded font-medium">
                Rolling
              </span>
            </div>
            <p className="text-2xl font-bold font-mono text-[#0f1117]">{volatility.toFixed(1)}%</p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-[#f1f3f5]">
            <p className="text-xs text-[#495057]">Standard deviation of 20-candle returns</p>
            <p className="text-[10px] text-[#868e96] mt-0.5">Scale-invariant volatility rating</p>
          </div>
        </div>

        {/* ATR 14 Card */}
        <div className="bg-white border border-[#e9ecef] rounded p-4 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[10px] text-[#868e96] uppercase tracking-widest font-medium">ATR 14</p>
              <span className="text-[10px] px-2 py-0.5 bg-[#f1f3f5] text-[#495057] rounded font-medium">
                Points
              </span>
            </div>
            <p className="text-2xl font-bold font-mono text-[#0f1117]">₹{atr.toFixed(2)}</p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-[#f1f3f5]">
            <p className="text-xs text-[#495057]">Average True Range</p>
            <p className="text-[10px] text-[#868e96] mt-0.5">Expected per-candle price excursion</p>
          </div>
        </div>
      </div>

      {/* Trend & Model Confidence */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Market Trend Levels */}
        <div className="bg-white border border-[#e9ecef] rounded p-4 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] text-[#868e96] uppercase tracking-widest font-medium">Market Trend Status</p>
            <span className="text-[10px] text-[#868e96]">Trend index: {trendIdx + 1}/4</span>
          </div>
          <div className="space-y-2">
            {trendLevels.map((t, i) => {
              const isSelected = i === trendIdx
              const isBear = t.includes('Bearish')
              return (
                <div
                  key={t}
                  className={`px-3 py-2 rounded text-xs font-medium flex items-center justify-between transition-colors ${
                    isSelected
                      ? isBear
                        ? 'bg-[#fff5f5] text-[#e03131] border border-[#e03131]/30 font-semibold'
                        : 'bg-[#ebfbee] text-[#2f9e44] border border-[#2f9e44]/30 font-semibold'
                      : 'bg-[#f8f9fa] text-[#adb5bd]'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    {isSelected ? <span>▶</span> : <span className="text-[9px]">○</span>}
                    <span>{t}</span>
                  </div>
                  {isSelected && (
                    <span className="text-[10px] uppercase tracking-wider">Current</span>
                  )}
                </div>
              )
            })}
          </div>
          <p className="text-[10px] text-[#868e96] mt-3">
            Determined by multi-timeframe moving averages & ML classifier.
          </p>
        </div>


        {/* Confidence Gauge */}
        <div className="bg-white border border-[#e9ecef] rounded p-4 shadow-xs flex flex-col items-center justify-between">
          <div className="w-full text-left">
            <p className="text-[10px] text-[#868e96] uppercase tracking-widest font-medium mb-1">Confidence Gauge</p>
            <p className="text-xs text-[#868e96]">Model certainty on direction</p>
          </div>

          <div className="w-full h-[130px] relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height={130}>
              <RadialBarChart
                cx="50%"
                cy="85%"
                innerRadius="70%"
                outerRadius="100%"
                startAngle={180}
                endAngle={0}
                data={[{ value: confidence, fill: '#1c7ed6' }]}
              >
                <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                <RadialBar dataKey="value" cornerRadius={6} background={{ fill: '#e9ecef' }} />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-end pb-2">
              <p className="text-2xl font-bold font-mono text-[#0f1117]">{confidence.toFixed(1)}%</p>
              <p className="text-[10px] text-[#868e96]">Model confidence</p>
            </div>
          </div>

          <div className="w-full pt-2 border-t border-[#f1f3f5] flex justify-between text-[10px] text-[#868e96]">
            <span>Direction: <strong className={isPositive ? 'text-[#2f9e44]' : 'text-[#e03131]'}>{isPositive ? 'UP' : 'DOWN'}</strong></span>
            <span>Threshold: <strong>60%</strong></span>
          </div>
        </div>
      </div>
    </div>
  )
}

function AnalCard({
  label,
  value,
  sub,
  colored,
}: {
  label: string
  value: string
  sub?: string
  colored?: 'green' | 'red'
}) {
  return (
    <div className="bg-white border border-[#e9ecef] rounded p-3 shadow-xs">
      <p className="text-[10px] text-[#868e96] uppercase tracking-wide font-medium mb-1">{label}</p>
      <p
        className={`text-sm font-semibold font-mono ${
          colored === 'green' ? 'text-[#2f9e44]' : colored === 'red' ? 'text-[#e03131]' : 'text-[#0f1117]'
        }`}
      >
        {value}
      </p>
      {sub && <p className="text-[10px] text-[#adb5bd] mt-0.5 truncate">{sub}</p>}
    </div>
  )
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-3 h-2 rounded-xs inline-block" style={{ backgroundColor: color }} />
      <span className="text-[10px] text-[#868e96]">{label}</span>
    </div>
  )
}
