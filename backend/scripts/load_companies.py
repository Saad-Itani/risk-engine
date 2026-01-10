import pandas as pd

from backend.app import create_app
from backend.app.db import db
from backend.app.models import Company

CSV_PATH = "backend/data/sp500_companies_universe.csv"

app = create_app()

with app.app_context():
    df = pd.read_csv(CSV_PATH)
    df.columns = [c.strip() for c in df.columns]

    # NEW FILE COLUMN NAMES → YOUR SCHEMA
    df = df.rename(columns={
        "Symbol": "symbol",
        "Security": "shortname",          # company name
        "GICS Sector": "sector",
        "GICS Sub-Industry": "industry",
    })

    # Keep only what your Company model needs
    df = df[["symbol", "shortname", "sector", "industry"]].dropna(subset=["symbol"])
    df["symbol"] = df["symbol"].astype(str).str.strip().str.upper()
    df["shortname"] = df["shortname"].astype(str).str.strip()
    df["sector"] = df["sector"].astype(str).str.strip()
    df["industry"] = df["industry"].astype(str).str.strip()

    # You don't have Longname in this CSV → set it = shortname
    df["longname"] = df["shortname"]

    df = df.drop_duplicates(subset=["symbol"])

    # Replace existing companies
    Company.query.delete()
    db.session.commit()

    rows = []
    for _, r in df.iterrows():
        rows.append(Company(
            symbol=r["symbol"],
            shortname=r["shortname"],
            longname=r["longname"],
            sector=r["sector"],
            industry=r["industry"],
            is_active=True
        ))

    db.session.bulk_save_objects(rows)
    db.session.commit()

    print(f"Inserted {len(rows)} companies.")
