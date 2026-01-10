from backend.app import create_app
from backend.app.models import Company

app = create_app()

with app.app_context():
    print("Companies count:", Company.query.count())
    print("First 5:", [(c.symbol, c.shortname) for c in Company.query.limit(5).all()])
