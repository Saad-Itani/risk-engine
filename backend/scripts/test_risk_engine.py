# backend/scripts/test_risk_engine.py

import datetime as dt
import pandas as pd

from backend.app import create_app
from backend.app.db import db
from backend.app.models import Price
from backend.app.services.risk_engine import RiskEngine


def load_prices_df(symbols: list[str], lookback_days: int = 1260) -> pd.DataFrame:
    """
    Returns a DataFrame: index=date, columns=symbol, values=close
    """
    symbols = [s.strip().upper() for s in symbols]

    # Use the latest date available in your DB (overall).
    end_date = db.session.query(db.func.max(Price.date)).scalar()
    if end_date is None:
        raise RuntimeError("prices table is empty")

    # buffer for weekends/holidays
    start_date = end_date - dt.timedelta(days=int(lookback_days * 1.7))

    rows = (
        Price.query
        .filter(Price.symbol.in_(symbols))
        .filter(Price.date >= start_date)
        .filter(Price.date <= end_date)
        .order_by(Price.date.asc())
        .all()
    )

    if not rows:
        raise RuntimeError(f"No prices found for symbols={symbols} in range {start_date}..{end_date}")

    df = pd.DataFrame(
        [{"date": r.date, "symbol": r.symbol, "close": float(r.close)} for r in rows]
    )

    # dedupe if any duplicates exist
    df = df.drop_duplicates(subset=["date", "symbol"], keep="last")

    prices = df.pivot(index="date", columns="symbol", values="close").sort_index()
    return prices


app = create_app()

with app.app_context():
    # ---- choose a test portfolio (shares) ----
    holdings = {
        "AAPL": 10,
        "MSFT": 5,
        "SPY": 2,
    }

    symbols = list(holdings.keys())
    prices_df = load_prices_df(symbols, lookback_days=252 * 5)

    engine = RiskEngine(prices_df)

    print("\n=== HISTORICAL ===")
    r = engine.var(holdings, method="historical", confidence=0.95, horizon_days=5, pnl_model="exp")
    print(r)

    print("\n=== PARAMETRIC ===")
    r = engine.var(holdings, method="parametric", confidence=0.95, horizon_days=5, pnl_model="exp")
    print(r)

    print("\n=== MONTE CARLO (BOOTSTRAP) ===")
    r = engine.var(
        holdings,
        method="monte_carlo",
        confidence=0.95,
        horizon_days=5,
        simulations=100_000,
        mc_mode="bootstrap",
    )
    print(r)

    print("\n=== MONTE CARLO (STUDENT-T) ===")
    r = engine.var(
        holdings,
        method="monte_carlo",
        confidence=0.95,
        horizon_days=5,
        simulations=200_000,
        mc_mode="student_t",
        df_t=6,
    )
    print(r)
