# backend/app/services/backtesting.py

from __future__ import annotations

from dataclasses import dataclass
from math import log, sqrt
from statistics import NormalDist
from typing import Dict, Literal, Optional, Tuple

import numpy as np
import pandas as pd

from backend.app.services.risk_engine import RiskEngine, Method, MCMode, PnlModel


BacktestMetric = Literal["var", "es"]


@dataclass(frozen=True)
class BacktestSummary:
    metric: BacktestMetric
    method: Method
    confidence: float
    horizon_days: int
    lookback_days: int
    n_tests: int
    n_breaches: int
    breach_rate: float
    expected_rate: float
    kupiec_lr: float
    kupiec_p_value: float
    meta: dict


class RiskBacktester:
    """
    Fixed-shares backtesting:
      - VaR_t computed using only prices up to t (rolling lookback window)
      - realized P&L observed from t -> t+horizon_days
      - breach if realized loss > VaR_t
    """

    def __init__(self, prices: pd.DataFrame):
        if prices is None or prices.empty:
            raise ValueError("prices is empty")
        self.prices = prices.sort_index()

    def backtest(
        self,
        *,
        holdings: Dict[str, float],
        metric: BacktestMetric = "var",
        method: Method = "historical",
        confidence: float = 0.95,
        horizon_days: int = 1,
        lookback_days: int = 252,
        # Monte Carlo options (used only when method="monte_carlo")
        simulations: int = 10_000,
        mc_mode: MCMode = "bootstrap",
        df_t: int = 6,
        pnl_model: PnlModel = "exp",  # Always use exp for accurate P&L conversion
        # optional date filtering for the BACKTEST AS-OF dates
        start_asof: Optional[str] = None,
        end_asof: Optional[str] = None,
        # performance knobs
        step: int = 1,            # evaluate every 'step' trading days
        max_points: Optional[int] = None,  # cap number of test points
    ) -> Tuple[BacktestSummary, pd.DataFrame]:
        if metric not in ("var", "es"):
            raise ValueError("metric must be 'var' or 'es'")
        if not (0 < confidence < 1):
            raise ValueError("confidence must be between 0 and 1")
        if horizon_days < 1:
            raise ValueError("horizon_days must be >= 1")
        if lookback_days < 30:
            raise ValueError("lookback_days must be >= 30")

        # Normalize holdings and get aligned price panel
        shares = {str(k).strip().upper(): float(v) for k, v in holdings.items()}
        symbols = list(shares.keys())
        missing = sorted(set(symbols) - set(self.prices.columns))
        if missing:
            raise ValueError(f"Missing symbols in prices DataFrame: {missing}")

        px = self.prices[symbols].copy().sort_index().ffill().dropna()
        if px.empty:
            raise ValueError("No overlapping price history for selected symbols")

        dates = px.index
        n = len(dates)
        if n < (lookback_days + horizon_days + 2):
            raise ValueError("Not enough history for requested lookback + horizon")

        # as_of filter (on trading-day index)
        start_i = lookback_days
        end_i = n - 1 - horizon_days  # need i+horizon_days to exist

        if start_asof:
            start_ts = pd.to_datetime(start_asof)
            # first index >= start_ts
            start_i = max(start_i, int(np.searchsorted(dates.values, start_ts.to_datetime64(), side="left")))
        if end_asof:
            end_ts = pd.to_datetime(end_asof)
            # last index <= end_ts
            end_i = min(end_i, int(np.searchsorted(dates.values, end_ts.to_datetime64(), side="right") - 1))

        if end_i <= start_i:
            raise ValueError("No backtest window after applying start/end filters")

        q_vec = np.array([shares[s] for s in symbols], dtype=float)

        rows = []
        count = 0

        for i in range(start_i, end_i + 1, step):
            # cap points if requested
            if max_points is not None and count >= int(max_points):
                break

            # rolling window up to as_of = dates[i]
            win_start = max(0, i - lookback_days)
            px_win = px.iloc[win_start : i + 1]  # inclusive of as_of
            if len(px_win) < (lookback_days // 2):  # basic guard
                continue

            engine = RiskEngine(px_win)

            # compute risk estimate at as_of
            if metric == "var":
                res = engine.var(
                    holdings=shares,
                    method=method,
                    confidence=confidence,
                    horizon_days=horizon_days,
                    simulations=simulations,
                    mc_mode=mc_mode,
                    df_t=df_t,
                    pnl_model=pnl_model,
                )
                var_dollars = float(res.var_dollars)
                var_log = float(res.var_log_return)
                es_dollars = np.nan
                es_log = np.nan
            else:
                res = engine.es(
                    holdings=shares,
                    method=method,
                    confidence=confidence,
                    horizon_days=horizon_days,
                    simulations=simulations,
                    mc_mode=mc_mode,
                    df_t=df_t,
                    pnl_model=pnl_model,
                )
                var_dollars = float(res.var_dollars)
                var_log = float(res.var_log_return)
                es_dollars = float(res.es_dollars)
                es_log = float(res.es_log_return)

            # realized from t -> t+h
            p_t = px.iloc[i].to_numpy(dtype=float)
            p_h = px.iloc[i + horizon_days].to_numpy(dtype=float)
            V_t = float(np.dot(q_vec, p_t))
            V_h = float(np.dot(q_vec, p_h))

            realized_pnl = V_h - V_t  # can be negative
            realized_loss_dol = -(realized_pnl)  # positive means loss
            realized_log = float(np.log(V_h / V_t))
            realized_loss_log = -realized_log

            breach = bool(realized_loss_dol > var_dollars) 


            rows.append(
                {
                    "as_of": str(dates[i]),
                    "horizon_end": str(dates[i + horizon_days]),
                    "portfolio_value": V_t,
                    "realized_pnl": realized_pnl,
                    "realized_loss_dollars": realized_loss_dol,
                    "realized_log_return": realized_log,
                    "realized_loss_log": realized_loss_log,
                    "var_dollars": var_dollars,
                    "var_log_return": var_log,
                    "es_dollars": es_dollars,
                    "es_log_return": es_log,
                    "breach": breach,
                }
            )

            count += 1

        df = pd.DataFrame(rows)
        if df.empty:
            raise ValueError("Backtest produced no rows (check lookback/horizon/filters)")

        alpha = 1.0 - confidence
        n_tests = int(len(df))
        n_breaches = int(df["breach"].sum())
        breach_rate = float(n_breaches / n_tests)

        lr, pval = self._kupiec_pof(n_tests, n_breaches, alpha)

        summary = BacktestSummary(
            metric=metric,
            method=method,
            confidence=float(confidence),
            horizon_days=int(horizon_days),
            lookback_days=int(lookback_days),
            n_tests=n_tests,
            n_breaches=n_breaches,
            breach_rate=breach_rate,
            expected_rate=float(alpha),
            kupiec_lr=float(lr),
            kupiec_p_value=float(pval),
            meta={
                "symbols": symbols,
                "mc_mode": mc_mode if method == "monte_carlo" else None,
                "simulations": int(simulations) if method == "monte_carlo" else None,
                "df_t": int(df_t) if (method == "monte_carlo" and mc_mode == "student_t") else None,
                "pnl_model": pnl_model,
                "step": int(step),
                "max_points": int(max_points) if max_points is not None else None,
            },
        )

        return summary, df

    @staticmethod
    def _kupiec_pof(n: int, x: int, alpha: float) -> Tuple[float, float]:
        """
        Kupiec Proportion-of-Failures test.
        Returns (LR statistic, p-value).
        """
        if n <= 0:
            return 0.0, 1.0

        # avoid log(0)
        eps = 1e-12
        phat = max(eps, min(1.0 - eps, x / n))
        a = max(eps, min(1.0 - eps, alpha))

        ll_null = (n - x) * log(1.0 - a) + x * log(a)
        ll_alt = (n - x) * log(1.0 - phat) + x * log(phat)
        lr = -2.0 * (ll_null - ll_alt)

        # Chi-square(df=1) survival function without scipy:
        # p = P(Chi2_1 >= lr) = 2*(1 - Phi(sqrt(lr)))
        z = sqrt(max(lr, 0.0))
        p = 2.0 * (1.0 - NormalDist().cdf(z))

        return float(lr), float(p)
