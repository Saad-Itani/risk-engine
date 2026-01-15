import requests
import pandas as pd
import streamlit as st

API_BASE = "http://127.0.0.1:5000"

st.set_page_config(page_title="Risk Engine", layout="wide")
st.title("Risk Engine — VaR / ES (v1)")

# ---------------------------
# Portfolio builder
# ---------------------------
st.subheader("1) Build your portfolio")

if "portfolio" not in st.session_state:
    st.session_state.portfolio = {}  # symbol -> shares

q = st.text_input("Search ticker (symbol or name)", "")

col1, col2 = st.columns([2, 1])

with col1:
    if q:
        r = requests.get(f"{API_BASE}/universe", params={"q": q})
        if r.ok:
            results = r.json()
            options = [f"{x['symbol']} — {x.get('shortname') or ''}" for x in results]
            pick = st.selectbox("Matches", options) if options else None
        else:
            st.error(r.text)
            pick = None
    else:
        pick = None

with col2:
    shares = st.number_input("Shares", min_value=0.0, value=1.0, step=1.0)

if pick:
    sym = pick.split(" — ")[0].strip().upper()
    if st.button("Add / Update"):
        st.session_state.portfolio[sym] = float(shares)

# Show portfolio table
if st.session_state.portfolio:
    df_port = pd.DataFrame(
        [{"symbol": s, "shares": sh} for s, sh in st.session_state.portfolio.items()]
    ).sort_values("symbol")
    st.dataframe(df_port, use_container_width=True)

    to_remove = st.multiselect("Select symbols to remove", df_port["symbol"].tolist())
    if st.button("Remove selected"):
        for s in to_remove:
            st.session_state.portfolio.pop(s, None)
        st.rerun()
else:
    st.info("No holdings yet.")

st.divider()

# ---------------------------
# Risk request (VaR / ES)
# ---------------------------
st.subheader("2) Compute Risk")

metric = st.selectbox("Metric", ["VaR", "ES (CVaR)"])
endpoint = "/var" if metric == "VaR" else "/es"

method = st.selectbox("Method", ["historical", "parametric", "monte_carlo"])
confidence = st.slider("Confidence", 0.90, 0.99, 0.95, 0.01)
horizon_days = st.number_input("Horizon (days)", min_value=1, value=5, step=1)
lookback_days = st.number_input("Lookback (days)", min_value=100, value=1260, step=50)

mc_mode = "bootstrap"
simulations = 100000
df_t = 6

if method == "monte_carlo":
    mc_mode = st.selectbox("MC Mode", ["bootstrap", "student_t", "normal"])
    simulations = st.number_input("Simulations", min_value=10000, value=100000, step=10000)
    if mc_mode == "student_t":
        df_t = st.number_input("Student-t df", min_value=3, value=6, step=1)

if st.button(f"Run {metric}", disabled=not bool(st.session_state.portfolio)):
    payload = {
        "method": method,
        "confidence": float(confidence),
        "horizon_days": int(horizon_days),
        "lookback_days": int(lookback_days),
        "holdings": [{"symbol": s, "shares": sh} for s, sh in st.session_state.portfolio.items()],
    }
    if method == "monte_carlo":
        payload.update({
            "mc_mode": mc_mode,
            "simulations": int(simulations),
            "df_t": int(df_t),
        })

    r = requests.post(f"{API_BASE}{endpoint}", json=payload)

    if r.ok:
        out = r.json()
        st.success("Computed.")
        st.write("As of:", out["as_of"])
        st.metric("Portfolio Value", f"${out['portfolio_value']:,.2f}")

        c1, c2 = st.columns(2)
        with c1:
            st.metric("VaR (Dollar)", f"${out['var_dollars']:,.2f}")
            st.metric("VaR (Log Return)", f"{out['var_log_return']:.4f}")
        with c2:
            if "es_dollars" in out:
                st.metric("ES (Dollar)", f"${out['es_dollars']:,.2f}")
                st.metric("ES (Log Return)", f"{out['es_log_return']:.4f}")
            else:
                st.info("ES not in response (you ran /var).")

        st.subheader("Holdings")
        st.dataframe(pd.DataFrame(out["holdings"]), use_container_width=True)

        st.subheader("Raw response")
        st.json(out)
    else:
        st.error(r.text)

st.divider()

# ---------------------------
# Risk Analysis Dashboard
# ---------------------------
st.subheader("3) Risk Analysis Dashboard")
st.markdown("Get actionable recommendations based on your risk tolerance")

