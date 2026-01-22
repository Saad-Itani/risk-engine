# Risk Engine

> A terminal-inspired platform for portfolio risk, VaR, and analytics.

![Web App](https://img.shields.io/badge/Type-Web%20App-orange?style=for-the-badge)
![Risk Analytics](https://img.shields.io/badge/Category-Risk%20Analytics-blue?style=for-the-badge)
![MIT License](https://img.shields.io/badge/License-MIT-cyan?style=for-the-badge)

> **Live at [risk.saaditani.com](https://risk.saaditani.com)** • Try it now with no installation required

## 🎯 Purpose & Motivation

Risk Engine was created out of **genuine interest in financial markets, quantitative analysis, and practical applications of data and finance**.

Most existing VaR tools require users to manually input portfolio values, returns, volatilities, and other assumptions, which feels disconnected from how real portfolios are managed and introduces unnecessary friction.

**The Problem:** Most VaR (Value at Risk) calculators available online require you to manually input portfolio size in dollars, expected rate of return, volatility, and other statistical parameters. This is cumbersome, error-prone, and disconnected from reality.

**The Solution:** Risk Engine takes a fundamentally different approach. Simply enter your portfolio holdings as **stock symbols and share quantities** (e.g., AAPL: 100 shares, MSFT: 50 shares), and the system handles everything else:
- Automatically fetches real-time and historical price data
- Calculates portfolio value from current market prices
- Computes risk metrics using actual historical returns
- Provides professional-grade risk decomposition analysis

**More than convenience:** This approach ensures your risk analysis is grounded in **real market data**, not theoretical assumptions. The system handles the complexity so you can focus on insights.

---

## ✨ Key Features

### 📊 Portfolio Builder
- **Intuitive ticker search** with autocomplete (powered by a universe of 500+ US stocks)
- **Real-time portfolio valuation** using current market prices
- **Persistent storage** - your portfolio is saved locally and survives page refreshes
- **Flexible management** - add, edit, or remove positions on the fly

### 📈 Risk Metrics Calculator (VaR & ES)
Calculate portfolio risk using industry-standard methodologies:

**Three computational methods:**
1. **Historical Simulation** - Exact empirical distribution from rolling window analysis
2. **Parametric (Variance-Covariance)** - Normal distribution assumption with closed-form solutions
3. **Monte Carlo Simulation** - Bootstrap, Normal, or Student-t distributions with 100k+ simulations

**Dual risk metrics:**
- **VaR (Value at Risk):** Maximum expected loss at a given confidence level (e.g., 95% confidence, 5-day horizon)
- **ES (Expected Shortfall / CVaR):** Average loss in the worst-case tail scenarios (superior to VaR as it captures tail risk)

**Why both VaR and ES?** While VaR answers "What's the worst loss I can expect?", ES goes further by asking "If things go really bad, how bad will it get on average?" ES is always included because it's a more coherent risk measure (sub-additive, unlike VaR).

**Customizable parameters:**
- Confidence levels: 90%, 95%, 99%
- Horizon: 1-30 days
- Lookback period: 30-1000 days
- Monte Carlo options: simulation count, distribution type, degrees of freedom for Student-t

### 🔍 Risk Analysis Dashboard
The crown jewel of Risk Engine - comprehensive portfolio risk decomposition and validation.

**Component VaR Decomposition:**
- **Position-level risk contribution** using Euler allocation (see [Design Decisions](#-design-decisions) below)
- **Marginal VaR** - sensitivity analysis showing impact of position size changes
- **Percentage contribution** - identify which positions dominate your portfolio risk
- **Interactive visualizations** - horizontal bar charts and sortable tables

**Risk Metrics Summary:**
- **VaR/ES as % of portfolio value** - understand risk in relative terms
- **Concentration metrics:**
  - Largest position weight
  - Effective number of positions (diversity measure based on Herfindahl index)
- **Risk dominance:**
  - Which single position contributes most to total VaR?
  - Is your risk well-distributed or concentrated?

**Backtesting Validation:**
- **Kupiec POF Test** - statistical validation of your VaR model
- **Breach rate analysis** - compare actual vs. expected exceedances
- **Calibration assessment** - is your model well-calibrated or over/under-estimating risk?
- **Historical performance** - see how well VaR predictions held up historically

**AI-Powered Recommendations (Coming Soon):**
- LLM-generated portfolio insights and diversification suggestions
- Risk reduction strategies tailored to your holdings
- Position sizing recommendations
- Natural language explanations of complex risk metrics

---

## 🏗️ Design Decisions

### Why Parametric Method for Component VaR?

In the **Risk Analysis** section, we exclusively use the **parametric (variance-covariance) method** for Component VaR decomposition. Here's why:

**Mathematical Foundation:**
Component VaR relies on **Euler allocation**, which decomposes total portfolio VaR into per-position contributions using partial derivatives:

```
ComponentVaR[i] = ∂(Portfolio VaR) / ∂(weight[i]) × weight[i]
```

**Why Parametric?**
1. **Derivatives are tractable** - The parametric method assumes returns are normally distributed, making the portfolio VaR formula differentiable:
   ```
   VaR = -μₚ + z × σₚ
   where σₚ = √(w^T Σ w)
   ```

2. **Closed-form marginal VaR** - We can compute `∂VaR/∂w[i]` analytically:
   ```
   Marginal VaR[i] = z × (Σw)[i] / σₚ
   ```

3. **Component contributions sum to total** - Euler's theorem guarantees:
   ```
   Total VaR = Σ ComponentVaR[i]
   ```

**Why not Historical or Monte Carlo?**
- **Historical method:** Empirical distributions don't have smooth derivatives; computing marginal VaR requires numerical approximation (perturb weights, re-compute VaR)
- **Monte Carlo:** Same issue - requires expensive re-simulation for each position's marginal contribution
- **Performance:** Parametric gives instant decomposition; other methods would require 10+ VaR calculations (one per position) for a 10-asset portfolio

**Trade-off:** We accept the normality assumption (which can underestimate tail risk) in exchange for **fast, mathematically rigorous risk attribution**. For tail risk estimation, the VaR Calculator supports all three methods.

### Bloomberg Terminal Aesthetic

The UI is intentionally designed to evoke the Bloomberg Terminal:
- **Color scheme:** Bloomberg Orange (#FF6600), cyan accents, high-contrast dark theme
- **Typography:** JetBrains Mono for data/numbers (tabular figures), Inter for text
- **Layout:** Compact, information-dense, minimal whitespace
- **Styling:** Sharp corners, terminal-like cards, uppercase labels
- **Data presentation:** Monospace formatting for alignment, color-coded risk levels

This design choice reflects the app's **professional financial focus** and creates a familiar environment for finance practitioners.

---

## ⚠️ Assumptions & Limitations

Like all quantitative risk models, Risk Engine makes certain simplifying assumptions. Understanding these is crucial for interpreting results correctly.

### Mathematical Assumptions

#### 1. **Normal Distribution (Parametric Method)**
- **Assumption:** Asset returns follow a multivariate normal distribution
- **Implication:** Tail risk (extreme events) may be **underestimated** - real markets have "fat tails"
- **When it breaks:** During market crashes, crises, or high volatility periods (returns exhibit negative skewness and excess kurtosis)
- **Mitigation:**
  - Use Historical method for empirical tail behavior
  - Use Monte Carlo with Student-t distribution (df=6) for heavier tails
  - Always compute ES alongside VaR (ES captures tail severity)

#### 2. **IID Returns (Independence & Identical Distribution)**
- **Assumption:** Daily returns are independent with constant mean/variance
- **Implication:**
  - No autocorrelation (momentum/mean reversion)
  - No volatility clustering (GARCH effects)
  - Horizon scaling formula assumes `Var(T days) = T × Var(1 day)`
- **When it breaks:** During trending markets, volatility regimes, or crisis periods
- **Evidence:** Square root of time rule (`σ_T = σ_daily × √T`) used for horizon scaling

#### 3. **Historical Stability**
- **Assumption:** Covariance matrix estimated from lookback period remains valid for forecast horizon
- **Implication:** Recent structural changes (e.g., Fed policy shifts, sector rotation) not captured
- **When it breaks:** Regime changes, economic transitions, correlation breakdowns
- **Mitigation:**
  - Use shorter lookback periods (252 days vs. 1260) for recent data
  - Monitor backtesting results for calibration drift
  - Re-estimate VaR frequently (daily/weekly)

#### 4. **Log Returns**
- **Assumption:** Returns computed as `r = ln(P_t / P_{t-1})` instead of arithmetic `(P_t - P_{t-1}) / P_{t-1}`
- **Rationale:**
  - Log returns are time-additive (5-day return = sum of 5 daily log returns)
  - More symmetric distribution for large moves
  - Better for portfolio aggregation
- **Conversion:** Dollar loss computed via `Loss = V₀ × (1 - exp(-VaR_log))` with "exp" PnL model

#### 5. **Fixed Holdings (No Rebalancing)**
- **Assumption:** Portfolio holds constant number of shares over horizon (not constant weights)
- **Implication:** Position weights drift with price changes; no dynamic hedging
- **Reality:** Most investors don't actively rebalance daily
- **Example:** If you own 100 AAPL shares, VaR assumes you still hold 100 shares in 5 days (not a fixed % of portfolio)

### Practical Limitations

#### 6. **No Transaction Costs or Slippage**
- **Limitation:** VaR doesn't account for bid-ask spreads, market impact, or rebalancing costs
- **Impact:** Real liquidation losses may exceed VaR estimates for large or illiquid positions

#### 7. **Linear Instruments Only**
- **Limitation:** VaR calculations assume linear payoffs (stocks, ETFs)
- **Not supported (currently):**
  - Options (non-linear payoffs require delta-gamma approximations)
  - Leveraged positions (margin, derivatives)
  - Short positions (separate risk profile)
- **Future:** Options support planned via delta-gamma VaR

#### 8. **Single Currency (No FX Risk)**
- **Limitation:** All positions assumed to be in USD; no currency risk modeling
- **Impact:** International portfolios (ADRs, foreign stocks) have unmodeled FX exposure
- **Future:** Multi-currency support on roadmap

#### 9. **Market Data Quality**
- **Dependency:** Relies on Yahoo Finance for historical prices
- **Risks:**
  - Data errors (splits, dividends adjustments)
  - Missing data (delisted stocks, low liquidity)
  - Stale prices (after-hours, halts)
- **Validation:** Manual checks recommended for critical portfolios

#### 10. **Liquidity Assumption**
- **Assumption:** Can liquidate positions at prevailing market prices
- **When it breaks:** Flash crashes, circuit breakers, low-volume stocks
- **Reality:** Liquidity risk separate from market risk (not modeled)

### Model Risk Considerations

#### Historical Method
- ✅ **Pro:** No distributional assumptions; captures actual tail events
- ❌ **Con:** Limited by sample size (5 years ≈ 1260 observations → 63 samples for 5% VaR)
- ⚠️ **Risk:** Past crises may not repeat; recent crises over-weighted

#### Parametric Method
- ✅ **Pro:** Smooth estimates, works with small samples, enables Component VaR
- ❌ **Con:** Normality assumption underestimates tail risk
- ⚠️ **Risk:** Severe underestimation during fat-tail events (Black Swan scenarios)

#### Monte Carlo Method
- ✅ **Pro:** Flexible distributions (bootstrap preserves empirical features, Student-t adds fat tails)
- ❌ **Con:** Computationally intensive, subject to simulation noise
- ⚠️ **Risk:** Bootstrap assumes past return patterns repeat; Student-t df selection subjective

### Best Practices for Interpretation

1. **Use Multiple Methods:** Compare Historical, Parametric, and Monte Carlo results - if they diverge significantly, investigate why
2. **Always Include ES:** VaR tells you the threshold; ES tells you the tail severity
3. **Backtest Regularly:** Run Kupiec test to validate model calibration (p-value > 0.05 is good)
4. **Stress Test:** Manually shock portfolio with crisis scenarios (e.g., "What if AAPL drops 30%?")
5. **Conservative Interpretation:** VaR is a **minimum** expected loss; reality can be worse
6. **Diversification:** Low Effective N (<5) indicates concentration risk - diversify!
7. **Monitor Component VaR:** Single positions contributing >30% of total VaR are red flags

### Known Limitations (To Be Addressed)

- **Short horizon bias:** VaR accuracy decreases for horizons >10 days due to IID assumption
- **Correlation instability:** Correlations spike during crises (diversification fails when needed most)
- **Survivorship bias:** Universe only includes currently listed stocks (delisted stocks missing)
- **No regime switching:** Model can't anticipate transitions from low-vol to high-vol regimes

**Bottom Line:** Risk Engine is a powerful tool for understanding portfolio risk, but like all models, it's a simplification of reality. Use it as one input among many for risk management decisions, not as absolute truth.

---

## 🛠️ Tech Stack

### Frontend
- **Framework:** React 18 + TypeScript 5
- **Build Tool:** Vite 5
- **Routing:** React Router 6
- **State Management:**
  - Zustand (portfolio holdings with localStorage persistence)
  - TanStack Query v5 (server state, caching, mutations)
  - React Context (theme management)
- **Styling:** Tailwind CSS + custom terminal styling
- **UI Components:** Custom components with shadcn/ui patterns
- **Charts:** Recharts
- **Forms:** React Hook Form + Zod validation
- **Animations:** Framer Motion (subtle, professional)
- **HTTP Client:** Axios with interceptors

### Backend
- **Framework:** Flask 3.1 + Flask-CORS
- **Database:** SQLAlchemy 2.0 (SQLite for development)
- **Data Processing:**
  - NumPy 2.4 (vectorized calculations)
  - pandas 2.3 (time series, returns)
  - SciPy 1.16 (statistical distributions)
- **Market Data:** yfinance 1.0 (Yahoo Finance API)
- **LLM Integration:** OpenAI Python SDK (GPT-4 for recommendations)
- **Environment:** python-dotenv for configuration

### Risk Calculation Engine
- **Languages:** Python (backend), TypeScript (frontend)
- **Core Algorithms:**
  - Historical simulation (rolling window)
  - Parametric VaR/ES (normal distribution, Cholesky decomposition)
  - Monte Carlo (bootstrap, normal, Student-t with Cholesky)
  - Euler allocation for Component VaR
  - Kupiec POF test for backtesting
- **Numerical Methods:**
  - Covariance matrix estimation with regularization
  - Horizon scaling (√T rule for variance)
  - Log-return vs. arithmetic return handling

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** 18+ and npm
- **Python** 3.10+ with pip
- **Git** (optional, for cloning)

### Installation

#### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/risk-engine.git
cd risk-engine
```

#### 2. Backend Setup
```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Initialize database
python -m backend.scripts.init_db

# Load company universe (500+ US stocks)
python -m backend.scripts.load_companies

# Backfill historical prices (may take 5-10 minutes)
python -m backend.scripts.backfill_prices --days 1260

# Create .env file
echo "OPENAI_API_KEY=your_api_key_here" > .env  # Optional, for LLM features
```

#### 3. Frontend Setup
```bash
cd ../frontend

# Install dependencies
npm install

# Create .env.local
echo "VITE_API_BASE_URL=http://localhost:5000" > .env.local
```

### Running the Application

#### Terminal 1 - Backend (Flask)
```bash
cd backend
source venv/bin/activate  # On Windows: venv\Scripts\activate
python -m flask --app backend.app run --port 5000
```

#### Terminal 2 - Frontend (Vite)
```bash
cd frontend
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 📖 Usage Guide

### Building a Portfolio
1. Navigate to the **PORTFOLIO** tab
2. Search for a ticker (e.g., "AAPL")
3. Enter number of shares
4. Click **ADD TO PORTFOLIO**
5. Repeat for all positions
6. Your portfolio is automatically saved

### Calculating VaR/ES
1. Go to **VAR CALC** tab
2. Select metric (VaR or ES)
3. Choose method (Historical, Parametric, or Monte Carlo)
4. Set parameters:
   - Confidence: 90%, 95%, 99%
   - Horizon: 1-30 days
   - Lookback: how much historical data to use
5. Click **COMPUTE**
6. View results: portfolio value, risk metrics, position breakdown

### Running Risk Analysis
1. Navigate to **RISK ANALYSIS** tab
2. Configure settings:
   - Confidence level
   - Horizon and lookback periods
   - Enable/disable backtesting
3. Click **ANALYZE RISK**
4. Review:
   - **Risk level badge** (LOW/MODERATE/HIGH/SEVERE)
   - **Risk facts** (VaR%, concentration, diversity)
   - **Component VaR chart & table** (which positions drive your risk?)
   - **Backtesting results** (is your model well-calibrated?)

---

## 🎯 Future Roadmap

### Near-Term (In Development)
- ✅ **AI-Powered Recommendations** - LLM integration is almost complete, UI coming soon

---

## 🧪 Testing

### Backend Tests
```bash
cd backend
python -m pytest tests/
```

### Frontend Tests (Coming Soon)
```bash
cd frontend
npm test
```

---

## 📊 Data & Privacy

### Market Data
- **Source:** Stooq via `pandas_datareader`
- **Coverage:** 500+ US stocks (S&P 500 + high-liquidity names)
- **Update Frequency:** Daily price updates (configurable via cron or manual refresh)
- **Historical Depth:** Up to 5 years (1260 trading days)

### Privacy
- **No user accounts (currently)** - All data stored locally in browser (localStorage) and local SQLite DB
- **No tracking** - No analytics or telemetry
- **API keys** - OpenAI API key (if used) is stored in `.env` file, never transmitted to frontend

---

## 🤝 Contributing

Contributions are welcome! This project is a personal passion project, but I'm open to:
- Bug reports and fixes
- Feature suggestions
- Code improvements
- Documentation enhancements

Please open an issue first to discuss major changes.

---

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

**Inspiration:**
- Bloomberg Terminal - for the aesthetic and professional UX patterns
- Portfolio Visualizer - for comprehensive portfolio analytics ideas
- Academic research on VaR/ES methodology and Component VaR decomposition

**Libraries & Tools:**
- React, Vite, Tailwind CSS, TanStack Query - modern frontend stack
- Flask, NumPy, pandas, SciPy - Python data science ecosystem
- stooq - for democratizing access to market data
- OpenAI - for LLM-powered insights

---

## 📧 Contact

Questions, feedback, or collaboration ideas? Reach out:
- GitHub Issues: [Create an issue](https://github.com/saad-itani/risk-engine/issues)
- Email: saad@saaditani.com

---

## 📚 Appendix: Risk Metrics Glossary

### Value at Risk (VaR)
> **Definition:** The maximum expected loss over a given time horizon at a specified confidence level.

**Example:** "With 95% confidence, the portfolio's loss over 5 days will not exceed $147.78 (4.19%)."

**Interpretation:** There's a 5% chance losses will exceed VaR; 95% chance they won't.

### Expected Shortfall (ES / CVaR)
> **Definition:** The average loss in the worst (1 - confidence)% of scenarios.

**Example:** "With 95% confidence, if losses exceed the VaR threshold over 5 days, the average loss would be about $216.05 (6.19%)."

**Interpretation:** ES tells you what happens in the bad tail; it's always ≥ VaR.

**Why ES > VaR?** VaR only looks at the quantile; ES captures the severity beyond that point. ES is sub-additive (diversification reduces ES), unlike VaR.

### Component VaR
> **Definition:** A position's contribution to total portfolio VaR, computed via Euler allocation.

**Formula:**
```
ComponentVaR[i] = MarginalVaR[i] × weight[i] × TotalVaR
```

**Property:** Sum of all ComponentVaRs equals total portfolio VaR.

### Marginal VaR
> **Definition:** The change in portfolio VaR from a 1% increase in a position's weight.

**Formula:**
```
MarginalVaR[i] = ∂(Portfolio VaR) / ∂(weight[i])
```

**Use:** Identify which positions are most sensitive to size changes; useful for portfolio optimization.

### Effective Number of Positions (Effective N)
> **Definition:** A diversity measure based on the Herfindahl index.

**Formula:**
```
Effective N = 1 / Σ(weight[i]²)
```

**Interpretation:**
- **10 equal-weighted positions:** Effective N = 10 (perfect diversity)
- **1 position = 90%, 9 others = 1% each:** Effective N ≈ 1.2 (highly concentrated)

### Kupiec POF Test
> **Definition:** Statistical test for VaR model calibration (Proportion of Failures test).

**Null Hypothesis:** Breach rate equals expected rate (e.g., 5% for 95% VaR).

**Test Statistic:** Likelihood ratio test comparing observed vs. expected breaches.

**Result:** p-value > 0.05 → model is well-calibrated; p-value < 0.05 → model needs adjustment.

---

**Built with ❤️ for quantitative finance enthusiasts**
