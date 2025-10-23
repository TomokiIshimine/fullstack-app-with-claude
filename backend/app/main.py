from __future__ import annotations

from flask import Flask, Response, g, jsonify
from werkzeug.exceptions import HTTPException

from .config import Config
from .database import get_engine, get_session_factory, init_engine
from .routes import api_bp


def _register_error_handlers(app: Flask) -> None:
    @app.errorhandler(HTTPException)
    def handle_http_exception(err: HTTPException):
        response = jsonify(error={"code": err.code, "message": err.description})
        return response, err.code

    @app.errorhandler(Exception)
    def handle_unexpected_exception(err: Exception):
        app.logger.exception("Unhandled application error", exc_info=err)
        response = jsonify(error={"code": 500, "message": "Internal server error"})
        return response, 500


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
                session.rollback()
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()
            if _session_factory is not None:
                _session_factory.remove()


def create_app() -> Flask:
    app = Flask(__name__)
    app.config.from_object(Config)

    init_engine(app.config["SQLALCHEMY_DATABASE_URI"])
    app.extensions["sqlalchemy_engine"] = get_engine()
    app.extensions["sqlalchemy_session_factory"] = get_session_factory()

    _register_error_handlers(app)
    _register_session_hooks(app)

    app.register_blueprint(api_bp)

    @app.get("/health")
    def health_check() -> Response:
        return jsonify(status="ok")

    return app


app = create_app()
