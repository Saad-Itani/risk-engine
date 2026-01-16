// Feature flags
export const FEATURE_FLAGS = {
  ENABLE_LLM_RECOMMENDATIONS: import.meta.env.VITE_ENABLE_LLM === 'true',
  ENABLE_BACKTESTING: true,
  ENABLE_ES_METRIC: true,
} as const

// API configuration
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000',
  TIMEOUT: 60000, // 60 seconds for LLM/backtesting operations
} as const

// Risk level thresholds
export const RISK_LEVELS = {
  LOW: { threshold: 0.02, color: 'green', label: 'LOW' },
  MODERATE: { threshold: 0.05, color: 'yellow', label: 'MODERATE' },
  HIGH: { threshold: 0.10, color: 'orange', label: 'HIGH' },
  SEVERE: { threshold: Infinity, color: 'red', label: 'SEVERE' },
} as const

// VaR calculation methods
export const VAR_METHODS = [
  { value: 'historical', label: 'Historical Simulation' },
  { value: 'parametric', label: 'Parametric (Variance-Covariance)' },
  { value: 'monte_carlo', label: 'Monte Carlo Simulation' },
] as const

// Monte Carlo modes
export const MC_MODES = [
  { value: 'bootstrap', label: 'Bootstrap (Historical Resampling)' },
  { value: 'normal', label: 'Normal Distribution' },
  { value: 'student_t', label: 'Student-t Distribution' },
] as const

// Default parameter values
export const DEFAULT_PARAMS = {
  confidence: 0.95,
  horizon_days: 5,
  lookback_days: 1260,
  simulations: 100000,
  df_t: 6,
  target_var_reduction_pct: 20,
} as const
