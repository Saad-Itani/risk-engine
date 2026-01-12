# backend/app/services/risk_engine.py

from __future__ import annotations

from dataclasses import dataclass
from statistics import NormalDist
from typing import Dict, Literal, Optional

import numpy as np
import pandas as pd


Method = Literal["historical", "parametric", "monte_carlo"]
PnlModel = Literal["linear", "exp"]
MCMode = Literal["normal", "student_t", "bootstrap"]



@dataclass(frozen=True)
class VaRResult:
    method: Method
    confidence: float
    horizon_days: int
    as_of: str
    portfolio_value: float
    var_log_return: float # positive (loss magnitude in log-return space)
    var_dollars: float     # positive (loss magnitude in $)
    observations: int
    meta: dict

@dataclass(frozen=True)
class ESResult:
    method: Method
    confidence: float
    horizon_days: int
    as_of: str
    portfolio_value: float

    # positive loss magnitudes
    var_log_return: float
    var_dollars: float
    es_log_return: float
    es_dollars: float

    observations: int
    meta: dict

class RiskEngine:
    """
    Risk Engine v1: VaR (historical, parametric, Monte Carlo).
    Designed to be extended later (ES/shortfall, stress tests, etc.).
    """

    def __init__(self, prices: pd.DataFrame):
        """
        prices: DataFrame index=dates, columns=symbols, values=close prices
        """
        if prices is None or prices.empty:
            raise ValueError("prices is empty")
        self.prices = prices.sort_index()

    # ----------------------------
    # Public API
    # ----------------------------
    def var(
        self,
        holdings: Dict[str, float],
        method: Method = "historical",
        confidence: float = 0.95,
        horizon_days: int = 5,
        *,
        # Monte Carlo options
        simulations: int = 100_000,
        mc_mode: MCMode = "bootstrap",  # <-- this will NOT converge to parametric
        df_t: int = 6,                  # Student-t degrees of freedom (mc_mode="student_t")
        pnl_model: PnlModel = "linear",
    ) -> VaRResult:
        """
        holdings: {"AAPL": shares, "MSFT": shares, ...}

        method:
          - historical: rolling window on portfolio log returns (exact for fixed-share portfolio)
          - parametric: normal VaR on portfolio log returns
          - monte_carlo: simulate portfolio end value (supports bootstrap / student-t / normal)

        pnl_model:
          - "linear": $loss ≈ V0 * (1 - exp(-VaR_log)) ~ V0 * VaR_log for small moves
                      (kept mostly for comparison)
          - "exp":    $loss = V0 * (1 - exp(-VaR_log))  (correct sign logic for log-loss magnitude)
        """
        shares, symbols, px = self._prepare_price_panel(holdings)

        if not (0 < confidence < 1):
            raise ValueError("confidence must be between 0 and 1")
        if horizon_days < 1:
            raise ValueError("horizon_days must be >= 1")

        # Exact fixed-share portfolio value series
        port_value = self._portfolio_value_series(px, shares)
        port_log_ret = self._log_returns(port_value)

        if len(port_log_ret) < max(60, horizon_days * 10):
            raise ValueError("Not enough return observations after cleaning")

        V0 = float(port_value.iloc[-1])
        as_of = str(port_value.index[-1])
        alpha = 1.0 - confidence

        if method == "historical":
            var_log = self._var_historical(port_log_ret, alpha, horizon_days)
            var_dol = self._loss_from_var_log(V0, var_log, pnl_model)

            return VaRResult(
                method=method,
                confidence=confidence,
                horizon_days=horizon_days,
                as_of=as_of,
                portfolio_value=V0,
                var_log_return=var_log,
                var_dollars=var_dol,
                observations=int(len(port_log_ret)),
                meta={"symbols": symbols},
            )

        if method == "parametric":
            mu = float(port_log_ret.mean())
            sigma = float(port_log_ret.std(ddof=1))
            var_log = self._var_parametric(mu, sigma, alpha, horizon_days)
            var_dol = self._loss_from_var_log(V0, var_log, pnl_model)

            return VaRResult(
                method=method,
                confidence=confidence,
                horizon_days=horizon_days,
                as_of=as_of,
                portfolio_value=V0,
                var_log_return=var_log,
                var_dollars=var_dol,
                observations=int(len(port_log_ret)),
                meta={"mu_daily": mu, "sigma_daily": sigma, "symbols": symbols},
            )

        if method == "monte_carlo":
            # Work from asset log returns, but revalue portfolio exactly at horizon
            asset_log_rets = self._log_returns_df(px)  # index=dates, columns=symbols
            if len(asset_log_rets) < max(60, horizon_days * 10):
                raise ValueError("Not enough asset return observations after cleaning")

            var_log, var_dol = self._var_monte_carlo(
                px=px,
                shares=shares,
                asset_log_rets=asset_log_rets,
                alpha=alpha,
                horizon_days=horizon_days,
                simulations=simulations,
                mc_mode=mc_mode,
                df_t=df_t,
            )

            # For consistency with other methods, apply pnl_model ONLY if you want
            # to force all methods through the same conversion. MC already computed $ loss.
            if pnl_model == "exp":
                # keep MC $ loss as-is (exact revaluation), no conversion needed
                pass
            elif pnl_model == "linear":
                # keep MC $ loss as-is (exact revaluation), no conversion needed
                pass
            else:
                raise ValueError("pnl_model must be linear | exp")

            return VaRResult(
                method=method,
                confidence=confidence,
                horizon_days=horizon_days,
                as_of=as_of,
                portfolio_value=V0,
                var_log_return=var_log,
                var_dollars=var_dol,
                observations=int(len(port_log_ret)),
                meta={"mc_mode": mc_mode, "df_t": df_t if mc_mode == "student_t" else None, "symbols": symbols},
            )

        raise ValueError("method must be historical | parametric | monte_carlo")
    
    def es(
        self,
        holdings: Dict[str, float],
        method: Method = "historical",
        confidence: float = 0.95,
        horizon_days: int = 5,
        *,
        simulations: int = 100_000,
        mc_mode: MCMode = "bootstrap",
        df_t: int = 6,
        pnl_model: PnlModel = "linear",
    ) -> ESResult:
        """
        Expected Shortfall (a.k.a. CVaR): average loss in the worst (1-confidence) tail.

        Returns ES in:
        - log-return loss magnitude (positive)
        - dollar loss magnitude (positive)
        """
        shares, symbols, px = self._prepare_price_panel(holdings)

        if not (0 < confidence < 1):
            raise ValueError("confidence must be between 0 and 1")
        if horizon_days < 1:
            raise ValueError("horizon_days must be >= 1")

        port_value = self._portfolio_value_series(px, shares)
        port_log_ret = self._log_returns(port_value)

        if len(port_log_ret) < max(60, horizon_days * 10):
            raise ValueError("Not enough return observations after cleaning")

        V0 = float(port_value.iloc[-1])
        as_of = str(port_value.index[-1])
        alpha = 1.0 - confidence

        if method == "historical":
            var_log, es_log = self._es_historical(port_log_ret, alpha, horizon_days)
            var_dol = self._loss_from_var_log(V0, var_log, pnl_model)
            es_dol = self._loss_from_var_log(V0, es_log, pnl_model)

            return ESResult(
                method=method,
                confidence=confidence,
                horizon_days=horizon_days,
                as_of=as_of,
                portfolio_value=V0,
                var_log_return=var_log,
                var_dollars=var_dol,
                es_log_return=es_log,
                es_dollars=es_dol,
                observations=int(len(port_log_ret)),
                meta={"symbols": symbols},
            )

        if method == "parametric":
            mu = float(port_log_ret.mean())
            sigma = float(port_log_ret.std(ddof=1))
            var_log, es_log = self._es_parametric(mu, sigma, alpha, horizon_days)
            var_dol = self._loss_from_var_log(V0, var_log, pnl_model)
            es_dol = self._loss_from_var_log(V0, es_log, pnl_model)

            return ESResult(
                method=method,
                confidence=confidence,
                horizon_days=horizon_days,
                as_of=as_of,
                portfolio_value=V0,
                var_log_return=var_log,
                var_dollars=var_dol,
                es_log_return=es_log,
                es_dollars=es_dol,
                observations=int(len(port_log_ret)),
                meta={"mu_daily": mu, "sigma_daily": sigma, "symbols": symbols},
            )

        if method == "monte_carlo":
            asset_log_rets = self._log_returns_df(px)
            if len(asset_log_rets) < max(60, horizon_days * 10):
                raise ValueError("Not enough asset return observations after cleaning")

            var_log, var_dol, es_log, es_dol = self._es_monte_carlo(
                px=px,
                shares=shares,
                asset_log_rets=asset_log_rets,
                alpha=alpha,
                horizon_days=horizon_days,
                simulations=simulations,
                mc_mode=mc_mode,
                df_t=df_t,
            )

            return ESResult(
                method=method,
                confidence=confidence,
                horizon_days=horizon_days,
                as_of=as_of,
                portfolio_value=V0,
                var_log_return=var_log,
                var_dollars=var_dol,
                es_log_return=es_log,
                es_dollars=es_dol,
                observations=int(len(port_log_ret)),
                meta={"mc_mode": mc_mode, "df_t": df_t if mc_mode == "student_t" else None, "symbols": symbols},
            )

        raise ValueError("method must be historical | parametric | monte_carlo")

    # ----------------------------
    # Data prep helpers
    # ----------------------------
    def _prepare_price_panel(self, holdings: Dict[str, float]):
        if not holdings:
            raise ValueError("holdings is empty")

        shares = {str(k).strip().upper(): float(v) for k, v in holdings.items()}
        symbols = list(shares.keys())

        missing = sorted(set(symbols) - set(self.prices.columns))
        if missing:
            raise ValueError(f"Missing symbols in prices DataFrame: {missing}")

        px = self.prices[symbols].copy()
        # Fill small gaps and keep only rows where all selected symbols are present after ffill
        px = px.sort_index().ffill().dropna()

        if px.empty:
            raise ValueError("No overlapping price history for selected symbols")

        return shares, symbols, px

    @staticmethod
    def _portfolio_value_series(px: pd.DataFrame, shares: Dict[str, float]) -> pd.Series:
        shares_vec = pd.Series(shares, dtype=float)
        return px.mul(shares_vec, axis=1).sum(axis=1)

    @staticmethod
    def _log_returns(series: pd.Series) -> pd.Series:
        s = series.dropna()
        return np.log(s / s.shift(1)).dropna()

    @staticmethod
    def _log_returns_df(px: pd.DataFrame) -> pd.DataFrame:
        return np.log(px / px.shift(1)).dropna()

    # ----------------------------
    # VaR methods (log-return space)
    # ----------------------------
    @staticmethod
    def _var_historical(port_log_ret: pd.Series, alpha: float, horizon_days: int) -> float:
        horizon = port_log_ret.rolling(window=horizon_days).sum().dropna()
        # var is positive loss magnitude in log space
        return float(-horizon.quantile(alpha))

    @staticmethod
    def _var_parametric(mu_daily: float, sigma_daily: float, alpha: float, horizon_days: int) -> float:
        # z is negative at alpha (e.g. alpha=0.05 -> z≈-1.645)
        z = NormalDist().inv_cdf(alpha)
        mu_h = mu_daily * horizon_days
        sigma_h = sigma_daily * np.sqrt(horizon_days)
        return float(-(mu_h + z * sigma_h))

    @staticmethod
    def _loss_from_var_log(V0: float, var_log: float, pnl_model: PnlModel) -> float:
        if pnl_model == "linear":
            # small-move approximation (consistent with many intro notebooks)
            return float(V0 * var_log)
        if pnl_model == "exp":
            # correct conversion when var_log is POSITIVE magnitude of a NEGATIVE log return
            # loss = V0 * (1 - exp(-var_log))
            return float(V0 * (1.0 - np.exp(-var_log)))
        raise ValueError("pnl_model must be linear | exp")

    # ----------------------------
    # Monte Carlo (won't collapse to parametric if you choose bootstrap/student_t)
    # ----------------------------
    def _var_monte_carlo(
        self,
        *,
        px: pd.DataFrame,
        shares: Dict[str, float],
        asset_log_rets: pd.DataFrame,
        alpha: float,
        horizon_days: int,
        simulations: int,
        mc_mode: MCMode,
        df_t: int,
    ) -> tuple[float, float]:
        """
        Returns:
          (VaR_log_return, VaR_dollars) where both are positive loss magnitudes.

        Simulation is done by simulating HORIZON log-returns for each asset,
        then revaluing the portfolio exactly: V_T = sum(q_i * P0_i * exp(r_i)).
        """
        symbols = list(asset_log_rets.columns)
        n = len(symbols)

        # Initial (as-of) prices
        p0 = px.iloc[-1].to_numpy(dtype=float)  # shape (n,)
        q = np.array([shares[s] for s in symbols], dtype=float)  # shares aligned with columns
        V0 = float(np.dot(q, p0))

        # Historical stats
        mu = asset_log_rets.mean().to_numpy(dtype=float)  # daily mean vector
        cov = asset_log_rets.cov().to_numpy(dtype=float)  # daily covariance matrix

        # Horizon scaling (iid assumption)
        mu_h = mu * horizon_days
        cov_h = cov * horizon_days

        # Generate horizon log-returns matrix: shape (simulations, n)
        R_h = self._simulate_horizon_returns(asset_log_rets, mu_h, cov_h, simulations, mc_mode, df_t, horizon_days)

        # Revalue exactly
        # P_T = P0 * exp(R_h)
        P_T = p0 * np.exp(R_h)  # broadcasts -> (sim, n)
        V_T = P_T @ q           # (sim,)

        # Portfolio log return distribution
        port_log = np.log(V_T / V0)

        # VaR in log-return space (positive magnitude)
        var_log = float(-np.quantile(port_log, alpha))

        # Dollar loss magnitude from exact revaluation
        pnl = V_T - V0
        var_dol = float(-np.quantile(pnl, alpha))

        return var_log, var_dol

    @staticmethod
    def _simulate_horizon_returns(
        asset_log_rets: pd.DataFrame,
        mu_h: np.ndarray,
        cov_h: np.ndarray,
        simulations: int,
        mc_mode: MCMode,
        df_t: int,
        horizon_days: int,
    ) -> np.ndarray:
        n = cov_h.shape[0]
        sims = int(simulations)

        if mc_mode == "bootstrap":
            # resample daily return VECTORS to preserve cross-asset correlation
            R = asset_log_rets.to_numpy(dtype=float)  # (T, n)
            T = R.shape[0]
            # sample indices: (sims, horizon_days)
            idx = np.random.randint(0, T, size=(sims, horizon_days))
            # sum across horizon -> (sims, n)
            return R[idx].sum(axis=1)

        # For normal/student_t: simulate correlated draws using Cholesky
        cov_h = cov_h.copy()
        # add jitter if needed (numerical stability)
        jitter = 1e-12
        tries = 0
        while True:
            try:
                L = np.linalg.cholesky(cov_h)
                break
            except np.linalg.LinAlgError:
                tries += 1
                if tries > 8:
                    raise
                cov_h.flat[:: n + 1] += jitter
                jitter *= 10

        Z = np.random.normal(size=(sims, n))

        if mc_mode == "normal":
            return mu_h + (Z @ L.T)

        if mc_mode == "student_t":
            if df_t <= 2:
                raise ValueError("df_t must be > 2 for finite covariance")

            # We want covariance approx cov_h.
            # For multivariate t with scale S, Cov = (df/(df-2)) * S  =>  S = cov_h * (df-2)/df
            scale = cov_h * ((df_t - 2.0) / df_t)
            # Cholesky of scale
            jitter = 1e-12
            tries = 0
            while True:
                try:
                    Ls = np.linalg.cholesky(scale)
                    break
                except np.linalg.LinAlgError:
                    tries += 1
                    if tries > 8:
                        raise
                    scale.flat[:: n + 1] += jitter
                    jitter *= 10

            G = Z @ Ls.T  # correlated normal
            chi2 = np.random.chisquare(df_t, size=(sims, 1))
            t_scale = np.sqrt(chi2 / df_t)  # (sims,1)
            return mu_h + (G / t_scale)

        raise ValueError("mc_mode must be normal | student_t | bootstrap")

    @staticmethod
    def _es_historical(port_log_ret: pd.Series, alpha: float, horizon_days: int) -> tuple[float, float]:
        """
        Returns (VaR_log, ES_log) as positive loss magnitudes in log-return space.
        """
        horizon = port_log_ret.rolling(window=horizon_days).sum().dropna()
        if horizon.empty:
            raise ValueError("Not enough horizon returns for ES")

        q = float(horizon.quantile(alpha))     # left-tail return quantile (negative)
        var_log = float(-q)

        tail = horizon[horizon <= q]
        if tail.empty:
            # fallback: take at least the single worst observation
            tail = horizon.nsmallest(1)

        es_log = float(-tail.mean())
        return var_log, es_log


    @staticmethod
    def _es_parametric(mu_daily: float, sigma_daily: float, alpha: float, horizon_days: int) -> tuple[float, float]:
        """
        Normal ES on log-returns.
        Returns (VaR_log, ES_log) as positive loss magnitudes.
        """
        if sigma_daily <= 0 or not np.isfinite(sigma_daily):
            raise ValueError("sigma_daily must be positive for parametric ES")

        nd = NormalDist()
        z = nd.inv_cdf(alpha)        # negative
        phi = nd.pdf(z)

        mu_h = mu_daily * horizon_days
        sigma_h = sigma_daily * np.sqrt(horizon_days)

        var_log = float(-(mu_h + z * sigma_h))
        # ES loss magnitude = -E[R | R <= q_alpha]
        # E[R | R <= q] = mu_h - sigma_h * phi/alpha
        es_log = float(-mu_h + sigma_h * (phi / alpha))

        return var_log, es_log


    def _es_monte_carlo(
        self,
        *,
        px: pd.DataFrame,
        shares: Dict[str, float],
        asset_log_rets: pd.DataFrame,
        alpha: float,
        horizon_days: int,
        simulations: int,
        mc_mode: MCMode,
        df_t: int,
    ) -> tuple[float, float, float, float]:
        """
        Returns (VaR_log, VaR_dol, ES_log, ES_dol) as positive loss magnitudes.
        """
        symbols = list(asset_log_rets.columns)
        n = len(symbols)

        p0 = px.iloc[-1].to_numpy(dtype=float)
        q = np.array([shares[s] for s in symbols], dtype=float)
        V0 = float(np.dot(q, p0))

        mu = asset_log_rets.mean().to_numpy(dtype=float)
        cov = asset_log_rets.cov().to_numpy(dtype=float)

        mu_h = mu * horizon_days
        cov_h = cov * horizon_days

        R_h = self._simulate_horizon_returns(asset_log_rets, mu_h, cov_h, simulations, mc_mode, df_t, horizon_days)

        P_T = p0 * np.exp(R_h)
        V_T = P_T @ q

        port_log = np.log(V_T / V0)
        pnl = V_T - V0

        q_log = float(np.quantile(port_log, alpha))
        var_log = float(-q_log)
        tail_log = port_log[port_log <= q_log]
        if tail_log.size == 0:
            tail_log = np.sort(port_log)[:1]
        es_log = float(-tail_log.mean())

        q_pnl = float(np.quantile(pnl, alpha))
        var_dol = float(-q_pnl)
        tail_pnl = pnl[pnl <= q_pnl]
        if tail_pnl.size == 0:
            tail_pnl = np.sort(pnl)[:1]
        es_dol = float(-tail_pnl.mean())

        return var_log, var_dol, es_log, es_dol
