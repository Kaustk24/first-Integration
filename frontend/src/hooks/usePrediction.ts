import { useEffect, useRef, useState, useCallback } from 'react'
import { getPrediction } from '../lib/api'
import type { PredictionResponse } from '../types/api'
import { ApiError } from '../types/api'

interface UsePredictionOptions {
  qty?: number
  limitPrice?: number
  /** Poll interval in ms. Set to 0 to disable polling (fetch once per ticker/qty/limitPrice change). */
  pollIntervalMs?: number
  enabled?: boolean
}

interface UsePredictionResult {
  data: PredictionResponse | null
  loading: boolean
  error: string | null
  refetch: () => void
}

/**
 * Fetches live ML predictions for a NIFTY 50 ticker from the FastAPI backend's
 * /predict/{ticker} endpoint, with optional polling. Keeps the last successful
 * response visible while a refresh is in-flight so the UI doesn't flash empty.
 */
export function usePrediction(
  ticker: string,
  { qty, limitPrice, pollIntervalMs = 30000, enabled = true }: UsePredictionOptions = {},
): UsePredictionResult {
  const [data, setData] = useState<PredictionResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshTick, setRefreshTick] = useState(0)
  const abortRef = useRef<AbortController | null>(null)

  const refetch = useCallback(() => setRefreshTick(t => t + 1), [])

  useEffect(() => {
    if (!enabled || !ticker) return

    let cancelled = false
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    async function load() {
      setLoading(true)
      try {
        const res = await getPrediction(ticker, { qty, limitPrice, signal: controller.signal })
        if (!cancelled) {
          setData(res)
          setError(null)
        }
      } catch (err) {
        if (cancelled || controller.signal.aborted) return
        setError(err instanceof ApiError ? err.message : 'Failed to fetch prediction.')
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticker, qty, limitPrice, pollIntervalMs, enabled, refreshTick])

  return { data, loading, error, refetch }
}
