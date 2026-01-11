import datetime as dt
import pandas as pd

from backend.app.db import db
from backend.app.models import Price


def load_prices_df(symbols: list[str], lookback_days: int = 1260) -> tuple[pd.DataFrame, str]:
    """
    Returns:
      prices_df: index=date, columns=symbol, values=close
      as_of: last date available in DB (string)
    """
    symbols = [s.strip().upper() for s in symbols if s and str(s).strip()]
    symbols = sorted(set(symbols))
    if not symbols:
        raise ValueError("symbols empty")

    end_date = db.session.query(db.func.max(Price.date)).scalar()
    if end_date is None:
        raise RuntimeError("prices table is empty")

    start_date = end_date - dt.timedelta(days=int(lookback_days * 1.7))  # weekend/holiday buffer

    rows = (
        Price.query
        .filter(Price.symbol.in_(symbols))
        .filter(Price.date >= start_date)
        .filter(Price.date <= end_date)
        .order_by(Price.date.asc())
        .all()
    )
    if not rows:
        raise RuntimeError(f"No prices found for {symbols} in range {start_date}..{end_date}")

    df = pd.DataFrame([{"date": r.date, "symbol": r.symbol, "close": float(r.close)} for r in rows])
    df = df.drop_duplicates(subset=["date", "symbol"], keep="last")

    prices = df.pivot(index="date", columns="symbol", values="close").sort_index()
    return prices, str(end_date)
