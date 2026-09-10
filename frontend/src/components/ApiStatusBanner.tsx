import { useState, useEffect } from 'react'
import { getFyersStatus, forceFyersRefresh, getFyersLoginUrl } from '../lib/api'
import type { FyersAuthStatusResponse } from '../types/api'

interface ApiStatusBannerProps {
  loading?: boolean
  error?: string | null
  isLive?: boolean
  label?: string
}

export default function ApiStatusBanner({ loading, error, label }: ApiStatusBannerProps) {
  const [authStatus, setAuthStatus] = useState<FyersAuthStatusResponse | null>(null)
  const [retrying, setRetrying] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const fetchStatus = async () => {
    try {
      const data = await getFyersStatus()
      setAuthStatus(data)
      setFetchError(null)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      setFetchError(message)
    }
  }

  useEffect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, 15000)
    return () => clearInterval(interval)
  }, [])

  const handleManualRetry = async () => {
    setRetrying(true)
    try {
      const updated = await forceFyersRefresh()
      setAuthStatus(updated)
      setFetchError(null)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      setFetchError(message)
    } finally {
      setRetrying(false)
    }
  }

  // Backend unreachable
  if (error || fetchError) {
    return (
      <div className="bg-white border border-[#e9ecef] rounded px-4 py-2.5 flex items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#e03131] shrink-0" />
          <span className="text-xs text-[#e03131] font-medium">
            {label || 'Backend connection notice'} — {error || fetchError}
          </span>
        </div>
        <button
          onClick={fetchStatus}
          className="text-xs text-[#495057] hover:text-[#0f1117] font-medium underline shrink-0 cursor-pointer"
        >
          Check Connection
        </button>
      </div>
    )
  }

  // Connecting / Running authentication
  if (authStatus?.status === 'CONNECTING' || retrying) {
    return (
      <div className="bg-white border border-[#e9ecef] rounded px-4 py-2.5 flex items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#f59f00] animate-pulse shrink-0" />
          <span className="text-xs text-[#d97706] font-medium">
            Connecting to FYERS automatically…
          </span>
        </div>
        {loading && (
          <span className="text-[11px] text-[#868e96]">Fetching ML prediction…</span>
        )}
      </div>
    )
  }

  // Successfully authenticated
  if (authStatus?.is_authenticated) {
    return (
      <div className="bg-white border border-[#e9ecef] rounded px-4 py-2.5 flex items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#2f9e44] shrink-0" />
          <span className="text-xs text-[#2b8a3e] font-medium">
            FYERS Live Connected — Automatic daily authentication enabled.
          </span>
        </div>
        {loading && (
          <span className="text-[11px] text-[#868e96] flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#339af0] animate-ping" />
            Updating ML prediction…
          </span>
        )}
      </div>
    )
  }

  // Authentication failed or re-authentication required
  const errorMessage = authStatus?.last_error || 'FYERS authentication required.'

  return (
    <div className="bg-white border border-[#fed7aa] bg-[#fffaf5] rounded px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-[#f97316] shrink-0" />
        <span className="text-xs text-[#9a3412] font-medium">
          {errorMessage}
        </span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={handleManualRetry}
          disabled={retrying}
          className="px-2.5 py-1 text-xs font-medium text-[#495057] bg-white border border-[#e9ecef] rounded hover:bg-[#f8f9fa] transition-colors disabled:opacity-50 cursor-pointer"
        >
          {retrying ? 'Retrying…' : 'Retry'}
        </button>
        <a
          href={getFyersLoginUrl()}
          className="px-2.5 py-1 text-xs font-medium text-white bg-[#0f1117] rounded hover:bg-[#212529] transition-colors cursor-pointer"
        >
          Manual Login
        </a>
      </div>
    </div>
  )
}
