from flask import Blueprint, jsonify, request

from backend.app.services.price_loader import load_prices_df
from backend.app.services.risk_engine import RiskEngine

bp = Blueprint("es", __name__, url_prefix="/es")


@bp.post("")
def compute_es():
    body = request.get_json(force=True) or {}

    holdings_list = body.get("holdings", [])
    if not holdings_list:
        return jsonify({"error": "holdings is required"}), 400

    holdings = {h["symbol"].strip().upper(): float(h["shares"]) for h in holdings_list}

    method = body.get("method", "historical")
    confidence = float(body.get("confidence", 0.95))
    horizon_days = int(body.get("horizon_days", 5))
    lookback_days = int(body.get("lookback_days", 1260))
    pnl_model = body.get("pnl_model", "exp")

    simulations = int(body.get("simulations", 100000))
    mc_mode = body.get("mc_mode", "bootstrap")
    df_t = int(body.get("df_t", 6))

    symbols = list(holdings.keys())
    prices, as_of = load_prices_df(symbols, lookback_days=lookback_days)

    engine = RiskEngine(prices)
    res = engine.es(
        holdings=holdings,
        method=method,
        confidence=confidence,
        horizon_days=horizon_days,
        simulations=simulations,
        mc_mode=mc_mode,
        df_t=df_t,
        pnl_model=pnl_model,
    )

    # return holdings as list (same style as /var)
    return jsonify(
        {
            "method": res.method,
            "confidence": res.confidence,
            "horizon_days": res.horizon_days,
            "as_of": res.as_of,
            "portfolio_value": res.portfolio_value,
            "var_log_return": res.var_log_return,
            "var_dollars": res.var_dollars,
            "es_log_return": res.es_log_return,
            "es_dollars": res.es_dollars,
            "observations": res.observations,
            "meta": res.meta,
            "holdings": [{"symbol": k, "shares": v} for k, v in holdings.items()],
        }
    )
