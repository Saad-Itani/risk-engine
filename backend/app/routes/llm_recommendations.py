# backend/app/routes/llm_recommendations.py
"""
Standalone LLM recommendations endpoint.
Called separately from /risk/analysis so the main results render immediately
while the AI analysis loads in the background.
"""

import os
from flask import Blueprint, request, jsonify
from backend.app.services.llm_recommender import LLMRecommender

bp = Blueprint("llm_recommendations", __name__)


@bp.post("")
def get_llm_recommendations():
    """
    Generate AI-powered recommendations from a pre-computed risk analysis payload.

    Request body:
        {
            "risk_analysis": { ...full /risk/analysis response... },
            "custom_instructions": "Optional"
        }

    Returns:
        { "recommendations": "## Risk Summary...", "error": null }
    """
    try:
        payload = request.get_json(force=True) or {}
        risk_analysis = payload.get("risk_analysis")
        custom_instructions = payload.get("custom_instructions")

        if not risk_analysis:
            return jsonify({"error": "risk_analysis payload is required", "recommendations": None}), 400

        recommender = LLMRecommender(
            model=os.getenv("OPENAI_MODEL", "gpt-5.4-nano")
        )
        text = recommender.generate_recommendations(
            risk_analysis,
            custom_instructions=custom_instructions,
            max_output_tokens=600,
        )
        return jsonify({"recommendations": text, "error": None})

    except Exception as e:
        return jsonify({"recommendations": None, "error": str(e)}), 200
