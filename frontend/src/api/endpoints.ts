// ============================================================================
// API Endpoint Constants
// Single source of truth for backend routes
// If backend routes change, update only this file
// ============================================================================

export const API_ENDPOINTS = {
  // Universe - Company search
  UNIVERSE: '/universe',

  // VaR - Value at Risk calculation
  VAR: '/var',

  // ES - Expected Shortfall calculation
  ES: '/es',

  // Backtesting
  RISK_BACKTEST: '/risk/backtest',

  // Risk Analysis - Comprehensive analysis with component VaR
  RISK_ANALYSIS: '/risk/analysis',
} as const
