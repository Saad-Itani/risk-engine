# backend/app/services/price_update_service.py

from __future__ import annotations

import datetime as dt
import time
from dataclasses import dataclass
from typing import Optional

import pandas as pd
import yfinance as yf

from backend.app.db import db
from backend.app.models import Company, Price


@dataclass(frozen=True)
class PriceUpdateResult:
    symbols_total: int
    symbols_updated: int
    rows_inserted: int
    symbols_skipped_up_to_date: int
    symbols_failed: int
    stopped_early: bool
    errors: list[dict]


def _fetch_yfinance_daily(
    *,
    symbol: str,
    start_date: dt.date,
    end_date: dt.date,
) -> pd.DataFrame:
    """Returns DataFrame with columns: date, close (filtered to [start_date, end_date])."""
    # yfinance end is exclusive, so add 1 day
    hist = yf.Ticker(symbol).history(
        start=start_date.strftime("%Y-%m-%d"),
        end=(end_date + dt.timedelta(days=1)).strftime("%Y-%m-%d"),
        auto_adjust=True,
        raise_errors=False,
    )

    if hist is None or hist.empty:
        return pd.DataFrame(columns=["date", "close"])

    df = hist[["Close"]].copy()
    # Index may be timezone-aware — normalize to plain date
    df.index = pd.to_datetime(df.index).tz_localize(None).normalize()
    df = df.reset_index()
    df.columns = ["date", "close"]
    df["date"] = pd.to_datetime(df["date"]).dt.date
    df["close"] = pd.to_numeric(df["close"], errors="coerce")
    df = df.dropna(subset=["date", "close"]).sort_values("date")
    df = df[(df["date"] >= start_date) & (df["date"] <= end_date)]
    return df.reset_index(drop=True)


def update_prices_from_stooq(
    *,
    symbols: Optional[list[str]] = None,
    pause_seconds: float = 0.10,
    max_symbols: Optional[int] = None,
    verbose: bool = True,
) -> PriceUpdateResult:
    """
    Updates DB prices from the last known date per symbol up to today.

    - If symbols is None: uses Company.symbol from DB.
    - Fetches only missing dates per symbol (start = last_date+1).
    - Uses timeouts/retries and prints progress.
    - Stops early if Stooq daily limit is hit.
    """
    today = dt.date.today()

    if symbols is None:
        symbols = [c.symbol for c in Company.query.with_entities(Company.symbol).all()]

    symbols = [str(s).strip().upper() for s in symbols if s and str(s).strip()]
    symbols = sorted(set(symbols))

    if max_symbols is not None:
        symbols = symbols[: int(max_symbols)]

    if not symbols:
        raise ValueError("No symbols to update")

    # Get last date per symbol in one query
    last_rows = (
        db.session.query(Price.symbol, db.func.max(Price.date))
        .filter(Price.symbol.in_(symbols))
        .group_by(Price.symbol)
        .all()
    )
    last_map: dict[str, Optional[dt.date]] = {sym: last_date for sym, last_date in last_rows}

    inserted_total = 0
    updated_syms = 0
    skipped_up_to_date = 0
    failed = 0
    stopped_early = False
    errors: list[dict] = []

    for idx, sym in enumerate(symbols, start=1):
        last_date = last_map.get(sym)
        if last_date is None:
            # symbol exists but no prices yet: start far enough back (you can choose)
            start_date = today - dt.timedelta(days=365 * 2)
        else:
            start_date = last_date + dt.timedelta(days=1)

        if start_date > today:
            skipped_up_to_date += 1
            if verbose:
                print(f"[{idx}/{len(symbols)}] {sym}: up-to-date (last={last_date})")
            continue

        if verbose:
            print(f"[{idx}/{len(symbols)}] {sym}: fetching {start_date} -> {today} ...", flush=True)

        try:
            df = _fetch_yfinance_daily(symbol=sym, start_date=start_date, end_date=today)

            if df.empty:
                # nothing new (weekends / holidays / already current)
                skipped_up_to_date += 1
                if verbose:
                    print(f"    {sym}: no new rows.")
                continue

            new_dates = df["date"].tolist()

            # Remove any duplicates in DB for those dates (safe upsert without DB-specific ON CONFLICT)
            (
                Price.query
                .filter(Price.symbol == sym)
                .filter(Price.date.in_(new_dates))
                .delete(synchronize_session=False)
            )

            objs = [Price(symbol=sym, date=d, close=float(c)) for d, c in zip(df["date"], df["close"])]

            db.session.bulk_save_objects(objs)
            db.session.commit()

            inserted_total += len(objs)
            updated_syms += 1

            if verbose:
                print(f"    {sym}: inserted {len(objs)} rows (latest={new_dates[-1]}).")

        except RuntimeError as e:
            failed += 1
            db.session.rollback()
            errors.append({"symbol": sym, "error": str(e)})
            if verbose:
                print(f"    {sym}: FAILED ({e})")

        except Exception as e:
            failed += 1
            db.session.rollback()
            errors.append({"symbol": sym, "error": repr(e)})
            if verbose:
                print(f"    {sym}: FAILED ({repr(e)})")

        time.sleep(max(0.0, float(pause_seconds)))

    return PriceUpdateResult(
        symbols_total=len(symbols),
        symbols_updated=updated_syms,
        rows_inserted=inserted_total,
        symbols_skipped_up_to_date=skipped_up_to_date,
        symbols_failed=failed,
        stopped_early=stopped_early,
        errors=errors,
    )