# Risk tolerance profile selector
col_profile, col_backtest = st.columns([2, 1])

with col_profile:
    # Fetch available risk profiles
    try:
        profiles_resp = requests.get(f"{API_BASE}/risk/analysis/profiles")
        if profiles_resp.ok:
            profiles_data = profiles_resp.json()
            profile_options = {k: v["display_name"] for k, v in profiles_data["profiles"].items()}
            selected_profile = st.selectbox(
                "Select your risk tolerance",
                options=list(profile_options.keys()),
                format_func=lambda x: profile_options[x],
                index=list(profile_options.keys()).index(profiles_data.get("default", "moderate"))
            )
        else:
            st.error("Could not load risk profiles")
            selected_profile = "moderate"
    except Exception as e:
        st.error(f"Error loading profiles: {e}")
        selected_profile = "moderate"

with col_backtest:
    include_backtest = st.checkbox("Include backtesting validation", value=False)

target_var_reduction = st.slider(
    "Target VaR reduction for recommendations (%)",
    min_value=10,
    max_value=50,
    value=20,
    step=5,
    help="How much to reduce VaR when generating recommendations"
) / 100.0

if st.button("Run Full Risk Analysis", disabled=not bool(st.session_state.portfolio)):
    with st.spinner("Running comprehensive risk analysis..."):
        payload = {
            "method": method,
            "confidence": float(confidence),
            "horizon_days": int(horizon_days),
            "lookback_days": int(lookback_days),
            "risk_profile": selected_profile,
            "include_backtest": include_backtest,
            "target_var_reduction_pct": target_var_reduction,
            "holdings": [{"symbol": s, "shares": sh} for s, sh in st.session_state.portfolio.items()],
        }

        if method == "monte_carlo":
            payload.update({
                "mc_mode": mc_mode,
                "simulations": int(simulations),
                "df_t": int(df_t),
            })

        r = requests.post(f"{API_BASE}/risk/analysis", json=payload)

        if r.ok:
            analysis = r.json()

            # Risk Warning Badge
            st.markdown("---")
            st.subheader("Risk Assessment")

            warning = analysis["warning"]
            level = warning["level"]

            # Color-coded risk level
            colors = {
                "LOW": ("🟢", "green", "Your portfolio risk is within acceptable limits."),
                "MODERATE": ("🟡", "orange", "Your portfolio has moderate risk. Consider the recommendations below."),
                "HIGH": ("🟠", "orange", "Your portfolio has high risk. We recommend reducing positions."),
                "SEVERE": ("🔴", "red", "Your portfolio has severe risk exposure. Immediate action recommended."),
            }

            emoji, color, message = colors.get(level, ("⚪", "gray", ""))

            col_warn1, col_warn2, col_warn3 = st.columns(3)

            with col_warn1:
                st.markdown(f"## {emoji} Risk Level: **{level}**")
                st.markdown(f"*{message}*")

            with col_warn2:
                st.metric("VaR as % of Portfolio", f"{warning['var_percent_of_portfolio']*100:.2f}%")
                st.metric("Portfolio Volatility (Daily)", f"{warning['portfolio_volatility_daily']*100:.2f}%")

            with col_warn3:
                st.metric("Max Position Weight", f"{warning['max_position_weight']*100:.2f}%")
                if warning["triggers"]:
                    st.warning(f"**Triggered by:** {', '.join(warning['triggers'])}")

            # Component VaR Breakdown
            st.markdown("---")
            st.subheader("Risk Contribution by Position")

            if analysis["components"]:
                components_df = pd.DataFrame(analysis["components"])
                components_df = components_df.sort_values("percentage_contribution", ascending=False)

                # Bar chart of percentage contributions
                chart_data = components_df.set_index("symbol")["percentage_contribution"] * 100
                st.bar_chart(chart_data)

                # Detailed table
                display_df = components_df[[
                    "symbol", "shares", "position_value", "weight",
                    "component_var_dollars", "percentage_contribution"
                ]].copy()

                display_df["weight"] = display_df["weight"].apply(lambda x: f"{x*100:.2f}%")
                display_df["component_var_dollars"] = display_df["component_var_dollars"].apply(lambda x: f"${x:,.2f}")
                display_df["percentage_contribution"] = display_df["percentage_contribution"].apply(lambda x: f"{x*100:.1f}%")
                display_df["position_value"] = display_df["position_value"].apply(lambda x: f"${x:,.2f}")

                display_df.columns = ["Symbol", "Shares", "Position Value", "Weight", "Component VaR", "% of Total VaR"]

                st.dataframe(display_df, use_container_width=True, hide_index=True)

            # Recommendations
            st.markdown("---")
            st.subheader("Actionable Recommendations")

            if analysis["recommendations"]:
                st.info(f"To reduce VaR by {target_var_reduction*100:.0f}%, consider the following position reductions:")

                recommendations_df = pd.DataFrame(analysis["recommendations"])

                # Format for display
                display_recs = recommendations_df[[
                    "priority", "symbol", "current_shares", "recommended_shares",
                    "shares_to_reduce", "dollar_reduction", "reason"
                ]].copy()

                display_recs["shares_to_reduce"] = display_recs["shares_to_reduce"].apply(lambda x: f"{x:.0f}")
                display_recs["dollar_reduction"] = display_recs["dollar_reduction"].apply(lambda x: f"${x:,.2f}")

                display_recs.columns = [
                    "Priority", "Symbol", "Current Shares", "Recommended Shares",
                    "Reduce By", "$ Reduction", "Reason"
                ]

                st.dataframe(display_recs, use_container_width=True, hide_index=True)

                # Apply recommendations button
                if st.button("Apply All Recommendations"):
                    for _, row in recommendations_df.iterrows():
                        st.session_state.portfolio[row["symbol"]] = row["recommended_shares"]
                    st.success("Recommendations applied! Re-run the analysis to see the new risk profile.")
                    st.rerun()
            else:
                if level == "LOW":
                    st.success("No recommendations needed - your portfolio risk is well-managed!")
                else:
                    st.info("No specific recommendations available at this time.")

            # Backtesting Validation
            if analysis.get("backtest") and analysis["backtest"]["summary"]:
                st.markdown("---")
                st.subheader("Backtesting Validation")

                backtest = analysis["backtest"]
                summary = backtest["summary"]

                st.markdown(f"**Model Calibration:** {summary['interpretation']}")

                col_bt1, col_bt2, col_bt3, col_bt4 = st.columns(4)

                with col_bt1:
                    st.metric("Tests Run", summary["n_tests"])

                with col_bt2:
                    st.metric("Breaches", summary["n_breaches"])

                with col_bt3:
                    st.metric("Breach Rate", f"{summary['breach_rate']*100:.2f}%")
                    st.caption(f"Expected: {summary['expected_rate']*100:.2f}%")

                with col_bt4:
                    st.metric("Kupiec p-value", f"{summary['kupiec_p_value']:.3f}")
                    if summary["kupiec_p_value"] > 0.05:
                        st.success("✓ Well-calibrated")
                    else:
                        st.warning("⚠ May underestimate risk")

                # Recent breaches
                if backtest.get("recent_breaches"):
                    with st.expander("Recent Breaches (last 10)"):
                        breaches_df = pd.DataFrame(backtest["recent_breaches"])
                        if not breaches_df.empty:
                            breaches_df["realized_loss_dollars"] = breaches_df["realized_loss_dollars"].apply(
                                lambda x: f"${x:,.2f}"
                            )
                            breaches_df["var_dollars"] = breaches_df["var_dollars"].apply(lambda x: f"${x:,.2f}")
                            breaches_df["excess_loss"] = breaches_df["excess_loss"].apply(lambda x: f"${x:,.2f}")
                            breaches_df.columns = ["Date", "Realized Loss", "VaR Estimate", "Excess Loss"]
                            st.dataframe(breaches_df, use_container_width=True, hide_index=True)

            # Summary metrics
            st.markdown("---")
            st.subheader("Portfolio Summary")
            col_sum1, col_sum2, col_sum3 = st.columns(3)

            with col_sum1:
                st.metric("Portfolio Value", f"${analysis['portfolio_value']:,.2f}")

            with col_sum2:
                st.metric("VaR (Dollar)", f"${analysis['var_dollars']:,.2f}")

            with col_sum3:
                var_pct = (analysis['var_dollars'] / analysis['portfolio_value']) * 100
                st.metric("VaR as % of Portfolio", f"{var_pct:.2f}%")

            # Raw response (collapsed by default)
            with st.expander("View Raw API Response"):
                st.json(analysis)
        else:
            st.error(f"Error: {r.text}")
