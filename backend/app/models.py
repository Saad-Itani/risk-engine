# backend/app/models.py
from backend.app.db import db

class Company(db.Model):
    __tablename__ = "companies"
    symbol = db.Column(db.String(16), primary_key=True)
    shortname = db.Column(db.String(128))
    longname = db.Column(db.String(256))
    sector = db.Column(db.String(128))
    industry = db.Column(db.String(128))
    is_active = db.Column(db.Boolean, default=True)

class Price(db.Model):
    __tablename__ = "prices"
    id = db.Column(db.Integer, primary_key=True)
    symbol = db.Column(db.String(16), db.ForeignKey("companies.symbol"), nullable=False, index=True)
    date = db.Column(db.Date, nullable=False, index=True)
    close = db.Column(db.Float, nullable=False)
    adj_close = db.Column(db.Float)     # optional
    source = db.Column(db.String(32), default="stooq")
    updated_at = db.Column(db.DateTime, server_default=db.func.current_timestamp())

    __table_args__ = (db.UniqueConstraint("symbol", "date", name="uq_symbol_date"),)