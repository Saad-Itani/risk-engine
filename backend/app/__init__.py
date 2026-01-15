from flask import Flask
from .config import Config
from .db import db
from backend.app.routes.universe import bp as universe_bp
from backend.app.routes.var import bp as var_bp
from backend.app.routes.es import bp as es_bp
from backend.app.routes.backtest import bp as backtest_bp
from backend.app.routes.risk_analysis import bp as risk_analysis_bp

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    db.init_app(app)
    app.register_blueprint(universe_bp, url_prefix="/universe")
    app.register_blueprint(var_bp, url_prefix="/var")
    app.register_blueprint(es_bp)
    app.register_blueprint(backtest_bp, url_prefix="/risk/backtest")
    app.register_blueprint(risk_analysis_bp, url_prefix="/risk/analysis")
    return app
