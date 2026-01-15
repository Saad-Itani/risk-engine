from flask import Blueprint, request, jsonify

from backend.app.models import Company
from backend.app.services.price_loader import load_prices_df
from backend.app.services.risk_engine import RiskEngine

bp = Blueprint("var", __name__)


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
def compute_var():
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

        # Params
        method = (payload.get("method") or "historical").strip().lower()
        confidence = float(payload.get("confidence", 0.95))
        horizon_days = int(payload.get("horizon_days", 5))
        lookback_days = int(payload.get("lookback_days", 252 * 5))

        simulations = int(payload.get("simulations", 100_000))
        mc_mode = (payload.get("mc_mode") or "bootstrap").strip().lower()
        df_t = int(payload.get("df_t", 6))

        # Force pnl_model to "exp" (ignore any user-provided value for consistency)
        pnl_model = "exp"

        prices_df, db_as_of = load_prices_df(symbols, lookback_days=lookback_days)

        engine = RiskEngine(prices_df)
        result = engine.var(
            holdings=shares,
            method=method,
            confidence=confidence,
            horizon_days=horizon_days,
            simulations=simulations,
            mc_mode=mc_mode,
            df_t=df_t,
            pnl_model=pnl_model,
        )

        # Add weights snapshot for UI
        last_prices = prices_df[symbols].ffill().dropna().iloc[-1]
        portfolio_value = float(result.portfolio_value)
        weights = {
            s: float((last_prices[s] * shares[s]) / portfolio_value)
            for s in symbols
        }

        return jsonify({
            "method": result.method,
            "confidence": result.confidence,
            "horizon_days": result.horizon_days,
            "as_of": result.as_of,          # from engine (same as price panel last date)
            "db_as_of": db_as_of,           # last date present in DB overall
            "portfolio_value": result.portfolio_value,
            "var_log_return": result.var_log_return,
            "var_dollars": result.var_dollars,
            "observations": result.observations,
            "holdings": [{"symbol": s, "shares": shares[s], "weight": weights[s]} for s in symbols],
            "meta": result.meta,
        })

    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": "server_error", "detail": str(e)}), 500
