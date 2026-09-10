// Types mirroring the FastAPI backend's response schemas (api/app.py, inference/predictor.py)

export interface GrowwOrderAnalysis {
  qty: number
  limit_price: number
  required_capital: number
  custom_profit_potential: number
  custom_max_risk: number
  custom_rr_ratio: string
  is_limit_in_entry_zone: boolean
  order_verdict: string
  order_advice: string
}

export interface AiInsights {
  actionable_signal: string
  target_price_30m: number
  target_return_30m_pct: number
  target_price_eod: number
  target_return_eod_pct: number
  full_day_rr_ratio: string
  suggested_entry_zone: string
  risk_reward_ratio: string
  capital_allocation: string
  confidence_pct: number
  market_trend: string
  horizon_explanation: string
}

export interface PositionSizing {
  capital_allocation_pct: number
  position_size_label: string
}

export interface KeyLevelsGuard {
  support_20: number
  resistance_20: number
  near_resistance: boolean
  near_support: boolean
  suggested_entry_zone: string
}

export interface ConfluenceGuard {
  volume_ratio_20: number
  high_volume_confirmation: boolean
  rsi_14: number
  rsi_overbought: boolean
  rsi_oversold: boolean
}

export interface RiskManagement {
  dynamic_stop_loss: number
  dynamic_target_price: number
  atr_14_points: number
  risk_reward_ratio: string
  passes_risk_reward_guard: boolean
  position_sizing: PositionSizing
  key_levels_guard: KeyLevelsGuard
  confluence_guard: ConfluenceGuard
  override_reason: string | null
}

export interface Momentum {
  rsi_14: number
  macd_status: string
}

export interface ExpectedMove {
  atr_14_points: number
  target_price: number
  stop_loss_price: number
  suggested_entry_zone: string
  duration: string
}

export interface KeyLevels {
  support_20: number
  resistance_20: number
  entry_advice: string
}

export interface VolumeStrength {
  volume_ratio_20: number
  high_volume_confirmation: boolean
  description: string
}

export interface RiskRewardGuard {
  drawdown_50_pct: number
  risk_reward_ratio: string
  passes_guard: boolean
}

export interface LtpChange {
  current_price: number
  change?: number
  change_pct?: number
  return_1_pct: number
}

export interface Analytics {
  ai_recommendation: string
  actionable_signal: string
  raw_direction: string
  market_trend: string
  trade_score: number
  momentum: Momentum
  expected_move: ExpectedMove
  key_levels: KeyLevels
  volume_strength: VolumeStrength
  risk_rating: string
  position_sizing: string
  volatility_20_pct: number
  risk_reward_guard: RiskRewardGuard
  ltp_change: LtpChange
}

export interface PredictionResponse {
  ticker: string
  timestamp: string
  current_price: number
  change?: number
  change_percent?: number
  predicted_return_pct: number
  predicted_price: number
  direction: 'UP' | 'DOWN'
  proba_up: number
  confidence_score: number
  regressor_version: string
  classifier_version: string
  groww_order_analysis: GrowwOrderAnalysis
  ai_insights: AiInsights
  risk_management: RiskManagement
  analytics: Analytics
  is_live?: boolean
}

export interface BatchPredictionResponse {
  batch_predictions: Record<string, PredictionResponse | { error: string }>
}

export interface MarketSummaryResponse {
  symbol: string
  price: number
  change: number
  change_percent: number
  timestamp: string
  market_status: 'PRE_MARKET' | 'OPEN' | 'CLOSED'
  auth_status: string
  is_live: boolean
}

export interface ChampionModelsInfo {
  return_regressor: string
  regressor_metrics: Record<string, unknown>
  direction_classifier: string
  classifier_metrics: Record<string, unknown>
}

export interface HealthResponse {
  status: string
  service: string
  fyers_connection: Record<string, unknown>
  champion_models: ChampionModelsInfo
  nifty50_universe_count: number
}

export interface RetrainResponse {
  message: string
  status: string
}

export interface FyersTokenResponse {
  message: string
  is_authenticated: boolean
}

export interface FyersAuthStatusResponse {
  is_authenticated: boolean
  status: string
  headless_login_configured: boolean
  has_access_token: boolean
  has_refresh_token: boolean
  last_error: string
}

export class ApiError extends Error {
  status?: number
  constructor(message: string, status?: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export interface TradeHistoryItem {
  id?: string
  user_id?: string
  date: string
  ticker: string
  type: 'BUY' | 'SELL'
  qty: number
  price: number
  status?: string
  pnl?: number
  created_at?: string
}

export interface ProfileStats {
  total_trades: number
  winning_trades: number
  losing_trades: number
  win_rate_pct: number
  total_realized_pnl: number
}

export interface ProfileResponse {
  id: string
  full_name: string
  email: string
  username: string
  phone: string
  avatar_initials: string
  is_verified: boolean
  registered_at?: string
  stats: ProfileStats
  recent_trades: TradeHistoryItem[]
}

export interface UserProfileUpdatePayload {
  full_name?: string
  email?: string
  username?: string
  phone?: string
}

export interface DbStatusResponse {
  connected: boolean
  message: string
  database: string
}

export interface WatchlistQuoteItem {
  ticker: string
  price: number
  change: number
  change_percent: number
  open?: number
  high?: number
  low?: number
  volume?: number
}

export interface WatchlistResponse {
  is_live: boolean
  source: string
  timestamp: string
  quotes: Record<string, WatchlistQuoteItem>
}

