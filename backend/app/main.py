from __future__ import annotations

import os
import time
import uuid

from flask import Flask, Response, g, jsonify, request
from flask_cors import CORS
from werkzeug.exceptions import HTTPException

from .config import Config
from .database import get_engine, get_session_factory, init_engine
from .limiter import init_limiter
from .logger import setup_logging
from .routes import api_bp


def _register_error_handlers(app: Flask) -> None:
    @app.errorhandler(HTTPException)
    def handle_http_exception(err: HTTPException):
        app.logger.warning(
            "HTTP exception",
            extra={
                "status_code": err.code,
                "description": err.description,
                "path": request.path,
                "http_method": request.method,
            },
        )
        response = jsonify(error={"code": err.code, "message": err.description})
        return response, err.code

    @app.errorhandler(Exception)
    def handle_unexpected_exception(err: Exception):
        app.logger.error(
            "Unhandled application error",
            exc_info=True,
            extra={"error_type": type(err).__name__, "path": request.path, "http_method": request.method},
        )
        response = jsonify(error={"code": 500, "message": "Internal server error"})
        return response, 500


def _register_request_hooks(app: Flask) -> None:
    """Register request lifecycle hooks for tracing and logging."""

    @app.before_request
    def set_request_id() -> None:
        """Generate a unique request ID for tracing."""
        g.request_id = str(uuid.uuid4())
        g.start_time = time.time()

    @app.after_request
    def log_request_completion(response: Response) -> Response:
        """Log request completion with timing information."""
        if hasattr(g, "start_time") and hasattr(g, "request_id"):
            elapsed_ms = (time.time() - g.start_time) * 1000
            forwarded_for = request.headers.get("X-Forwarded-For")
            client_ip = forwarded_for.split(",")[0].strip() if forwarded_for else (request.remote_addr or "unknown")
            app.logger.info(
                "Request completed",
                extra={
                    "http_method": request.method,
                    "path": request.path,
                    "status_code": response.status_code,
                    "duration_ms": round(elapsed_ms, 2),
                    "client_ip": client_ip,
                },
            )
        return response


def _register_session_hooks(app: Flask) -> None:
    @app.teardown_appcontext
    def cleanup_session(exception: BaseException | None) -> None:
        from .database import _session_factory

        session = g.pop("db_session", None)
        if session is None:
            if _session_factory is not None:
                _session_factory.remove()
            return

        try:
            if exception is None:
                session.commit()
            else:
                app.logger.warning(
                    "Rolling back database session due to exception",
                    extra={"exception": str(exception)},
                )
                session.rollback()
        except Exception as e:
            app.logger.error(
                "Error during session cleanup",
                exc_info=True,
                extra={"exception": str(e)},
            )
            session.rollback()
            raise
        finally:
            session.close()
            if _session_factory is not None:
                _session_factory.remove()


def create_app() -> Flask:
    app = Flask(__name__)
    app.config.from_object(Config)

    # Initialize logging
    setup_logging(
        app_logger=app.logger,
        log_dir=app.config["LOG_DIR"],
        log_level=app.config["LOG_LEVEL"],
        is_development=app.config["FLASK_ENV"] == "development",
        is_testing=app.config.get("TESTING", False),
    )

    app.logger.info(f"Starting application in {app.config['FLASK_ENV']} mode")

    # Setup CORS for cookie-based authentication
    frontend_origin = os.getenv("FRONTEND_URL", "http://localhost:5173")
    CORS(
        app,
        supports_credentials=True,
        origins=[frontend_origin],
        allow_headers=["Content-Type"],
        methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    )
    app.logger.info(f"CORS enabled for origin: {frontend_origin}")

    # Initialize rate limiter with Redis backend
    init_limiter(app)

    init_engine(app.config["SQLALCHEMY_DATABASE_URI"])
    app.extensions["sqlalchemy_engine"] = get_engine()
    app.extensions["sqlalchemy_session_factory"] = get_session_factory()

    # Create admin user from environment variables
    # This must be called after init_engine() to ensure database connection is ready
    # Automatically skips in test environment (FLASK_ENV=testing)
    from scripts.create_admin import create_admin_user

    create_admin_user()

    _register_error_handlers(app)
    _register_request_hooks(app)
    _register_session_hooks(app)

    app.register_blueprint(api_bp)
    app.logger.info("API blueprint registered: /api")

    app.logger.info("Application initialization completed successfully")
    return app


app = create_app()
