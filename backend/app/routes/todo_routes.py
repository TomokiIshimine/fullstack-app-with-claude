from __future__ import annotations

from datetime import date
from typing import Any, cast

from flask import Blueprint, Response, jsonify, request
from werkzeug.exceptions import BadRequest

from app.schemas.todo import TodoCreateData, TodoStatus, TodoToggleData, TodoUpdateData
from app.services.todo_service import (
    TodoValidationError,
    create_todo,
    delete_todo,
    list_todos,
    serialize_todo,
    serialize_todos,
    toggle_completed,
    update_todo,
)

todo_bp = Blueprint("todos", __name__, url_prefix="/todos")


@todo_bp.get("")
def get_todos() -> Response:
    session = _get_session()

    raw_status = request.args.get("status", "active")
    status = cast(TodoStatus, raw_status)

    todos = list_todos(session, status)
    items = serialize_todos(todos)
    return jsonify({"items": items, "meta": {"count": len(items)}})


@todo_bp.post("")
def create_todo_route() -> tuple[Response, int]:
    session = _get_session()
    payload = _load_json_body()

    title = _require_string(payload, "title")
    detail = _optional_string(payload, "detail")
    due_date = _optional_date(payload, "due_date")

    todo = create_todo(session, TodoCreateData(title=title, detail=detail, due_date=due_date))
    return jsonify(serialize_todo(todo)), 201


@todo_bp.patch("/<int:todo_id>")
def update_todo_route(todo_id: int) -> Response:
    session = _get_session()
    payload = _load_json_body()

    update_kwargs: dict[str, Any] = {}
    if "title" in payload:
        update_kwargs["title"] = _require_string(payload, "title")
    if "detail" in payload:
        update_kwargs["detail"] = _optional_string(payload, "detail")
    if "due_date" in payload:
        update_kwargs["due_date"] = _optional_date(payload, "due_date")

    todo = update_todo(session, todo_id, TodoUpdateData(**update_kwargs))
    return jsonify(serialize_todo(todo))


@todo_bp.patch("/<int:todo_id>/complete")
def toggle_todo_route(todo_id: int) -> Response:
    session = _get_session()
    payload = _load_json_body()

    if "is_completed" not in payload:
        raise TodoValidationError("Request must include is_completed.")

    is_completed = payload["is_completed"]
    if not isinstance(is_completed, bool):
        raise TodoValidationError("is_completed must be a boolean.")

    todo = toggle_completed(session, todo_id, TodoToggleData(is_completed=is_completed))
    return jsonify(serialize_todo(todo))


@todo_bp.delete("/<int:todo_id>")
def delete_todo_route(todo_id: int) -> Response:
    session = _get_session()
    delete_todo(session, todo_id)
    return Response(status=204)


def _load_json_body() -> dict[str, Any]:
    payload = request.get_json(silent=True)
    if payload is None:
        raise BadRequest("Request must contain application/json body.")
    if not isinstance(payload, dict):
        raise BadRequest("Request JSON must be an object.")
    return payload


def _require_string(payload: dict[str, Any], key: str) -> str:
    value = payload.get(key)
    if value is None:
        raise TodoValidationError(f"{key} is required.")
    if not isinstance(value, str):
        raise TodoValidationError(f"{key} must be a string.")
    return value


def _optional_string(payload: dict[str, Any], key: str) -> str | None:
    if key not in payload:
        return None
    value = payload.get(key)
    if value is None:
        return None
    if not isinstance(value, str):
        raise TodoValidationError(f"{key} must be a string or null.")
    return value


def _optional_date(payload: dict[str, Any], key: str) -> date | None:
    if key not in payload:
        return None
    value = payload.get(key)
    if value is None:
        return None
    if not isinstance(value, str):
        raise TodoValidationError(f"{key} must be an ISO date string.")
    try:
        return date.fromisoformat(value)
    except ValueError as exc:
        raise TodoValidationError(f"{key} must follow YYYY-MM-DD format.") from exc


def _get_session():
    from app.main import get_session

    return get_session()


__all__ = ["todo_bp"]
