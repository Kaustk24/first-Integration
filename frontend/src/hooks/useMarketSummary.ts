import { useEffect, useRef, useState, useCallback } from 'react'
import { getMarketSummary } from '../lib/api'
import type { MarketSummaryResponse } from '../types/api'
import { ApiError } from '../types/api'

interface UseMarketSummaryResult {
  data: MarketSummaryResponse | null
  loading: boolean
  error: string | null
  refetch: () => void
}

/**
 * Fetches the live NIFTY 50 index summary from GET /api/market/nifty50, polling
 * on an interval. Falls back gracefully (error is set, previous data retained)
 * when the backend is unreachable.
 */
export function useMarketSummary(pollIntervalMs = 30000): UseMarketSummaryResult {
  const [data, setData] = useState<MarketSummaryResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshTick, setRefreshTick] = useState(0)
  const abortRef = useRef<AbortController | null>(null)

  const refetch = useCallback(() => setRefreshTick(t => t + 1), [])

  useEffect(() => {
    let cancelled = false
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    async function load() {
      setLoading(true)
      try {
        const res = await getMarketSummary(controller.signal)
        if (!cancelled) {
          setData(res)
          setError(null)
        }
      } catch (err) {
        if (cancelled || controller.signal.aborted) return
        setError(err instanceof ApiError ? err.message : 'Failed to fetch market summary.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()

    let interval: ReturnType<typeof setInterval> | undefined
    if (pollIntervalMs > 0) {
      interval = setInterval(load, pollIntervalMs)
    }

    return () => {
      cancelled = true
      controller.abort()
      if (interval) clearInterval(interval)
    }
  }, [pollIntervalMs, refreshTick])

  return { data, loading, error, refetch }
}
