from backend.app import create_app
from backend.app.db import db
from backend.app.models import Price

app = create_app()

with app.app_context():
    deleted = Price.query.delete()
    db.session.commit()
    print("Deleted rows:", deleted)
