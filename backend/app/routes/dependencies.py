"""Route-level helpers for dependency injection and request validation."""

from __future__ import annotations

import logging
from functools import wraps
from typing import Any, Callable, TypeVar

from flask import g, request
from pydantic import BaseModel, ValidationError
from werkzeug.exceptions import BadRequest, Conflict, Forbidden, InternalServerError, NotFound

from app.database import get_session
from app.schemas.user import UserValidationError
from app.services.user_service import CannotDeleteAdminError, UserAlreadyExistsError, UserNotFoundError, UserService, UserServiceError

logger = logging.getLogger(__name__)

SchemaType = TypeVar("SchemaType", bound=BaseModel)
RouteCallable = TypeVar("RouteCallable", bound=Callable[..., Any])


def get_user_service() -> UserService:
    """Return request-scoped UserService instance."""

    if service := g.get("user_service"):
        return service

    session = get_session()
    service = UserService(session)
    g.user_service = service
    return service


def with_user_service(func: RouteCallable) -> RouteCallable:
    """Inject UserService and translate domain errors into HTTP responses."""

    @wraps(func)
    def wrapper(*args: Any, **kwargs: Any):
        user_service = get_user_service()
        try:
            return func(*args, user_service=user_service, **kwargs)
        except UserAlreadyExistsError as exc:
            raise Conflict(description=str(exc)) from exc
        except UserNotFoundError as exc:
            raise NotFound(description=str(exc)) from exc
        except CannotDeleteAdminError as exc:
            raise Forbidden(description=str(exc)) from exc
        except UserServiceError as exc:
            logger.error("User service error", exc_info=True)
            raise InternalServerError(description=str(exc)) from exc
        except Exception:  # pragma: no cover - unexpected error path
            logger.error("Unexpected error in user route", exc_info=True)
            raise

    return wrapper  # type: ignore[return-value]


def validate_request_body(schema: type[SchemaType]) -> Callable[[RouteCallable], RouteCallable]:
    """Validate JSON request body with given schema and pass it to the route."""

    def decorator(func: RouteCallable) -> RouteCallable:
        @wraps(func)
        def wrapper(*args: Any, **kwargs: Any):
            payload = request.get_json()
            if not payload:
                logger.warning("Validation failed: request body is required", extra={"path": request.path})
                raise BadRequest(description="Request body is required")

            try:
                data = schema.model_validate(payload)
            except ValidationError as exc:
                messages = ", ".join(err.get("msg", "Invalid value") for err in exc.errors())
                logger.warning("Validation failed for request body", extra={"path": request.path, "messages": messages})
                raise BadRequest(description=f"Validation error: {messages}") from exc
            except UserValidationError as exc:
                logger.warning("Domain validation failed", extra={"path": request.path, "message": str(exc)})
                raise BadRequest(description=str(exc)) from exc

            return func(*args, data=data, **kwargs)

        return wrapper  # type: ignore[return-value]

    return decorator


__all__ = ["get_user_service", "with_user_service", "validate_request_body"]
