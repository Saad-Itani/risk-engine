# backend/app/services/price_update_service.py

from __future__ import annotations

import datetime as dt
import io
import time
from dataclasses import dataclass
from typing import Optional

import pandas as pd
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from backend.app.db import db
from backend.app.models import Company, Price


STOOQ_DAILY_URL = "https://stooq.com/q/d/l/"  # CSV endpoint


@dataclass(frozen=True)
class PriceUpdateResult:
    symbols_total: int
    symbols_updated: int
    rows_inserted: int
    symbols_skipped_up_to_date: int
    symbols_failed: int
    stopped_early: bool
    errors: list[dict]


def _make_session() -> requests.Session:
    s = requests.Session()
    retry = Retry(
        total=4,
        connect=4,
        read=4,
        backoff_factor=0.6,
        status_forcelist=(429, 500, 502, 503, 504),
        allowed_methods=("GET",),
        raise_on_status=False,
        respect_retry_after_header=True,
    )
    adapter = HTTPAdapter(max_retries=retry, pool_connections=20, pool_maxsize=20)
    s.mount("https://", adapter)
    s.headers.update({"User-Agent": "risk-engine/0.1 (+local dev)"})
    return s


def _stooq_symbol(symbol: str) -> str:
    # Most US equities/ETFs on Stooq are like: aapl.us, spy.us
    return f"{symbol.strip().lower()}.us"


def _fetch_stooq_daily(
    session: requests.Session,
    *,
    symbol: str,
    start_date: dt.date,
    end_date: dt.date,
    timeout: tuple[float, float] = (5.0, 30.0),  # (connect, read)
) -> pd.DataFrame:
    """
    Returns DataFrame with columns: date, close (filtered to [start_date, end_date]).
    Raises RuntimeError if Stooq daily limit is hit.
    """
    stooq_sym = _stooq_symbol(symbol)

    # Some Stooq servers ignore d1/d2; we pass them anyway and still filter locally.
    params = {
        "s": stooq_sym,
        "i": "d",
        "d1": start_date.strftime("%Y%m%d"),
        "d2": end_date.strftime("%Y%m%d"),
    }

    r = session.get(STOOQ_DAILY_URL, params=params, timeout=timeout)
    text = r.text or ""

    # Stooq sometimes returns 200 with an error message in HTML/text
    if "Exceeded daily hits limit" in text:
        raise RuntimeError("STOOQ_DAILY_LIMIT")

    r.raise_for_status()

    # Expected CSV header: Date,Open,High,Low,Close,Volume
    df = pd.read_csv(io.StringIO(text))
    if df.empty:
        return pd.DataFrame(columns=["date", "close"])

    # Normalize columns defensively
    cols = {c.strip().lower(): c for c in df.columns}
    if "date" not in cols or "close" not in cols:
        # sometimes Stooq returns a single column / unexpected content
        raise RuntimeError(f"Unexpected Stooq response for {symbol}: columns={list(df.columns)}")

    df = df.rename(columns={cols["date"]: "date", cols["close"]: "close"})[["date", "close"]]
    df["date"] = pd.to_datetime(df["date"]).dt.date
    df["close"] = pd.to_numeric(df["close"], errors="coerce")
    df = df.dropna(subset=["date", "close"]).sort_values("date")

    # Filter to requested window (even if server ignored d1/d2)
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

    session = _make_session()

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
            df = _fetch_stooq_daily(session, symbol=sym, start_date=start_date, end_date=today)

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
            if str(e) == "STOOQ_DAILY_LIMIT":
                stopped_early = True
                errors.append({"symbol": sym, "error": "Exceeded daily hits limit (Stooq)."})
                if verbose:
                    print(f"    {sym}: STOPPED (Exceeded daily hits limit).")
                break

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
