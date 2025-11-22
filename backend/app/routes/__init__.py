from __future__ import annotations

from flask import Blueprint

from .auth_routes import auth_bp
from .health import health_bp
from .password_routes import password_bp
from .user_routes import user_bp

api_bp = Blueprint("api", __name__, url_prefix="/api")
api_bp.register_blueprint(auth_bp)

api_bp.register_blueprint(user_bp)
api_bp.register_blueprint(password_bp)
api_bp.register_blueprint(health_bp)

__all__ = ["api_bp"]
