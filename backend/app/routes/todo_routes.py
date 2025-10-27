from __future__ import annotations

import logging
from typing import Any

from flask import Blueprint, Response, g, jsonify, request
from pydantic import ValidationError
from werkzeug.exceptions import BadRequest, HTTPException

from app.database import get_session
from app.schemas.todo import TodoCreateData, TodoToggleData, TodoUpdateData, TodoValidationError, serialize_todos, validate_status
from app.services.todo_service import TodoService
from app.utils.auth_decorator import require_auth

logger = logging.getLogger(__name__)

todo_bp = Blueprint("todos", __name__, url_prefix="/todos")


@todo_bp.get("")
@require_auth
def get_todos() -> Response:
    """List todos filtered by status for authenticated user."""
    user_id = g.user_id
    raw_status = request.args.get("status", "active")
    logger.info(f"GET /api/todos - Listing todos for user_id={user_id} with status filter: {raw_status}")
    try:
        session = get_session()
        service = TodoService(session)

        status = validate_status(raw_status)

        todos = service.list_todos(user_id, status)
        items = serialize_todos(todos)
        logger.info(f"GET /api/todos - Successfully retrieved {len(items)} todos for user_id={user_id}")
        return jsonify({"items": items, "meta": {"count": len(items)}})
    except TodoValidationError as exc:
        logger.warning(f"GET /api/todos - Validation error: {exc}")
        raise _to_http_exception(exc)


@todo_bp.post("")
@require_auth
def create_todo_route() -> tuple[Response, int]:
    """Create a new todo for authenticated user."""
    user_id = g.user_id
    logger.info(f"POST /api/todos - Creating new todo for user_id={user_id}")
    try:
        session = get_session()
        service = TodoService(session)
        payload = _load_json_body()

        # Parse and validate with Pydantic
        data = TodoCreateData.model_validate(payload)
        todo = service.create_todo(user_id, data)

        from app.schemas.todo import serialize_todo

        logger.info(f"POST /api/todos - Todo created successfully: id={todo.id}, user_id={user_id}")
        return jsonify(serialize_todo(todo)), 201
    except ValidationError as exc:
        # Convert Pydantic ValidationError to TodoValidationError
        logger.warning(f"POST /api/todos - Validation error: {exc.errors()}")
        raise _to_http_exception(_pydantic_error_to_todo_error(exc))
    except TodoValidationError as exc:
        logger.warning(f"POST /api/todos - Validation error: {exc}")
        raise _to_http_exception(exc)


@todo_bp.patch("/<int:todo_id>")
@require_auth
def update_todo_route(todo_id: int) -> Response:
    """Update an existing todo for authenticated user."""
    user_id = g.user_id
    logger.info(f"PATCH /api/todos/{todo_id} - Updating todo for user_id={user_id}")
    try:
        session = get_session()
        service = TodoService(session)
        payload = _load_json_body()

        # Parse and validate with Pydantic
        data = TodoUpdateData.model_validate(payload)
        todo = service.update_todo(user_id, todo_id, data)

        from app.schemas.todo import serialize_todo

        logger.info(f"PATCH /api/todos/{todo_id} - Todo updated successfully for user_id={user_id}")
        return jsonify(serialize_todo(todo))
    except ValidationError as exc:
        logger.warning(f"PATCH /api/todos/{todo_id} - Validation error: {exc.errors()}")
        raise _to_http_exception(_pydantic_error_to_todo_error(exc))
    except TodoValidationError as exc:
        logger.warning(f"PATCH /api/todos/{todo_id} - Validation error: {exc}")
        raise _to_http_exception(exc)


@todo_bp.patch("/<int:todo_id>/complete")
@require_auth
def toggle_todo_route(todo_id: int) -> Response:
    """Toggle the completion status of a todo for authenticated user."""
    user_id = g.user_id
    logger.info(f"PATCH /api/todos/{todo_id}/complete - Toggling todo completion status for user_id={user_id}")
    try:
        session = get_session()
        service = TodoService(session)
        payload = _load_json_body()

        # Validate is_completed field exists
        if "is_completed" not in payload:
            raise TodoValidationError("Request must include is_completed.")

        # Parse and validate with Pydantic
        data = TodoToggleData.model_validate(payload)
        todo = service.toggle_completed(user_id, todo_id, data)

        from app.schemas.todo import serialize_todo

        logger.info(f"PATCH /api/todos/{todo_id}/complete - Todo completion status toggled: is_completed={todo.is_completed} for user_id={user_id}")
        return jsonify(serialize_todo(todo))
    except ValidationError as exc:
        logger.warning(f"PATCH /api/todos/{todo_id}/complete - Validation error: {exc.errors()}")
        raise _to_http_exception(_pydantic_error_to_todo_error(exc))
    except TodoValidationError as exc:
        logger.warning(f"PATCH /api/todos/{todo_id}/complete - Validation error: {exc}")
        raise _to_http_exception(exc)


@todo_bp.delete("/<int:todo_id>")
@require_auth
def delete_todo_route(todo_id: int) -> Response:
    """Delete a todo by ID for authenticated user."""
    user_id = g.user_id
    logger.info(f"DELETE /api/todos/{todo_id} - Deleting todo for user_id={user_id}")
    session = get_session()
    service = TodoService(session)
    service.delete_todo(user_id, todo_id)
    logger.info(f"DELETE /api/todos/{todo_id} - Todo deleted successfully for user_id={user_id}")
    return Response(status=204)


def _load_json_body() -> dict[str, Any]:
    """Load and validate JSON request body."""
    payload = request.get_json(silent=True)
    if payload is None:
        raise BadRequest("Request must contain application/json body.")
    if not isinstance(payload, dict):
        raise BadRequest("Request JSON must be an object.")
    return payload


def _pydantic_error_to_todo_error(exc: ValidationError) -> TodoValidationError:
    """Convert Pydantic ValidationError to TodoValidationError."""
    # Extract first error message for consistency with existing error handling
    errors = exc.errors()
    if errors:
        first_error = errors[0]
        msg = first_error.get("msg", "Validation error")
        # Try to extract our custom error messages
        if "Value error, " in msg:
            # Pydantic wraps our custom errors with "Value error, " prefix
            msg = msg.replace("Value error, ", "")
        return TodoValidationError(msg)
    return TodoValidationError("Validation error")


def _to_http_exception(exc: TodoValidationError) -> HTTPException:
    """Convert TodoValidationError to HTTPException."""
    return BadRequest(str(exc))


__all__ = ["todo_bp"]
