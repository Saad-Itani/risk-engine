from flask import Blueprint, request, jsonify
from dataclasses import asdict

from backend.app.models import Company
from backend.app.services.price_loader import load_prices_df
from backend.app.services.backtesting import RiskBacktester
from backend.app.config import BACKTEST_RECENT_BREACHES_LIMIT, KUPIEC_PVALUE_THRESHOLD

bp = Blueprint("backtest", __name__)


def _parse_holdings(payload) -> dict[str, float]:
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
def run_backtest():
    """
    Run backtesting to validate risk model accuracy.

    Request body:
        {
            "holdings": [{"symbol": "AAPL", "shares": 100}, ...],
            "metric": "var" | "es",
            "method": "historical" | "parametric" | "monte_carlo",
            "confidence": 0.95,
            "horizon_days": 1,
            "lookback_days": 252,
            "simulations": 100000,
            "mc_mode": "bootstrap" | "normal" | "student_t",
            "df_t": 6,
            "step": 5
        }

    Returns:
        {
            "summary": {
                "metric": "var",
                "method": "historical",
                "confidence": 0.95,
                "horizon_days": 1,
                "n_tests": 252,
                "n_breaches": 14,
                "breach_rate": 0.0556,
                "expected_rate": 0.05,
                "kupiec_lr": 0.123,
                "kupiec_p_value": 0.72,
                "interpretation": "Model is well-calibrated"
            },
            "recent_breaches": [
                {
                    "date": "2024-12-15",
                    "realized_loss_dollars": 9200.50,
                    "var_dollars": 8750.25,
                    "excess_loss": 450.25
                },
                ...
            ]
        }
    """
    try:
        payload = request.get_json(force=True) or {}

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
        metric = (payload.get("metric") or "var").strip().lower()
        method = (payload.get("method") or "historical").strip().lower()
        confidence = float(payload.get("confidence", 0.95))
        horizon_days = int(payload.get("horizon_days", 1))
        lookback_days = int(payload.get("lookback_days", 252))
        simulations = int(payload.get("simulations", 100_000))
        mc_mode = (payload.get("mc_mode") or "bootstrap").strip().lower()
        df_t = int(payload.get("df_t", 6))
        step = int(payload.get("step", 5))

        # Load prices with extra history for backtesting
        # Need lookback_days for initial VaR + more history for rolling window
        total_lookback = lookback_days + 252 * 2  # Extra 2 years for backtest window
        prices_df, db_as_of = load_prices_df(symbols, lookback_days=total_lookback)

        # Run backtest
        backtester = RiskBacktester(prices_df)
        summary, time_series = backtester.backtest(
            holdings=shares,
            metric=metric,
            method=method,
            confidence=confidence,
            horizon_days=horizon_days,
            lookback_days=lookback_days,
            simulations=simulations,
            mc_mode=mc_mode,
            df_t=df_t,
            step=step,
        )

        # Extract recent breaches
        breaches = time_series[time_series["breach"]].copy()
        recent_breaches = breaches.tail(BACKTEST_RECENT_BREACHES_LIMIT)

        breach_list = []
        for date, row in recent_breaches.iterrows():
            breach_list.append({
                "date": str(date),
                "realized_loss_dollars": float(row["realized_loss_dollars"]),
                "var_dollars": float(row["var_dollars"]),
                "excess_loss": float(row["realized_loss_dollars"] - row["var_dollars"]),
            })

        # Interpret Kupiec test result
        if summary.kupiec_p_value > KUPIEC_PVALUE_THRESHOLD:
            interpretation = "Model is well-calibrated (p-value > 0.05)"
        else:
            interpretation = "Model may underestimate risk (p-value < 0.05)"

        return jsonify({
            "summary": {
                **asdict(summary),
                "interpretation": interpretation,
            },
            "recent_breaches": breach_list,
            "db_as_of": db_as_of,
        })

    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": "server_error", "detail": str(e)}), 500
