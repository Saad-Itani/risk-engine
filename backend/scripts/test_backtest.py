# backend/scripts/test_backtest.py

import pandas as pd

from backend.app import create_app
from backend.app.models import Price
from backend.app.services.backtesting import RiskBacktester


def load_prices_df(symbols: list[str]) -> pd.DataFrame:
    # Pull all history for these symbols from your SQLite DB into wide DF
    rows = (
        Price.query.filter(Price.symbol.in_(symbols))
        .order_by(Price.date.asc())
        .all()
    )

    df = pd.DataFrame(
        [{"date": r.date, "symbol": r.symbol, "close": r.close} for r in rows]
    )
    wide = df.pivot(index="date", columns="symbol", values="close").sort_index()
    return wide


app = create_app()

with app.app_context():
    holdings = {"AAPL": 10, "MSFT": 5, "SPY": 2}
    symbols = list(holdings.keys())

    prices = load_prices_df(symbols)
    bt = RiskBacktester(prices)

    summary, series = bt.backtest(
        holdings=holdings,
        metric="var",
        method="historical",
        confidence=0.95,
        horizon_days=1,
        lookback_days=252,
        pnl_model="exp",
        step=1,
        max_points=800,   # optional
    )

    print(summary)
    # --- Exceptions / breaches view ---
    breaches = series[series["breach"]].copy()

    # how much worse than VaR was the realized loss?
    breaches["excess_loss"] = breaches["realized_loss_dollars"] - breaches["var_dollars"]

    print("\nTop 10 breaches by excess loss (realized - VaR):")
    print(
        breaches.sort_values("excess_loss", ascending=False)
        .head(10)[
            [
                "as_of",
                "horizon_end",
                "portfolio_value",
                "realized_loss_dollars",
                "var_dollars",
                "excess_loss",
            ]
        ]
    )

    print(f"\nBreaches: {len(breaches)}/{len(series)} = {len(breaches)/len(series):.2%}")

    print("\nWorst 10 realized losses:")
    print(
        series.sort_values("realized_loss_dollars", ascending=False)
        .head(10)[["as_of","horizon_end","realized_loss_dollars","var_dollars","breach"]]
    )
    print(series.head())
    print(series.tail())
