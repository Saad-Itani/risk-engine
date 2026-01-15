import os

class Config:
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL", "sqlite:///risk_engine.db")
    SQLALCHEMY_TRACK_MODIFICATIONS = False


# ============================================================================
# Risk Policy: User-Editable Knobs (no more arbitrary profiles)
# ============================================================================

# Default risk policy knobs - users can override these
DEFAULT_RISK_POLICY = {
    # Concentration limits
    "max_single_weight": 0.30,              # Max % of portfolio in single position (default 30%)
    "max_single_risk_contribution": 0.45,   # Max % of VaR from single position (default 45%)
    "min_effective_n": 3.0,                 # Minimum effective number of positions (optional)

    # Tail-risk budget
    "var_budget_pct": 0.05,                 # Max acceptable VaR as % of portfolio (default 5%)
}

# ============================================================================
# Backtesting Parameters
# ============================================================================

# Default backtesting lookback period (trading days)
DEFAULT_BACKTEST_LOOKBACK = int(os.getenv("DEFAULT_BACKTEST_LOOKBACK", "252"))  # 1 year

# Default backtesting step size (evaluate every N days)
DEFAULT_BACKTEST_STEP = int(os.getenv("DEFAULT_BACKTEST_STEP", "5"))

# Number of recent breaches to return in API response
BACKTEST_RECENT_BREACHES_LIMIT = int(os.getenv("BACKTEST_RECENT_BREACHES_LIMIT", "10"))

# Kupiec test p-value threshold for model calibration
KUPIEC_PVALUE_THRESHOLD = float(os.getenv("KUPIEC_PVALUE_THRESHOLD", "0.05"))

# ============================================================================
# LLM Recommendations (OpenAI)
# ============================================================================

# OpenAI API configuration
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", None)  # Required for LLM recommendations
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")  # Default to cheapest/fastest (use gpt-5-nano when available)
OPENAI_BASE_URL = os.getenv("OPENAI_BASE_URL", None)  # Required for gpt-5-nano (custom endpoint)

# LLM generation parameters
LLM_MAX_TOKENS = int(os.getenv("LLM_MAX_TOKENS", "1000"))
LLM_TEMPERATURE = float(os.getenv("LLM_TEMPERATURE", "0.3"))