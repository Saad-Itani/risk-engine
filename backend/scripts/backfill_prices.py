# backend/scripts/backfill_prices.py

import datetime as dt
import json
import os
import time
import pandas_datareader.data as web

from backend.app import create_app
from backend.app.db import db
from backend.app.models import Company, Price

YEARS_BACK = 5
SLEEP_SECONDS = 0.25

# IMPORTANT: cap how many tickers you process per run (so you don't hit Stooq's daily cap)
MAX_TICKERS_PER_RUN = 250

# where we store progress
STATE_PATH = "backend/data/backfill_state.json"

def to_stooq_us(symbol: str) -> str:
    # AAPL -> aapl.us ; BRK.B -> brk-b.us
    return symbol.strip().upper().replace(".", "-").lower() + ".us"

def load_state():
    if not os.path.exists(STATE_PATH):
        return {"next_index": 0}
    with open(STATE_PATH, "r", encoding="utf-8") as f:
        return json.load(f)

def save_state(state):
    os.makedirs(os.path.dirname(STATE_PATH), exist_ok=True)
    with open(STATE_PATH, "w", encoding="utf-8") as f:
        json.dump(state, f)

def stooq_quota_hit(df) -> bool:
    # When Stooq quota is exceeded, DataReader often returns empty.
    return df is None or getattr(df, "empty", True)

app = create_app()

with app.app_context():
    tickers = [c.symbol for c in Company.query.filter_by(is_active=True).all()]
    print(f"Tickers: {len(tickers)}")

    end = dt.date.today()
    start = end - dt.timedelta(days=365 * YEARS_BACK)

    state = load_state()
    idx = int(state.get("next_index", 0))

    processed_this_run = 0
    consecutive_empty = 0

    while idx < len(tickers) and processed_this_run < MAX_TICKERS_PER_RUN:
        sym = tickers[idx]
        stooq_sym = to_stooq_us(sym)

        try:
            df = web.DataReader(stooq_sym, "stooq", start, end)
        except Exception as e:
            print(f"[{idx+1}/{len(tickers)}] {sym} -> {stooq_sym}: ERROR {e}")
            # don't advance state too aggressively on transient network errors
            time.sleep(1)
            consecutive_empty += 1
            if consecutive_empty >= 5:
                print("Stopping run (too many consecutive failures). Likely quota/network issue.")
                break
            continue

        if stooq_quota_hit(df):
            print(f"[{idx+1}/{len(tickers)}] {sym} -> {stooq_sym}: empty (quota likely hit). Stopping run.")
            break

        consecutive_empty = 0

        if "Close" not in df.columns:
            print(f"[{idx+1}/{len(tickers)}] {sym} -> {stooq_sym}: missing Close, skipping.")
            idx += 1
            state["next_index"] = idx
            save_state(state)
            time.sleep(SLEEP_SECONDS)
            continue

        df = df.sort_index()
        s = df["Close"].dropna()

        # Insert rows (no wipe). If you already ran before, you may hit duplicates later
        # If you have UNIQUE(symbol,date) in DB, duplicates would raise later — we'll handle that in the updater.
        rows = [
            Price(symbol=sym, date=ts.date(), close=float(val), source="stooq")
            for ts, val in s.items()
        ]
        db.session.bulk_save_objects(rows)
        db.session.commit()

        print(f"[{idx+1}/{len(tickers)}] {sym}: inserted {len(rows)}")

        idx += 1
        processed_this_run += 1

        state["next_index"] = idx
        save_state(state)

        time.sleep(SLEEP_SECONDS)

    print(f"Run finished. Processed this run: {processed_this_run}. Next index: {state.get('next_index')}/{len(tickers)}")
    print(f"Resume by running the same command again.")
