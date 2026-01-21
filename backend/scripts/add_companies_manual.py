from backend.app import create_app
from backend.app.db import db
from backend.app.models import Company

# Edit this list whenever you want to add companies manually


COMPANIES = [
    {
        "symbol": "GLD",
        "shortname": "SPDR Gold Shares",
        "longname": "SPDR Gold Shares",
        "sector": "ETF",
        "industry": "Precious Metals",
        "is_active": True,
    },
    {
        "symbol": "SLV",
        "shortname": "iShares Silver Trust",
        "longname": "iShares Silver Trust",
        "sector": "ETF",
        "industry": "Precious Metals",
        "is_active": True,
    },
    {
        "symbol": "SPY",
        "shortname": "SPDR S&P 500 ETF",
        "longname": "SPDR S&P 500 ETF Trust",
        "sector": "ETF",
        "industry": "Equity Index",
        "is_active": True,
    },
    {
        "symbol": "QQQ",
        "shortname": "Invesco QQQ",
        "longname": "Invesco QQQ Trust",
        "sector": "ETF",
        "industry": "Equity Index",
        "is_active": True,
    },
    {
        "symbol": "SNDK",
        "shortname": "SanDisk",
        "longname": "SanDisk Corporation",
        "sector": "Technology",
        "industry": "Data Storage",
        "is_active": False,
    },
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
