import requests
import pandas as pd
import streamlit as st

API_BASE = "http://127.0.0.1:5000"

st.set_page_config(page_title="Risk Engine", layout="wide")
st.title("Risk Engine — VaR (v1)")

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

    if st.button("Remove selected"):
        to_remove = st.multiselect("Select symbols to remove", df_port["symbol"].tolist())
        for s in to_remove:
            st.session_state.portfolio.pop(s, None)
else:
    st.info("No holdings yet.")

st.divider()

# ---------------------------
# VaR request
# ---------------------------
st.subheader("2) Compute VaR")

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

pnl_model = st.selectbox("P&L model", ["exp", "linear"])

if st.button("Run VaR", disabled=not bool(st.session_state.portfolio)):
    payload = {
        "method": method,
        "confidence": float(confidence),
        "horizon_days": int(horizon_days),
        "lookback_days": int(lookback_days),
        "pnl_model": pnl_model,
        "holdings": [{"symbol": s, "shares": sh} for s, sh in st.session_state.portfolio.items()],
    }
    if method == "monte_carlo":
        payload.update({
            "mc_mode": mc_mode,
            "simulations": int(simulations),
            "df_t": int(df_t),
        })

    r = requests.post(f"{API_BASE}/var", json=payload)

    if r.ok:
        out = r.json()
        st.success("Computed.")
        st.write("As of:", out["as_of"])
        st.metric("Portfolio Value", f"${out['portfolio_value']:,.2f}")
        st.metric("VaR (Dollar)", f"${out['var_dollars']:,.2f}")
        st.metric("VaR (Log Return)", f"{out['var_log_return']:.4f}")

        st.subheader("Holdings")
        st.dataframe(pd.DataFrame(out["holdings"]), use_container_width=True)

        st.subheader("Raw response")
        st.json(out)
    else:
        st.error(r.text)
