import { useState, useRef, useEffect } from 'react'
import type { Company, TradeInputs } from '../App'
import { NIFTY50_COMPANIES } from '../App'

interface TradeDiscoveryProps {
  selectedCompany: Company
  tradeInputs: TradeInputs
  onAnalyze: (inputs: TradeInputs) => void
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)
}

export default function TradeDiscovery({ selectedCompany, tradeInputs, onAnalyze }: TradeDiscoveryProps) {
  const [ticker, setTicker] = useState(tradeInputs.ticker)
  const [qty, setQty] = useState(tradeInputs.qty.toString())
  const [limitPrice, setLimitPrice] = useState(tradeInputs.limitPrice.toString())
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const currentCompany = NIFTY50_COMPANIES.find(c => c.ticker === ticker) || selectedCompany

  const filtered = ticker.length > 0
    ? NIFTY50_COMPANIES.filter(c =>
        c.ticker.toLowerCase().includes(ticker.toLowerCase()) ||
        c.name.toLowerCase().includes(ticker.toLowerCase())
      )
    : NIFTY50_COMPANIES

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onAnalyze({ ticker, qty: Number(qty), limitPrice: Number(limitPrice) })
  }

  const handleTickerChange = (t: string) => {
    setTicker(t.toUpperCase())
    const company = NIFTY50_COMPANIES.find(c => c.ticker === t.toUpperCase())
    if (company) setLimitPrice(company.price.toString())
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 w-full">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Trade Discovery</h1>
        <p className="text-sm text-gray-500 mt-1">Provide trade inputs for the ML risk engine</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-white border border-gray-100 rounded-lg p-6 pb-8">
          <p className="text-xs text-gray-500 uppercase font-semibold tracking-wide mb-6">Trade Inputs</p>

          <div className="space-y-6">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-600">Ticker</label>
              <div className="relative" ref={ref}>
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                </span>
                <input
                  type="text"
                  value={ticker}
                  onChange={e => {
                    handleTickerChange(e.target.value)
                    setOpen(true)
                  }}
                  onFocus={() => setOpen(true)}
                  className="w-full border border-gray-200 rounded-md pl-10 pr-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-[#fbfbfb]"
                />

                {open && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-64 overflow-y-auto">
                    {filtered.map(company => (
                      <button
                        key={company.ticker}
                        type="button"
                        onClick={() => {
                          setTicker(company.ticker)
                          setLimitPrice(company.price.toString())
                          setOpen(false)
                        }}
                        className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
                      >
                        <div>
                          <span className="text-sm font-medium text-gray-900">{company.ticker}</span>
                          <span className="text-xs text-gray-500 ml-2">{company.name}</span>
                        </div>
                        <span className={`text-xs font-mono font-medium ${company.changePct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {company.changePct >= 0 ? '+' : ''}{company.changePct.toFixed(2)}%
                        </span>
                      </button>
                    ))}
                    {filtered.length === 0 && (
                      <div className="px-4 py-3 text-sm text-gray-500 text-center">
                        No companies found.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-600">Quantity (qty)</label>
              <input
                type="number"
                min="1"
                step="1"
                value={qty}
                onChange={e => setQty(e.target.value)}
                className="w-full border border-gray-200 rounded-md px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-[#fbfbfb]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-600">Limit Price (limit_price)</label>
              <input
                type="number"
                step="0.05"
                min="0"
                value={limitPrice}
                onChange={e => setLimitPrice(e.target.value)}
                className="w-full border border-gray-200 rounded-md px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-[#fbfbfb]"
              />
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-lg p-6 pb-8">
          <p className="text-xs text-gray-500 uppercase font-semibold tracking-wide mb-6">Preview</p>

          <div className="space-y-6">
            <div>
              <p className="text-xs text-gray-500 mb-1">Selected Company</p>
              <p className="text-sm font-medium text-gray-900">
                {ticker}{currentCompany ? ` — ${currentCompany.name}` : ''}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-500 mb-1">Quantity</p>
              <p className="text-sm font-medium text-gray-900">{qty || '0'}</p>
            </div>

            <div>
              <p className="text-xs text-gray-500 mb-1">Limit Price</p>
              <p className="text-sm font-bold text-gray-900">
                {limitPrice ? `₹${fmt(Number(limitPrice))}` : '₹0.00'}
              </p>
            </div>
          </div>
        </div>

        <div>
          <button
            type="submit"
            className="px-6 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded hover:bg-blue-700 transition-colors"
          >
            ANALYZE MY TRADE
          </button>
        </div>
      </form>
    </div>
  )
}
