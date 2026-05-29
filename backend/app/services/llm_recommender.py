# backend/app/services/llm_recommender.py

from __future__ import annotations
import os
from typing import Any, Dict, Optional

import httpx
from openai import OpenAI


class LLMRecommender:
    def __init__(
        self,
        api_key: Optional[str] = None,
        model: str = "gpt-5.4-nano",
        base_url: Optional[str] = None,
    ):
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        if not self.api_key:
            raise ValueError("OpenAI API key not provided (set OPENAI_API_KEY env var)")

        self.model = model
        self.base_url = self._normalize_base_url(base_url)
        # trust_env=False bypasses SSL_CERT_FILE env var (broken in some conda envs)
        # httpx falls back to its own bundled certifi certs instead
        self.client = OpenAI(
            api_key=self.api_key,
            base_url=self.base_url,
            http_client=httpx.Client(verify=True, trust_env=False),
        )

    @staticmethod
    def _normalize_base_url(base_url: Optional[str]) -> Optional[str]:
        if not base_url:
            return None
        url = base_url.rstrip("/")
        if not url.endswith("/v1"):
            url += "/v1"
        return url

    def generate_recommendations(
        self,
        risk_analysis: Dict[str, Any],
        custom_instructions: Optional[str] = None,
        *,
        max_output_tokens: int = 800,
    ) -> str:
        instructions = self._build_system_prompt(custom_instructions)
        user_input = self._build_user_message(risk_analysis)

        # GPT-5 family: use Responses API
        # Note: reasoning/text.verbosity params are omitted — not supported on nano models
        resp = self.client.responses.create(
            model=self.model,
            instructions=instructions,
            input=user_input,
            max_output_tokens=max_output_tokens,
        )

        return (resp.output_text or "").strip()

    def _build_system_prompt(self, custom_instructions: Optional[str] = None) -> str:
        base_prompt = """You are a portfolio risk advisor writing a short briefing for the investor who owns this portfolio.

Your job is to interpret the risk metrics in plain English — explain what they mean, not just repeat them.
Use "your portfolio", "you", make it personal and direct.

## Output format — follow exactly, including the ## headings and blank lines:

## What this means for you

2 sentences translating VaR and ES into plain language (e.g. "In a rough week, your portfolio could lose around X...").
Then one sentence on the single biggest risk driver — explain *why* it matters, not just what it is.

## What to watch out for

- [risk implication, number in parentheses]
- [risk implication, number in parentheses]
- [risk implication, number in parentheses]

## What to do

- [action: what to change, how much, why in plain terms]
- [action: what to change, how much, why in plain terms]
- [action: what to change, how much, why in plain terms]

## Rules
- Use ## headings exactly as shown above — never use **bold** for section titles.
- Each section must start on its own line, separated by a blank line.
- 220 words maximum total.
- Never start a sentence with a raw metric (e.g. do not write "VaR = $73.94"). Use numbers to support a point, not lead one.
- No jargon without a brief plain-English explanation.
- If the model is well-calibrated (Kupiec p > 0.05), add one sentence at the end about it.
"""
        if custom_instructions:
            base_prompt += "\n\nAdditional instructions:\n" + custom_instructions.strip()
        return base_prompt

    def _build_user_message(self, risk_analysis: Dict[str, Any]) -> str:
        as_of = risk_analysis.get("as_of", "N/A")
        portfolio_value = float(risk_analysis.get("portfolio_value", 0) or 0)
        confidence = float(risk_analysis.get("confidence", 0.95) or 0.95)
        horizon_days = int(risk_analysis.get("horizon_days", 5) or 5)

        components = risk_analysis.get("components") or []
        risk_facts = risk_analysis.get("risk_facts") or {}
        backtest = risk_analysis.get("backtest")

        parts = [
            f"# Portfolio Risk Analysis (as of {as_of})",
            f"**Portfolio Value:** ${portfolio_value:,.2f}",
            f"**Risk Horizon:** {horizon_days} days at {confidence*100:.0f}% confidence",
            "",
            "## Risk Metrics",
            f"- VaR: ${float(risk_facts.get('var_dollars', 0) or 0):,.2f} ({float(risk_facts.get('var_pct', 0) or 0)*100:.2f}%)",
        ]

        if risk_facts.get("es_dollars") is not None:
            parts.append(
                f"- ES: ${float(risk_facts.get('es_dollars', 0) or 0):,.2f} ({float(risk_facts.get('es_pct', 0) or 0)*100:.2f}%)"
            )

        parts += [
            "",
            "## Concentration",
            f"- effective_n: {float(risk_facts.get('effective_n', 0) or 0):.2f}",
            f"- max_single_weight: {float(risk_facts.get('max_single_weight', 0) or 0)*100:.1f}% ({risk_facts.get('max_single_weight_symbol','N/A')})",
            f"- max_single_risk_contribution: {float(risk_facts.get('max_single_risk_contribution', 0) or 0)*100:.1f}% ({risk_facts.get('max_single_risk_contribution_symbol','N/A')})",
        ]

        if risk_facts.get("avg_pairwise_corr") is not None:
            parts += [
                "",
                "## Correlation / Diversification",
                f"- avg_pairwise_corr: {float(risk_facts.get('avg_pairwise_corr', 0) or 0):.2f}",
                f"- max_pairwise_corr: {float(risk_facts.get('max_pairwise_corr', 0) or 0):.2f}",
            ]
            if risk_facts.get("top_correlated_pairs"):
                parts.append("- top_correlated_pairs:")
                for pair in (risk_facts.get("top_correlated_pairs") or [])[:3]:
                    parts.append(f"  - {pair['symbol_1']} & {pair['symbol_2']}: {float(pair['correlation']):.2f}")

        if components:
            parts += ["", "## Positions (sorted by VaR contribution)"]
            for c in components[:8]:
                parts.append(
                    f"- {c['symbol']}: value=${float(c['position_value']):,.2f}, "
                    f"weight={float(c['weight'])*100:.1f}%, "
                    f"VaR_contribution={float(c['percentage_contribution'])*100:.1f}%, "
                    f"marginal_VaR=${float(c.get('marginal_var_dollars', 0) or 0):,.2f}"
                )

        if backtest:
            parts += [
                "",
                "## Backtest (if present)",
                f"- breach_rate: {float(backtest.get('breach_rate', 0) or 0)*100:.1f}%",
                f"- expected_rate: {float(backtest.get('expected_rate', 0) or 0)*100:.1f}%",
                f"- kupiec_p_value: {float(backtest.get('kupiec_p_value', 0) or 0):.3f}",
                f"- interpretation: {backtest.get('interpretation', 'N/A')}",
            ]

        return "\n".join(parts)
