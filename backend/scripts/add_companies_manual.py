from backend.app import create_app
from backend.app.db import db
from backend.app.models import Company

# Edit this list whenever you want to add companies manually
COMPANIES = [
    {
        "symbol": "TSM",
        "shortname": "Taiwan Semiconductor",
        "longname": "Taiwan Semiconductor Manufacturing Company Limited",
        "sector": "Technology",
        "industry": "Semiconductors",
        "is_active": True,
    },
    {
        "symbol": "ASML",
        "shortname": "ASML Holding",
        "longname": "ASML Holding N.V.",
        "sector": "Technology",
        "industry": "Semiconductor Equipment",
        "is_active": True,
    }
]

app = create_app()

with app.app_context():
    added = 0
    updated = 0

    for c in COMPANIES:
        sym = c["symbol"].strip().upper()

        row = Company.query.filter_by(symbol=sym).first()
        if row:
            # update existing
            row.shortname = c.get("shortname", row.shortname)
            row.longname = c.get("longname", row.longname)
            row.sector = c.get("sector", row.sector)
            row.industry = c.get("industry", row.industry)
            row.is_active = c.get("is_active", True)
            updated += 1
        else:
            # insert new
            db.session.add(Company(
                symbol=sym,
                shortname=c.get("shortname"),
                longname=c.get("longname"),
                sector=c.get("sector"),
                industry=c.get("industry"),
                is_active=c.get("is_active", True),
            ))
            added += 1

    db.session.commit()
    print(f"Done. Added={added}, Updated={updated}")
