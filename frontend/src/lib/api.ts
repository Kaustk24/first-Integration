import type {
  PredictionResponse,
  BatchPredictionResponse,
  MarketSummaryResponse,
  WatchlistResponse,
  HealthResponse,
  RetrainResponse,
  FyersTokenResponse,
  FyersAuthStatusResponse,
} from '../types/api'
import { ApiError } from '../types/api'

// In dev, Vite proxies /predict, /api, /health, /fyers, /retrain to the FastAPI backend
// (see vite.config.ts). In production, set VITE_API_BASE_URL to the deployed backend origin.
const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') || ''

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...init,
    })
  } catch (err) {
    throw new ApiError(
      `Could not reach the ML backend at ${BASE_URL || 'the dev proxy'}${path}. Is the FastAPI server running?`,
    )
  }

  if (!res.ok) {
    let detail = res.statusText
    try {
      const body = await res.json()
      detail = body?.detail || detail
    } catch {
      // ignore body parse errors
    }
    throw new ApiError(detail, res.status)
  }

  return res.json() as Promise<T>
}

export function getPrediction(
  ticker: string,
  opts?: { qty?: number; limitPrice?: number; signal?: AbortSignal },
): Promise<PredictionResponse> {
  const params = new URLSearchParams()
  if (opts?.qty) params.set('qty', String(opts.qty))
  if (opts?.limitPrice) params.set('limit_price', String(opts.limitPrice))
  const qs = params.toString()
  return request<PredictionResponse>(`/predict/${encodeURIComponent(ticker)}${qs ? `?${qs}` : ''}`, {
    signal: opts?.signal,
  })
}

export function getBatchPredictions(tickers: string[], signal?: AbortSignal): Promise<BatchPredictionResponse> {
  const qs = new URLSearchParams({ tickers: tickers.join(',') }).toString()
  return request<BatchPredictionResponse>(`/predict?${qs}`, { signal })
}

export function getMarketSummary(signal?: AbortSignal): Promise<MarketSummaryResponse> {
  return request<MarketSummaryResponse>('/api/market/nifty50', { signal })
}

export function getWatchlistQuotes(tickers?: string[], signal?: AbortSignal): Promise<WatchlistResponse> {
  const qs = tickers && tickers.length > 0 ? `?tickers=${encodeURIComponent(tickers.join(','))}` : ''
  return request<WatchlistResponse>(`/api/market/watchlist${qs}`, { signal })
}

export function getHealth(signal?: AbortSignal): Promise<HealthResponse> {
  return request<HealthResponse>('/health', { signal })
}

export function triggerRetrain(): Promise<RetrainResponse> {
  return request<RetrainResponse>('/retrain', { method: 'POST' })
}

export function setFyersToken(accessToken: string): Promise<FyersTokenResponse> {
  return request<FyersTokenResponse>('/fyers/token', {
    method: 'POST',
    body: JSON.stringify({ access_token: accessToken }),
  })
}

export function getFyersLoginUrl(): string {
  return `${BASE_URL}/fyers/login`
}

export function getFyersStatus(signal?: AbortSignal): Promise<FyersAuthStatusResponse> {
  return request<FyersAuthStatusResponse>('/api/fyers-status', { signal })
}

export function forceFyersRefresh(): Promise<FyersAuthStatusResponse> {
  return request<FyersAuthStatusResponse>('/api/fyers/force-refresh', { method: 'POST' })
}

import type {
  ProfileResponse,
  UserProfileUpdatePayload,
  TradeHistoryItem,
  DbStatusResponse,
} from '../types/api'

export function getUserProfile(
  userId = 'usr_demo_trader',
  userMeta?: { fullName?: string; email?: string; username?: string; phone?: string; avatarInitials?: string },
  signal?: AbortSignal
): Promise<ProfileResponse> {
  const params: Record<string, string> = { user_id: userId }
  if (userMeta?.fullName) params.full_name = userMeta.fullName
  if (userMeta?.email) params.email = userMeta.email
  if (userMeta?.username) params.username = userMeta.username
  if (userMeta?.phone) params.phone = userMeta.phone
  if (userMeta?.avatarInitials) params.avatar_initials = userMeta.avatarInitials
  const qs = new URLSearchParams(params).toString()
  return request<ProfileResponse>(`/api/profile?${qs}`, { signal })
}

export function updateUserProfile(payload: UserProfileUpdatePayload, userId = 'usr_demo_trader'): Promise<ProfileResponse> {
  const qs = new URLSearchParams({ user_id: userId }).toString()
  return request<ProfileResponse>(`/api/profile?${qs}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export function getUserTrades(userId = 'usr_demo_trader', signal?: AbortSignal): Promise<TradeHistoryItem[]> {
  const qs = new URLSearchParams({ user_id: userId }).toString()
  return request<TradeHistoryItem[]>(`/api/profile/trades?${qs}`, { signal })
}

export function recordUserTrade(payload: Partial<TradeHistoryItem>): Promise<TradeHistoryItem> {
  return request<TradeHistoryItem>('/api/profile/trades', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function getDbStatus(signal?: AbortSignal): Promise<DbStatusResponse> {
  return request<DbStatusResponse>('/api/profile/db-status', { signal })
}

