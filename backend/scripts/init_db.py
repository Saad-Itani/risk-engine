from backend.app import create_app
from backend.app.db import db
import backend.app.models  # registers models

app = create_app()

with app.app_context():
    db.create_all()
    print("DB tables created.")