from __future__ import annotations

from contextlib import contextmanager
from typing import Iterator

from flask import Flask, Response, g, has_app_context, jsonify
from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, scoped_session, sessionmaker
from sqlalchemy.orm.scoping import ScopedSession
from werkzeug.exceptions import HTTPException

from .config import Config
from .routes import api_bp

_engine: Engine | None = None
_session_factory: ScopedSession[Session] | None = None


def _init_engine(database_uri: str) -> None:
    """Initialise SQLAlchemy engine and scoped session factory."""
    global _engine, _session_factory

    if _session_factory is not None:
        _session_factory.remove()

    if _engine is not None:
        _engine.dispose()

    _engine = create_engine(
        database_uri,
        future=True,
        pool_pre_ping=True,
    )

    _session_factory = scoped_session(sessionmaker(bind=_engine, autoflush=False, expire_on_commit=False))


def get_engine() -> Engine:
    if _engine is None:
        raise RuntimeError("Database engine is not initialised.")
    return _engine


def get_session_factory() -> ScopedSession[Session]:
    if _session_factory is None:
        raise RuntimeError("Database session factory is not initialised.")
    return _session_factory


def get_session() -> Session:
    """Return a SQLAlchemy session bound to the current context."""
    factory = get_session_factory()

    if has_app_context():
        session = g.get("db_session")
        if session is None:
            session = factory()
            g.db_session = session
        return session

    # Outside of Flask application context (e.g. in tests), return a new session.
    return factory()


@contextmanager
def session_scope() -> Iterator[Session]:
    """Provide a transactional scope for scripts or tests."""
    session = get_session()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        if not has_app_context():
            session.close()
            get_session_factory().remove()


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

    _init_engine(app.config["SQLALCHEMY_DATABASE_URI"])
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
