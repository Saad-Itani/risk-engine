from flask import Blueprint, request, jsonify
from backend.app.models import Company

bp = Blueprint("universe", __name__)

@bp.get("")
def search_universe():
    q = (request.args.get("q") or "").strip()

    query = Company.query.filter_by(is_active=True)
    if q:
        like = f"%{q}%"
        query = query.filter(
            (Company.symbol.ilike(like)) | (Company.shortname.ilike(like))
        )

    rows = query.order_by(Company.symbol).limit(50).all()

    return jsonify([
        {
            "symbol": r.symbol,
            "shortname": r.shortname,
            "longname": r.longname,
            "sector": r.sector,
            "industry": r.industry,
        }
        for r in rows
    ])
