from __future__ import annotations

import time
import uuid

from flask import Flask, Response, g, jsonify, request
from werkzeug.exceptions import HTTPException

from .config import Config
from .database import get_engine, get_session_factory, init_engine
from .logger import setup_logging
from .routes import api_bp


def _register_error_handlers(app: Flask) -> None:
    @app.errorhandler(HTTPException)
    def handle_http_exception(err: HTTPException):
        app.logger.warning(f"HTTP exception: {err.code} - {err.description}")
        response = jsonify(error={"code": err.code, "message": err.description})
        return response, err.code

    @app.errorhandler(Exception)
    def handle_unexpected_exception(err: Exception):
        app.logger.error(f"Unhandled application error: {type(err).__name__}: {err}", exc_info=True)
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
            app.logger.info(
                f"Request completed: {request.method} {request.path} - "
                f"status={response.status_code} - "
                f"duration={elapsed_ms:.2f}ms - "
                f"request_id={g.request_id}"
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
                app.logger.warning(f"Rolling back database session due to exception: {exception}")
                session.rollback()
        except Exception as e:
            app.logger.error(f"Error during session cleanup: {e}", exc_info=True)
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

    init_engine(app.config["SQLALCHEMY_DATABASE_URI"])
    app.extensions["sqlalchemy_engine"] = get_engine()
    app.extensions["sqlalchemy_session_factory"] = get_session_factory()

    _register_error_handlers(app)
    _register_request_hooks(app)
    _register_session_hooks(app)

    app.register_blueprint(api_bp)
    app.logger.info("API blueprint registered: /api")

    @app.get("/health")
    def health_check() -> Response:
        return jsonify(status="ok")

    app.logger.info("Application initialization completed successfully")
    return app


app = create_app()
