# backend/app/routes/risk_analysis.py

"""
Unified risk analysis endpoint with component VaR decomposition, risk facts,
optional backtesting, and LLM recommendations.
"""

from flask import Blueprint, request, jsonify
from dataclasses import asdict

from backend.app.models import Company
from backend.app.services.price_loader import load_prices_df
from backend.app.services.risk_analyzer import RiskAnalyzer
from backend.app.services.llm_recommender import LLMRecommender
import os
bp = Blueprint("risk_analysis", __name__)


def _parse_holdings(payload) -> dict[str, float]:
    """Parse holdings from request payload."""
    holdings_list = payload.get("holdings", [])
    if not isinstance(holdings_list, list) or not holdings_list:
        raise ValueError("holdings must be a non-empty list like [{'symbol':'AAPL','shares':10}]")

    shares: dict[str, float] = {}
    for h in holdings_list:
        sym = str(h.get("symbol", "")).strip().upper()
        sh = h.get("shares", None)
        if not sym or sh is None:
            raise ValueError("each holding needs symbol + shares")
        shares[sym] = shares.get(sym, 0.0) + float(sh)
    return shares


@bp.post("")
def analyze_risk():
    """
    Comprehensive risk analysis with component VaR, risk facts, backtesting, and LLM recommendations.

    Request body:
        {
            "holdings": [{"symbol": "AAPL", "shares": 100}, ...],
            "confidence": 0.95,
            "horizon_days": 5,
            "include_backtest": false,
            "include_es": true,
            "include_llm_recommendations": false,
            "llm_custom_instructions": "Optional custom instructions for LLM",
            "pnl_model": "linear"
        }

    Returns:
        {
            "as_of": "2024-01-15",
            "method": "parametric",
            "confidence": 0.95,
            "horizon_days": 5,
            "portfolio_value": 50000.0,
            "components": [
                {
                    "symbol": "AAPL",
                    "position_value": 15000.0,
                    "weight": 0.30,
                    "component_var_dollars": 450.0,
                    "marginal_var_dollars": 1500.0,
                    "percentage_contribution": 0.45
                },
                ...
            ],
            "risk_facts": {
                "var_pct": 0.02,
                "var_dollars": 1000.0,
                "es_pct": 0.025,
                "es_dollars": 1250.0,
                "max_single_weight": 0.30,
                "max_single_weight_symbol": "AAPL",
                "effective_n": 4.2,
                "max_single_risk_contribution": 0.45,
                "max_single_risk_contribution_symbol": "AAPL",
                "avg_pairwise_corr": 0.35,
                "max_pairwise_corr": 0.78,
                "top_correlated_pairs": [...]
            },
            "backtest": {
                "metric": "var",
                "method": "parametric",
                "confidence": 0.95,
                "horizon_days": 5,
                "n_tests": 50,
                "n_breaches": 3,
                "breach_rate": 0.06,
                "expected_rate": 0.05,
                "kupiec_lr": 0.123,
                "kupiec_p_value": 0.72,
                "interpretation": "Model is well-calibrated"
            },
            "llm_recommendations": "## Risk Summary\n...",
            "db_as_of": "2024-01-15 09:30:00"
        }
    """
    try:
        payload = request.get_json(force=True) or {}

        # Parse holdings
        shares = _parse_holdings(payload)
        symbols = list(shares.keys())

        # Validate symbols exist & active
        active = {
            c.symbol
            for c in Company.query.filter(Company.symbol.in_(symbols), Company.is_active == True).all()
        }
        missing = sorted(set(symbols) - active)
        if missing:
            return jsonify({"error": "unknown/inactive symbols", "symbols": missing}), 400

        # Parse parameters
        confidence = float(payload.get("confidence", 0.95))
        horizon_days = int(payload.get("horizon_days", 5))
        include_backtest = bool(payload.get("include_backtest", False))
        include_es = bool(payload.get("include_es", True))
        include_llm_recommendations = bool(payload.get("include_llm_recommendations", False))
        llm_custom_instructions = payload.get("llm_custom_instructions", None)
        pnl_model = (payload.get("pnl_model") or "linear").strip().lower()

        # Load prices (use longer lookback if backtesting enabled)
        lookback_days = 252 * 3 if include_backtest else 252
        prices_df, db_as_of = load_prices_df(symbols, lookback_days=lookback_days)

        # Run risk analysis
        analyzer = RiskAnalyzer(prices_df)
        result = analyzer.analyze_portfolio(
            holdings=shares,
            confidence=confidence,
            horizon_days=horizon_days,
            include_backtest=include_backtest,
            include_es=include_es,
            include_llm_recommendations=include_llm_recommendations,
            llm_custom_instructions=llm_custom_instructions,
            pnl_model=pnl_model,
        )

        # Build response - trim components to save tokens (remove shares field)
        components_trimmed = []
        for c in result.components:
            comp_dict = asdict(c)
            comp_dict.pop("shares", None)
            components_trimmed.append(comp_dict)

        # Build backtest dict if available
        backtest_dict = None
        if result.backtest_summary is not None:
            backtest_dict = asdict(result.backtest_summary)
            backtest_dict["interpretation"] = (
                "Model is well-calibrated (p-value > 0.05)"
                if result.backtest_summary.kupiec_p_value > 0.05
                else "Model may underestimate risk (p-value < 0.05)"
            )

        # Get var_result (could be VaRResult or ESResult)
        var_result = result.var_result

        response_payload = {
            "as_of": var_result.as_of,
            "method": result.meta["method"],
            "confidence": result.meta["confidence"],
            "horizon_days": result.meta["horizon_days"],
            "portfolio_value": var_result.portfolio_value,
            "components": components_trimmed,
            "risk_facts": asdict(result.risk_facts),
            "backtest": backtest_dict,
            "db_as_of": db_as_of,
        }

        llm_recommendations = None
        llm_error = None

        if include_llm_recommendations:
            try:
                recommender = LLMRecommender(
                    model=os.getenv("OPENAI_MODEL", "gpt-5-nano-2025-08-07")
                )
                llm_recommendations = recommender.generate_recommendations(
                    response_payload,
                    custom_instructions=llm_custom_instructions,
                    max_output_tokens=900,
                    verbosity="low",
                    reasoning_effort="minimal",
                )
            except Exception as e:
                llm_error = str(e)

        response_payload["llm_recommendations"] = llm_recommendations
        response_payload["llm_error"] = llm_error

        return jsonify(response_payload)

    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": "server_error", "detail": str(e)}), 500
