from __future__ import annotations

from datetime import date
from typing import Any

from flask import Blueprint, Response, jsonify, request
from werkzeug.exceptions import BadRequest, HTTPException

from app.database import get_session
from app.schemas.todo import TodoCreateData, TodoToggleData, TodoUpdateData, TodoValidationError, serialize_todos, validate_status
from app.services.todo_service import TodoService

todo_bp = Blueprint("todos", __name__, url_prefix="/todos")


@todo_bp.get("")
def get_todos() -> Response:
    """List todos filtered by status."""
    try:
        session = get_session()
        service = TodoService(session)

        raw_status = request.args.get("status", "active")
        status = validate_status(raw_status)

        todos = service.list_todos(status)
        items = serialize_todos(todos)
        return jsonify({"items": items, "meta": {"count": len(items)}})
    except TodoValidationError as exc:
        raise _to_http_exception(exc)


@todo_bp.post("")
def create_todo_route() -> tuple[Response, int]:
    """Create a new todo."""
    try:
        session = get_session()
        service = TodoService(session)
        payload = _load_json_body()

        title = payload.get("title", "")
        detail = payload.get("detail")
        due_date = _parse_date(payload.get("due_date"))

        data = TodoCreateData(title=title, detail=detail, due_date=due_date)
        todo = service.create_todo(data)

        from app.schemas.todo import serialize_todo

        return jsonify(serialize_todo(todo)), 201
    except TodoValidationError as exc:
        raise _to_http_exception(exc)


@todo_bp.patch("/<int:todo_id>")
def update_todo_route(todo_id: int) -> Response:
    """Update an existing todo."""
    try:
        session = get_session()
        service = TodoService(session)
        payload = _load_json_body()

        from app.schemas.todo import _MISSING

        title = payload.get("title", _MISSING)
        detail = payload.get("detail", _MISSING) if "detail" in payload else _MISSING
        due_date = _parse_date(payload.get("due_date")) if "due_date" in payload else _MISSING

        data = TodoUpdateData(title=title, detail=detail, due_date=due_date)
        todo = service.update_todo(todo_id, data)

        from app.schemas.todo import serialize_todo

        return jsonify(serialize_todo(todo))
    except TodoValidationError as exc:
        raise _to_http_exception(exc)


@todo_bp.patch("/<int:todo_id>/complete")
def toggle_todo_route(todo_id: int) -> Response:
    """Toggle the completion status of a todo."""
    try:
        session = get_session()
        service = TodoService(session)
        payload = _load_json_body()

        is_completed = payload.get("is_completed")
        if is_completed is None:
            raise TodoValidationError("Request must include is_completed.")

        data = TodoToggleData(is_completed=is_completed)
        todo = service.toggle_completed(todo_id, data)

        from app.schemas.todo import serialize_todo

        return jsonify(serialize_todo(todo))
    except TodoValidationError as exc:
        raise _to_http_exception(exc)


@todo_bp.delete("/<int:todo_id>")
def delete_todo_route(todo_id: int) -> Response:
    """Delete a todo by ID."""
    session = get_session()
    service = TodoService(session)
    service.delete_todo(todo_id)
    return Response(status=204)


def _load_json_body() -> dict[str, Any]:
    """Load and validate JSON request body."""
    payload = request.get_json(silent=True)
    if payload is None:
        raise BadRequest("Request must contain application/json body.")
    if not isinstance(payload, dict):
        raise BadRequest("Request JSON must be an object.")
    return payload


def _parse_date(value: Any) -> date | None:
    """Parse an ISO date string to a date object."""
    if value is None:
        return None
    if not isinstance(value, str):
        raise TodoValidationError("Date must be an ISO date string.")
    try:
        return date.fromisoformat(value)
    except ValueError as exc:
        raise TodoValidationError("Date must follow YYYY-MM-DD format.") from exc


def _to_http_exception(exc: TodoValidationError) -> HTTPException:
    """Convert TodoValidationError to HTTPException."""
    return BadRequest(str(exc))


__all__ = ["todo_bp"]
