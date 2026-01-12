from backend.app import create_app
from backend.app.services.price_loader import load_prices_df
from backend.app.services.risk_engine import RiskEngine

app = create_app()

with app.app_context():
    symbols = ["AAPL", "MSFT", "SPY"]
    shares = {"AAPL": 10, "MSFT": 5, "SPY": 2}

    prices, _ = load_prices_df(symbols, lookback_days=1260)
    engine = RiskEngine(prices)

    print("\n=== ES HISTORICAL ===")
    print(engine.es(holdings=shares, method="historical", confidence=0.95, horizon_days=5, pnl_model="exp"))

    print("\n=== ES PARAMETRIC ===")
    print(engine.es(holdings=shares, method="parametric", confidence=0.95, horizon_days=5, pnl_model="exp"))

    print("\n=== ES MC (BOOTSTRAP) ===")
    print(engine.es(holdings=shares, method="monte_carlo", confidence=0.95, horizon_days=5, pnl_model="exp",
                    mc_mode="bootstrap", simulations=100000))

    print("\n=== ES MC (STUDENT-T) ===")
    print(engine.es(holdings=shares, method="monte_carlo", confidence=0.95, horizon_days=5, pnl_model="exp",
                    mc_mode="student_t", df_t=6, simulations=100000))
