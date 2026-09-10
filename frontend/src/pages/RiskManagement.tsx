import { useState, useEffect } from 'react'
import type { Company, Page, TradeInputs } from '../App'
import ApiStatusBanner from '../components/ApiStatusBanner'
import { usePrediction } from '../hooks/usePrediction'
import { useAuth } from '../context/AuthContext'
import { recordUserTrade } from '../lib/api'
import type { TradeHistoryItem } from '../types/api'

interface RiskManagementProps {
  selectedCompany: Company
  tradeInputs: TradeInputs
  onNavigate: (page: Page) => void
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)
}

export default function RiskManagement({ selectedCompany, tradeInputs, onNavigate }: RiskManagementProps) {
  const { currentUser } = useAuth()
  const [isExecuting, setIsExecuting] = useState(false)
  const [executedTrade, setExecutedTrade] = useState<TradeHistoryItem | null>(null)
  const [executionError, setExecutionError] = useState<string | null>(null)

  const { data: prediction, loading, error } = usePrediction(selectedCompany.ticker, {
    qty: tradeInputs.qty,
    limitPrice: tradeInputs.limitPrice,
  })

  useEffect(() => {
    setExecutedTrade(null)
    setExecutionError(null)
  }, [selectedCompany.ticker, tradeInputs.qty, tradeInputs.limitPrice])

  const isPositive = prediction ? prediction.direction === 'UP' : selectedCompany.changePct >= 0
  const atr = prediction?.risk_management.atr_14_points ?? selectedCompany.price * 0.0008

  const handleExecuteTrade = async () => {
    try {
      setIsExecuting(true)
      setExecutionError(null)

      const activeUserId = currentUser?.id || 'usr_demo_trader'
      const tradePayload = {
        user_id: activeUserId,
        ticker: selectedCompany.ticker.toUpperCase(),
        type: (isPositive ? 'BUY' : 'SELL') as 'BUY' | 'SELL',
        qty: tradeInputs.qty,
        price: tradeInputs.limitPrice || selectedCompany.price,
        date: new Date().toISOString().split('T')[0],
      }

      const recorded = await recordUserTrade(tradePayload)
      setExecutedTrade(recorded)
    } catch (err: any) {
      console.error('Failed to execute trade:', err)
      setExecutionError(err.message || 'Failed to execute trade. Please try again.')
    } finally {
      setIsExecuting(false)
    }
  }

  const dynamicStopLoss = prediction?.risk_management.dynamic_stop_loss ??
    (isPositive ? selectedCompany.price - atr * 8 : selectedCompany.price + atr * 8)
  const dynamicTarget = prediction?.risk_management.dynamic_target_price ??
    (isPositive ? selectedCompany.price + atr * 18 : selectedCompany.price - atr * 18)
  const riskRewardRatio = prediction?.risk_management.risk_reward_ratio ?? '1:2.25'

  const entryZoneLabel = prediction?.risk_management.key_levels_guard.suggested_entry_zone
  const entryLow = selectedCompany.price - atr * 1.8
  const entryHigh = selectedCompany.price + atr * 1.8
  const limitInsideZone = prediction
    ? prediction.groww_order_analysis.is_limit_in_entry_zone
    : tradeInputs.limitPrice >= entryLow && tradeInputs.limitPrice <= entryHigh

  const requiredCapital = prediction?.groww_order_analysis.required_capital ?? (tradeInputs.limitPrice * tradeInputs.qty)
  const customProfit = prediction?.groww_order_analysis.custom_profit_potential ??
    Math.abs(dynamicTarget - tradeInputs.limitPrice) * tradeInputs.qty
  const customMaxRisk = prediction?.groww_order_analysis.custom_max_risk ??
    Math.abs(dynamicStopLoss - tradeInputs.limitPrice) * tradeInputs.qty
  const customRRLabel = prediction?.groww_order_analysis.custom_rr_ratio ?? (customProfit / (customMaxRisk || 1)).toFixed(2)

  const tradeScore = prediction?.analytics.trade_score ?? (isPositive ? 82 : 78)
  const confidence = prediction?.ai_insights.confidence_pct ?? (isPositive ? 72.4 : 77.1)
  const predictedReturn = prediction?.predicted_return_pct ?? (isPositive ? 2.14 : -2.09)
  const trend = prediction?.analytics.market_trend ?? (isPositive ? 'Bullish' : 'Strong Bearish')

  const capitalAllocationLabel = prediction?.risk_management.position_sizing.position_size_label ?? '10% Capital Allocation'
  const capitalAllocationPct = prediction?.risk_management.position_sizing.capital_allocation_pct

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-[#0f1117]">Risk Management</h1>
          <p className="text-sm text-[#868e96] mt-0.5">
            ML-powered trade analysis for {selectedCompany.ticker}
          </p>
        </div>
        <button
          onClick={() => onNavigate('analytics')}
          className="text-sm text-[#1c7ed6] hover:text-[#1971c2] font-medium flex items-center gap-1"
        >
          View Analytics →
        </button>
      </div>

      <ApiStatusBanner loading={loading} error={error} isLive={prediction?.is_live} label="Live prediction unavailable" />

      {/* Trade summary bar */}
      <div className="bg-white border border-[#e9ecef] rounded p-4">
        <p className="text-[10px] text-[#868e96] uppercase tracking-widest font-medium mb-3">Analyzed Trade</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <SummaryItem label="Ticker" value={selectedCompany.ticker} mono />
          <SummaryItem label="Company" value={selectedCompany.name} />
          <SummaryItem label="Quantity" value={tradeInputs.qty.toString()} mono />
          <SummaryItem label="Limit Price" value={`₹${fmt(tradeInputs.limitPrice)}`} mono />
          <SummaryItem label="Market Price" value={`₹${fmt(prediction?.current_price ?? selectedCompany.price)}`} mono />
          <SummaryItem
            label="Direction"
            value={isPositive ? 'BUY CALL' : 'BUY PUT'}
            colored={isPositive ? 'green' : 'red'}
          />
        </div>
      </div>

      {/* Execution Action Card */}
      <div className="bg-white border border-[#e9ecef] rounded p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${executedTrade ? 'bg-[#2b8a3e]' : 'bg-[#1971c2]'}`}></span>
              <h3 className="text-sm font-bold text-[#0f1117]">Order Execution Control</h3>
              <span className="text-[10px] px-2 py-0.5 bg-[#f1f3f5] text-[#495057] font-mono font-medium rounded">
                {selectedCompany.ticker} • {tradeInputs.qty} share{tradeInputs.qty === 1 ? '' : 's'} @ ₹{fmt(tradeInputs.limitPrice || selectedCompany.price)}
              </span>
            </div>
            <p className="text-xs text-[#868e96] mt-1">
              {executedTrade
                ? 'Order confirmed and saved to PostgreSQL. You can view it under Trade History in your Profile.'
                : 'Clicking Execute Trade will record this order into your Trade History. If you leave without clicking, no trade will be stored.'}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {executedTrade ? (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2b8a3e] bg-[#ebfbee] border border-[#b2f2bb] px-3 py-2 rounded">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  Executed ({executedTrade.ticker})
                </span>
                <button
                  type="button"
                  onClick={() => onNavigate('profile')}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#1971c2] hover:bg-[#1864ab] rounded transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  View in Profile →
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleExecuteTrade}
                disabled={isExecuting || loading}
                className="px-5 py-2 text-xs font-bold text-white bg-[#2b8a3e] hover:bg-[#237032] active:bg-[#1e5e2a] disabled:opacity-50 rounded transition-colors flex items-center gap-2 shadow-xs cursor-pointer"
              >
                {isExecuting ? (
                  <>
                    <svg className="animate-spin h-3.5 w-3.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                    </svg>
                    <span>Executing Trade...</span>
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
                    <span>EXECUTE TRADE</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Execution Error Banner */}
        {executionError && (
          <div className="mt-3 p-2.5 bg-[#fff5f5] text-[#e03131] border border-[#ffc9c9] rounded text-xs flex items-center justify-between">
            <span>{executionError}</span>
            <button
              type="button"
              onClick={() => setExecutionError(null)}
              className="text-[#e03131] font-bold text-xs hover:underline ml-2 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>

      {/* Key output cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <OutputCard label="Dynamic Stop Loss" value={`₹${fmt(dynamicStopLoss)}`} colored="red" sub="dynamic_stop_loss" />
        <OutputCard label="Dynamic Target" value={`₹${fmt(dynamicTarget)}`} colored="green" sub="dynamic_target_price" />
        <OutputCard label="ATR 14" value={`₹${atr.toFixed(4)}`} sub="atr_14_points" />
        <OutputCard
          label="Risk/Reward Ratio"
          value={riskRewardRatio}
          sub="risk_reward_ratio"
        />
      </div>

      {/* Order analysis & Position Sizing */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-[#e9ecef] rounded p-4">
          <p className="text-[10px] text-[#868e96] uppercase tracking-widest font-medium mb-3">Order Analysis</p>
          <div className="space-y-2">
            <PSRow label="Required Capital" value={`₹${fmt(requiredCapital)}`} />
            <PSRow label="Custom Profit Potential" value={`₹${fmt(customProfit)}`} colored="green" />
            <PSRow label="Custom Maximum Risk" value={`₹${fmt(customMaxRisk)}`} colored="red" />
            <PSRow label="Custom R/R Ratio" value={customRRLabel} />
          </div>
        </div>

        <div className="bg-white border border-[#e9ecef] rounded p-4">
          <p className="text-[10px] text-[#868e96] uppercase tracking-widest font-medium mb-3">Position Sizing</p>
          <div className="space-y-2">
            <PSRow label="Capital Allocation" value={capitalAllocationPct !== undefined ? `${capitalAllocationPct}%` : '10%'} />
            <PSRow label="Position Size" value={capitalAllocationLabel} />
          </div>
        </div>
      </div>

      {/* Entry zone */}
      <div className="grid grid-cols-1 gap-4">
        <div className="bg-white border border-[#e9ecef] rounded p-4 space-y-3">
          <p className="text-[10px] text-[#868e96] uppercase tracking-widest font-medium">Entry Zone Analysis</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="border border-[#e9ecef] rounded p-3">
              <p className="text-[10px] text-[#868e96] mb-1">Limit Price</p>
              <p className="text-sm font-mono font-semibold text-[#0f1117]">₹{fmt(tradeInputs.limitPrice)}</p>
            </div>
            <div className="border border-[#e9ecef] rounded p-3">
              <p className="text-[10px] text-[#868e96] mb-1">Entry Zone</p>
              <p className="text-xs font-mono font-semibold text-[#0f1117]">{entryZoneLabel ?? `₹${fmt(entryLow)} — ₹${fmt(entryHigh)}`}</p>
            </div>
          </div>
          <div className={`rounded p-3 text-center ${limitInsideZone ? 'bg-[#ebfbee] border border-[#2f9e44]/20' : 'bg-[#fff5f5] border border-[#e03131]/20'}`}>
            <p className={`text-sm font-semibold ${limitInsideZone ? 'text-[#2f9e44]' : 'text-[#e03131]'}`}>
              {limitInsideZone ? '✓ Inside Entry Zone' : '✗ Outside Entry Zone'}
            </p>
            <p className="text-[10px] text-[#868e96] mt-0.5">
              {limitInsideZone ? 'Limit price within recommended range' : 'Consider adjusting limit price'}
            </p>
          </div>
        </div>
      </div>

      {/* Trade score / confidence */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <OutputCard label="Trade Score" value={`${tradeScore} / 100`} sub="Overall score" />
        <OutputCard label="Confidence" value={`${confidence.toFixed(1)}%`} sub="Model confidence" />
        <OutputCard label="Predicted Return" value={`${predictedReturn > 0 ? '+' : ''}${predictedReturn.toFixed(2)}%`} sub="ML forecast" colored={predictedReturn >= 0 ? 'green' : 'red'} />
        <OutputCard label="Market Trend" value={trend} sub="Classification" colored={isPositive ? 'green' : 'red'} />
      </div>
    </div>
  )
}

function SummaryItem({ label, value, mono, colored }: { label: string; value: string; mono?: boolean; colored?: 'green' | 'red' }) {
  return (
    <div>
      <p className="text-[10px] text-[#868e96] mb-0.5">{label}</p>
      <p className={`text-sm font-medium ${mono ? 'font-mono' : ''} ${
        colored === 'green' ? 'text-[#2f9e44]' :
        colored === 'red' ? 'text-[#e03131]' :
        'text-[#0f1117]'
      }`}>{value}</p>
    </div>
  )
}

function OutputCard({ label, value, sub, colored, badge, badgeGreen }: {
  label: string; value: string; sub?: string; colored?: 'green' | 'red'; badge?: string; badgeGreen?: boolean
}) {
  return (
    <div className="bg-white border border-[#e9ecef] rounded p-3">
      <p className="text-[10px] text-[#868e96] uppercase tracking-wide font-medium mb-1">{label}</p>
      <p className={`text-sm font-semibold font-mono ${
        colored === 'green' ? 'text-[#2f9e44]' :
        colored === 'red' ? 'text-[#e03131]' :
        'text-[#0f1117]'
      }`}>{value}</p>
      {sub && <p className="text-[10px] text-[#adb5bd] mt-0.5">{sub}</p>}
      {badge && (
        <span className={`inline-block mt-1.5 text-[9px] px-2 py-0.5 rounded font-medium ${
          badgeGreen ? 'bg-[#ebfbee] text-[#2f9e44]' : 'bg-[#fff5f5] text-[#e03131]'
        }`}>{badge}</span>
      )}
    </div>
  )
}

function PSRow({ label, value, colored }: { label: string; value: string; colored?: 'green' | 'red' }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-[#f1f3f5] last:border-0">
      <span className="text-xs text-[#868e96]">{label}</span>
      <span className={`text-xs font-mono font-medium ${
        colored === 'green' ? 'text-[#2f9e44]' :
        colored === 'red' ? 'text-[#e03131]' :
        'text-[#0f1117]'
      }`}>{value}</span>
    </div>
  )
}
