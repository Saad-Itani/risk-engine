// ============================================================================
// API Request/Response Types
// These mirror the backend Flask API data models
// ============================================================================

// Common types
export interface Holding {
  symbol: string
  shares: number
}

export interface Company {
  symbol: string
  shortname: string
  longname: string
  sector: string
  industry: string
}

// Universe API
export type SearchUniverseResponse = Company[]

// VaR API
export interface VaRRequest {
  holdings: Holding[]
  method: 'historical' | 'parametric' | 'monte_carlo'
  confidence: number
  horizon_days: number
  lookback_days: number
  simulations?: number
  mc_mode?: 'bootstrap' | 'normal' | 'student_t'
  df_t?: number
}

export interface VaRResponse {
  method: string
  confidence: number
  horizon_days: number
  as_of: string
  db_as_of: string
  portfolio_value: number
  var_log_return: number
  var_dollars: number
  observations: number
  holdings: Array<{
    symbol: string
    shares: number
    weight: number
  }>
  meta: Record<string, unknown>
}

// ES (Expected Shortfall) API
export interface ESRequest extends VaRRequest {
  // ES uses same request structure as VaR
}

export interface ESResponse extends VaRResponse {
  es_log_return: number
  es_dollars: number
}

// Backtest API
export interface BacktestRequest extends VaRRequest {
  metric: 'var' | 'es'
  step?: number
}

export interface BacktestSummary {
  metric: 'var' | 'es'
  method: string
  confidence: number
  horizon_days: number
  lookback_days: number
  n_tests: number
  n_breaches: number
  breach_rate: number
  expected_rate: number
  kupiec_lr: number
  kupiec_p_value: number
  interpretation: string
  meta: Record<string, unknown>
}

export interface BacktestResponse {
  summary: BacktestSummary
  recent_breaches: Array<{
    date: string
    realized_loss_dollars: number
    var_dollars: number
    excess_loss: number
  }>
  db_as_of: string
}

// Risk Analysis API
export interface RiskAnalysisRequest {
  holdings: Holding[]
  confidence: number
  horizon_days: number
  lookback_days?: number
  include_backtest?: boolean
  include_es?: boolean
  include_llm_recommendations?: boolean
  llm_custom_instructions?: string
}

export interface ComponentVaR {
  symbol: string
  position_value: number
  weight: number
  component_var_dollars: number
  marginal_var_dollars: number
  percentage_contribution: number
}

export interface RiskFacts {
  var_pct: number
  var_dollars: number
  max_single_weight: number
  max_single_weight_symbol: string
  effective_n: number
  max_single_risk_contribution: number
  max_single_risk_contribution_symbol: string
  top_contributors: Array<{
    symbol: string
    weight: number
    risk_pct: number
  }>
  es_pct?: number
  es_dollars?: number
  avg_pairwise_corr?: number
  max_pairwise_corr?: number
  top_correlated_pairs?: Array<{
    symbol_1: string
    symbol_2: string
    correlation: number
  }>
}

export interface RiskAnalysisResponse {
  as_of: string
  method: string
  confidence: number
  horizon_days: number
  portfolio_value: number
  components: ComponentVaR[]
  risk_facts: RiskFacts
  backtest?: BacktestSummary
  llm_recommendations?: string
  llm_error?: string | null
  db_as_of: string
}

// API Error Response
export interface APIError {
  error: string
  detail?: string
  symbols?: string[]
}
