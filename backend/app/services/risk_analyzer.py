# backend/app/services/risk_analyzer.py

"""
Risk Analyzer: Component VaR decomposition and risk metrics computation
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Optional, Union
import numpy as np
import pandas as pd

from backend.app.services.risk_engine import RiskEngine, VaRResult, ESResult, PnlModel
from backend.app.services.backtesting import RiskBacktester, BacktestSummary


@dataclass(frozen=True)
class ComponentVaR:
    """Per-stock contribution to portfolio VaR"""
    symbol: str
    shares: float
    position_value: float
    weight: float  # Position weight in portfolio
    component_var_dollars: float  # Contribution to total portfolio VaR
    marginal_var_dollars: float  # Impact per 1% weight increase
    percentage_contribution: float  # ComponentVaR / Total VaR


@dataclass(frozen=True)
class RiskFacts:
    """
    Simple portfolio risk metrics - no severity, no violations, just facts.

    These are clean inputs for UI display or LLM reasoning.
    """
    # Tail risk (required fields)
    var_pct: float  # VaR as % of portfolio value
    var_dollars: float

    # Concentration metrics (required fields)
    max_single_weight: float  # Largest position weight
    max_single_weight_symbol: str  # Which symbol
    effective_n: float  # Effective number of positions (1 / sum(w²))

    # Risk dominance (required fields)
    max_single_risk_contribution: float  # Largest % contribution to VaR
    max_single_risk_contribution_symbol: str  # Which symbol

    # Top contributors (required field)
    top_contributors: List[Dict[str, Union[str, float]]]  # [{"symbol": "AAPL", "weight": 0.3, "risk_pct": 0.45}, ...]

    # Optional fields (must come after required fields)
    es_pct: Optional[float] = None  # ES as % of portfolio value (if computed)
    es_dollars: Optional[float] = None  # ES in dollars (if computed)
    avg_pairwise_corr: Optional[float] = None  # Average correlation between positions
    max_pairwise_corr: Optional[float] = None  # Highest correlation between any two positions
    top_correlated_pairs: Optional[List[Dict[str, Union[str, float]]]] = None  # Top 3 correlated pairs


@dataclass(frozen=True)
class RiskAnalysisResult:
    """Complete risk analysis with component breakdown and risk facts"""
    # Original VaR/ES result
    var_result: Union[VaRResult, ESResult]

    # Component breakdown
    components: List[ComponentVaR]

    # Risk facts (replaces diagnosis/violations)
    risk_facts: RiskFacts

    # Metadata
    meta: dict

    # Optional fields
    backtest_summary: Optional[BacktestSummary] = None
    llm_recommendations: Optional[str] = None


class RiskAnalyzer:
    """
    Decomposes portfolio risk into component contributions and computes risk metrics.

    Core capabilities:
    - Component VaR decomposition (per-stock risk contribution via Euler allocation)
    - Risk facts computation (tail risk, concentration, effective_n)
    - Optional backtesting validation
    """

    def __init__(self, prices: pd.DataFrame):
        """
        Args:
            prices: DataFrame with index=dates, columns=symbols, values=close prices
        """
        self.risk_engine = RiskEngine(prices)
        self.prices = prices

    def analyze_portfolio(
        self,
        holdings: Dict[str, float],
        confidence: float = 0.95,
        horizon_days: int = 5,
        *,
        include_backtest: bool = False,
        include_es: bool = True,  # Compute ES alongside VaR
        include_llm_recommendations: bool = False,  # Generate LLM recommendations
        llm_custom_instructions: Optional[str] = None,  # Custom LLM instructions
        pnl_model: PnlModel = "linear",
    ) -> RiskAnalysisResult:
        """
        Perform risk analysis on portfolio using parametric VaR decomposition.

        Args:
            holdings: Dict mapping symbol to number of shares
            confidence: Confidence level (e.g., 0.95)
            horizon_days: Time horizon for VaR
            include_backtest: Whether to run backtesting validation
            include_es: Whether to compute Expected Shortfall (default: True)
            include_llm_recommendations: Whether to generate LLM-powered recommendations (requires OPENAI_API_KEY)
            llm_custom_instructions: Optional custom instructions for LLM analysis
            pnl_model: P&L model (linear/exp)

        Returns:
            RiskAnalysisResult with component breakdown, risk facts, and optional backtest/LLM recommendations

        Note:
            Always uses parametric method for clean, consistent risk decomposition.
        """
        # Step 1: Calculate VaR using parametric method with internals
        var_result, internals = self.risk_engine.var(
            holdings=holdings,
            method="parametric",
            confidence=confidence,
            horizon_days=horizon_days,
            pnl_model=pnl_model,
            return_internals=True,
        )

        # Step 1b: Optionally compute ES for better tail risk assessment
        es_result = None
        if include_es:
            try:
                es_result = self.risk_engine.es(
                    holdings=holdings,
                    method="parametric",
                    confidence=confidence,
                    horizon_days=horizon_days,
                    pnl_model=pnl_model,
                )
            except Exception as e:
                print(f"ES calculation failed: {e}")

        # Step 2: Compute component VaR using parametric decomposition
        components = self._compute_component_var(
            var_log=var_result.var_log_return,
            var_dollars=var_result.var_dollars,
            internals=internals,
        )

        # Step 3: Compute risk facts (concentration, effective_n, correlations, etc.)
        risk_facts = self._compute_risk_facts(
            var_result=var_result,
            es_result=es_result,
            components=components,
            internals=internals,
        )

        # Step 4: Run backtesting validation (optional)
        backtest_summary = None
        if include_backtest:
            try:
                backtest_summary = self._run_backtest_validation(
                    holdings=holdings,
                    confidence=confidence,
                    horizon_days=horizon_days,
                )
            except Exception as e:
                # Don't fail the entire analysis if backtesting fails
                print(f"Backtesting failed: {e}")

        # Step 5: Generate LLM recommendations (optional)
        llm_recommendations = None
        if include_llm_recommendations:
            try:
                llm_recommendations = self._generate_llm_recommendations(
                    var_result=var_result,
                    components=components,
                    risk_facts=risk_facts,
                    backtest_summary=backtest_summary,
                    confidence=confidence,
                    horizon_days=horizon_days,
                    custom_instructions=llm_custom_instructions,
                )
            except Exception as e:
                # Don't fail analysis if LLM fails
                print(f"LLM recommendations failed: {e}")

        return RiskAnalysisResult(
            var_result=var_result,
            components=components,
            risk_facts=risk_facts,
            meta={
                "method": "parametric",
                "confidence": confidence,
                "horizon_days": horizon_days,
            },
            backtest_summary=backtest_summary,
            llm_recommendations=llm_recommendations,
        )

    def _compute_component_var(
        self,
        var_log: float,
        var_dollars: float,
        internals: dict,
    ) -> List[ComponentVaR]:
        """
        Decompose portfolio VaR into per-stock contributions using Euler allocation.

        **Parametric VaR** (when mu_horizon present in internals):
            VaR = -μ_p + |z| × σ_p
            Euler allocation:
                ComponentVaR[i] = -w[i] × μ_h[i] + (-z) × w[i] × (Σ_h w)[i] / σ_p
            This properly allocates BOTH mean and volatility terms.

        **Monte Carlo VaR** (when mu_horizon not present):
            VaR from simulation (includes mean/volatility naturally)
            Euler allocation (volatility-based):
                ComponentVaR[i] = weight[i] × Beta[i] × VaR_log
                where Beta[i] = (Σ_h w)[i] / σ_p

        In both cases: Σ ComponentVaR[i] = VaR_portfolio (exact)

        Args:
            var_log: Total portfolio VaR in log return space (positive magnitude)
            var_dollars: Total portfolio VaR in dollars (positive magnitude)
            internals: Dict with keys: symbols, weights, cov_horizon, portfolio_value,
                       optional: mu_horizon, z_quantile (for parametric)

        Returns:
            List of ComponentVaR objects sorted by percentage contribution (descending)
        """
        symbols = internals["symbols"]
        weights = internals["weights"]  # numpy array
        cov_horizon = internals["cov_horizon"]  # HORIZON-scaled covariance matrix
        portfolio_value = internals["portfolio_value"]
        shares = internals["shares"]
        prices = internals["prices"]

        n = len(symbols)

        # Portfolio variance for the horizon: σ²_p = w^T Σ_h w
        portfolio_variance = weights @ cov_horizon @ weights
        portfolio_volatility = np.sqrt(portfolio_variance)

        # Check if parametric VaR (has mu_horizon)
        # Parametric: VaR = -μ_p + |z| × σ_p, needs Euler allocation for BOTH mean and volatility
        # Monte Carlo: VaR from simulation, only volatility decomposition needed
        if "mu_horizon" in internals:
            # Parametric VaR: proper Euler allocation
            # ComponentVaR[i] = -w[i] × μ_h[i] + (-z) × w[i] × (Σ_h w)[i] / σ_p
            mu_h = internals["mu_horizon"]
            z = internals["z_quantile"]  # Negative at alpha (e.g., -1.645 for 95%)

            # Covariance with portfolio
            cov_with_portfolio = cov_horizon @ weights  # (Σ_h w)[i]

            # Mean component allocation: -w[i] × μ_h[i]
            mean_component = -weights * mu_h

            # Volatility component allocation: -z × w[i] × (Σ_h w)[i] / σ_p
            volatility_component = -z * weights * cov_with_portfolio / portfolio_volatility

            # Total component VaR in log space
            component_var_log = mean_component + volatility_component

            # Marginal VaR: ∂VaR/∂w[i] = -μ_h[i] - z × (Σ_h w)[i] / σ_p
            marginal_var_log = -mu_h - z * cov_with_portfolio / portfolio_volatility
        else:
            # Monte Carlo VaR: simulation-based, only volatility decomposition
            # ComponentVaR_log[i] = weight[i] × Beta[i] × VaR_log
            # where Beta[i] = (Σ_h w)[i] / σ_p
            cov_with_portfolio = cov_horizon @ weights
            betas = cov_with_portfolio / portfolio_volatility
            component_var_log = weights * betas * var_log
            marginal_var_log = betas * var_log

        # Percentage contributions (based on log space decomposition)
        # This ensures exact sum: Σ ComponentVaR_log[i] = VaR_log
        percentage_contributions = component_var_log / var_log

        # Scale to dollar VaR (proportional allocation)
        # This ensures exact sum: Σ ComponentVaR_dollars[i] = VaR_dollars
        component_var_dollars = percentage_contributions * var_dollars

        # Marginal VaR in dollars (also scaled proportionally)
        marginal_var_percentage = marginal_var_log / var_log
        marginal_var_dollars = marginal_var_percentage * var_dollars

        # Create ComponentVaR objects
        components = []
        for i, symbol in enumerate(symbols):
            components.append(ComponentVaR(
                symbol=symbol,
                shares=float(shares[i]),
                position_value=float(shares[i] * prices[i]),
                weight=float(weights[i]),
                component_var_dollars=float(component_var_dollars[i]),
                marginal_var_dollars=float(marginal_var_dollars[i]),
                percentage_contribution=float(percentage_contributions[i]),
            ))

        # Sort by percentage contribution (descending)
        components.sort(key=lambda c: c.percentage_contribution, reverse=True)

        # Verification: components should exactly sum to total VaR (Euler allocation property)
        total_component_var = sum(c.component_var_dollars for c in components)
        if abs(total_component_var - var_dollars) > 0.01:  # Allow 1 cent tolerance for rounding
            print(f"Warning: Component VaR sum ({total_component_var:.2f}) != Total VaR ({var_dollars:.2f})")

        return components

    def _create_simple_components(
        self,
        holdings: Dict[str, float],
        var_result: VaRResult,
    ) -> List[ComponentVaR]:
        """
        Create simple component breakdown when covariance matrix not available.
        Allocates VaR proportionally to position weights (approximation).
        """
        portfolio_value = var_result.portfolio_value
        var_dollars = var_result.var_dollars

        components = []
        for symbol, shares in holdings.items():
            # Get latest price (rough approximation)
            if symbol in self.prices.columns:
                price = float(self.prices[symbol].iloc[-1])
            else:
                price = 0.0

            position_value = shares * price
            weight = position_value / portfolio_value if portfolio_value > 0 else 0.0

            # Simple proportional allocation
            component_var = weight * var_dollars
            marginal_var = var_dollars  # Approximation

            components.append(ComponentVaR(
                symbol=symbol,
                shares=shares,
                position_value=position_value,
                weight=weight,
                component_var_dollars=component_var,
                marginal_var_dollars=marginal_var,
                percentage_contribution=weight,
            ))

        components.sort(key=lambda c: c.percentage_contribution, reverse=True)
        return components

    def _compute_risk_facts(
        self,
        var_result: VaRResult,
        es_result: Optional[ESResult],
        components: List[ComponentVaR],
        internals: dict,
    ) -> RiskFacts:
        """
        Compute clean risk metrics without severity judgments.

        Returns:
            RiskFacts with tail risk, concentration, correlations, and top contributors
        """
        portfolio_value = var_result.portfolio_value
        var_dollars = var_result.var_dollars

        # Tail risk: VaR
        var_pct = var_dollars / portfolio_value if portfolio_value > 0 else 0.0

        # Tail risk: ES (if available)
        es_pct = None
        es_dollars = None
        if es_result is not None:
            es_dollars = es_result.es_dollars
            es_pct = es_dollars / portfolio_value if portfolio_value > 0 else 0.0

        # Concentration: max single weight
        max_single_component = max(components, key=lambda c: c.weight) if components else None
        max_single_weight = max_single_component.weight if max_single_component else 0.0
        max_single_weight_symbol = max_single_component.symbol if max_single_component else ""

        # Effective number of positions: 1 / sum(w²)
        # Measures concentration as "how many equal-weight positions would this behave like?"
        weights_squared_sum = sum(c.weight ** 2 for c in components)
        effective_n = 1.0 / weights_squared_sum if weights_squared_sum > 0 else 0.0

        # Risk dominance: max single risk contribution
        max_risk_component = max(components, key=lambda c: abs(c.percentage_contribution)) if components else None
        max_single_risk_contribution = abs(max_risk_component.percentage_contribution) if max_risk_component else 0.0
        max_single_risk_contribution_symbol = max_risk_component.symbol if max_risk_component else ""

        # Diversification: correlation metrics
        # Compute from covariance matrix in internals (more efficient than recomputing from prices)
        avg_pairwise_corr = None
        max_pairwise_corr = None
        top_correlated_pairs = None

        if len(components) > 1 and "cov_daily" in internals and "symbols" in internals:
            symbols = internals["symbols"]
            cov_matrix = internals["cov_daily"]  # Daily covariance matrix

            # Convert covariance to correlation: corr[i,j] = cov[i,j] / (std[i] * std[j])
            stds = np.sqrt(np.diag(cov_matrix))
            if np.all(stds > 0):
                corr_matrix = cov_matrix / np.outer(stds, stds)

                # Extract upper triangle (avoid diagonal and duplicates)
                n = len(symbols)
                pairwise_corrs = []
                pair_info = []

                for i in range(n):
                    for j in range(i + 1, n):
                        corr_val = corr_matrix[i, j]
                        if not np.isnan(corr_val):
                            pairwise_corrs.append(corr_val)
                            pair_info.append({
                                "symbol_1": symbols[i],
                                "symbol_2": symbols[j],
                                "correlation": float(corr_val),
                            })

                if pairwise_corrs:
                    avg_pairwise_corr = float(np.mean(pairwise_corrs))
                    max_pairwise_corr = float(np.max(pairwise_corrs))

                    # Top 3 most correlated pairs
                    pair_info.sort(key=lambda x: x["correlation"], reverse=True)
                    top_correlated_pairs = pair_info[:3]

        # Top 3 contributors (for context, not as a threshold check)
        top_contributors = []
        for c in components[:3]:  # Already sorted by percentage_contribution descending
            top_contributors.append({
                "symbol": c.symbol,
                "weight": c.weight,
                "risk_pct": abs(c.percentage_contribution),
            })

        return RiskFacts(
            # Required fields first
            var_pct=var_pct,
            var_dollars=var_dollars,
            max_single_weight=max_single_weight,
            max_single_weight_symbol=max_single_weight_symbol,
            effective_n=effective_n,
            max_single_risk_contribution=max_single_risk_contribution,
            max_single_risk_contribution_symbol=max_single_risk_contribution_symbol,
            top_contributors=top_contributors,
            # Optional fields
            es_pct=es_pct,
            es_dollars=es_dollars,
            avg_pairwise_corr=avg_pairwise_corr,
            max_pairwise_corr=max_pairwise_corr,
            top_correlated_pairs=top_correlated_pairs,
        )

    def _run_backtest_validation(
        self,
        holdings: Dict[str, float],
        confidence: float,
        horizon_days: int,
    ) -> BacktestSummary:
        """
        Run backtesting to validate risk model accuracy using parametric method.

        Args:
            holdings: Portfolio holdings
            confidence: Confidence level
            horizon_days: Time horizon

        Returns:
            BacktestSummary with breach rate and statistical tests
        """
        backtester = RiskBacktester(self.prices)

        summary, _ = backtester.backtest(
            holdings=holdings,
            metric="var",
            method="parametric",
            confidence=confidence,
            horizon_days=horizon_days,
            lookback_days=252,  # 1 year lookback
            step=horizon_days,  # Non-overlapping tests
        )

        return summary

    def _generate_llm_recommendations(
        self,
        var_result: VaRResult,
        components: List[ComponentVaR],
        risk_facts: RiskFacts,
        backtest_summary: Optional[BacktestSummary],
        confidence: float,
        horizon_days: int,
        custom_instructions: Optional[str] = None,
    ) -> str:
        """
        Generate LLM-powered recommendations using OpenAI API.

        Args:
            var_result: VaR result
            components: Component VaR breakdown
            risk_facts: Computed risk facts
            backtest_summary: Optional backtest results
            confidence: Confidence level
            horizon_days: Time horizon
            custom_instructions: Optional custom LLM instructions

        Returns:
            Markdown-formatted recommendations string
        """
        from backend.app.services.llm_recommender import LLMRecommender
        from backend.app.config import (
            OPENAI_API_KEY,
            OPENAI_MODEL,
            OPENAI_BASE_URL,
            LLM_MAX_TOKENS,
         
        )
        from dataclasses import asdict

        # Initialize LLM recommender
        recommender = LLMRecommender(
            api_key=OPENAI_API_KEY,
            model=OPENAI_MODEL,
            base_url=OPENAI_BASE_URL,
        )

        # Build risk analysis payload (same structure as API response, optimized for LLM)
        # Trim components to remove shares field
        components_trimmed = []
        for c in components:
            comp_dict = asdict(c)
            comp_dict.pop("shares", None)
            components_trimmed.append(comp_dict)

        # Build backtest dict if available
        backtest_dict = None
        if backtest_summary is not None:
            backtest_dict = asdict(backtest_summary)
            backtest_dict["interpretation"] = (
                "Model is well-calibrated (p-value > 0.05)"
                if backtest_summary.kupiec_p_value > 0.05
                else "Model may underestimate risk (p-value < 0.05)"
            )

        risk_analysis_payload = {
            "as_of": var_result.as_of,
            "method": var_result.method,
            "confidence": confidence,
            "horizon_days": horizon_days,
            "portfolio_value": var_result.portfolio_value,
            "components": components_trimmed,
            "risk_facts": asdict(risk_facts),
            "backtest": backtest_dict,
        }

        # Generate recommendations (use new GPT-5 API format)
        recommendations = recommender.generate_recommendations(
            risk_analysis=risk_analysis_payload,
            custom_instructions=custom_instructions,
            max_output_tokens=LLM_MAX_TOKENS  # Updated parameter name for GPT-5
         
        )

        return recommendations
