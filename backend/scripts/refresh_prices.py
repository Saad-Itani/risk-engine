# backend/scripts/refresh_prices.py

from backend.app import create_app
from backend.app.services.price_update_service import update_prices_from_stooq

app = create_app()

if __name__ == "__main__":
    with app.app_context():
        out = update_prices_from_stooq(
            symbols=None,          # uses Company table
            pause_seconds=0.10,    # throttle a bit
            max_symbols=None,      # set to e.g. 50 if you want to test fast
            verbose=True,
        )

        print("\n=== REFRESH SUMMARY ===")
        print(out)
        if out.errors:
            print("\n=== ERRORS (first 20) ===")
            for e in out.errors[:20]:
                print(e)
