from __future__ import annotations

from datetime import date
from typing import Iterable, Sequence

from sqlalchemy import select
from sqlalchemy.orm import Session
from werkzeug.exceptions import HTTPException

from app.models.todo import Todo
from app.schemas.todo import TodoCreateData, TodoResponse, TodoStatus, TodoToggleData, TodoUpdateData

MAX_TITLE_LENGTH = 120
MAX_DETAIL_LENGTH = 1000
VALID_STATUSES: tuple[TodoStatus, ...] = ("all", "active", "completed")


class TodoServiceError(HTTPException):
    code = 500
    description = "TODO service error"

    def __init__(self, message: str | None = None):
        super().__init__(description=message or self.description)


class TodoValidationError(TodoServiceError):
    code = 400
    description = "Validation failed for todo operation."


class TodoNotFoundError(TodoServiceError):
    code = 404
    description = "Todo not found."


def list_todos(session: Session, status: TodoStatus = "active") -> Sequence[Todo]:
    status = status or "active"
    if status not in VALID_STATUSES:
        raise TodoValidationError("Invalid status filter.")

    stmt = select(Todo)
    if status == "active":
        stmt = stmt.where(Todo.is_completed.is_(False))
    elif status == "completed":
        stmt = stmt.where(Todo.is_completed.is_(True))

    stmt = stmt.order_by(Todo.due_date.asc(), Todo.created_at.asc())
    return list(session.scalars(stmt))


def create_todo(session: Session, data: TodoCreateData) -> Todo:
    title = _normalize_title(data.title)
    detail = _normalize_detail(data.detail)
    due_date = _validate_due_date(data.due_date)

    todo = Todo(
        title=title,
        detail=detail,
        due_date=due_date,
    )
    session.add(todo)
    session.flush()
    session.refresh(todo)
    return todo


def update_todo(session: Session, todo_id: int, data: TodoUpdateData) -> Todo:
    todo = session.get(Todo, todo_id)
    if todo is None:
        raise TodoNotFoundError()

    if not data.has_updates():
        raise TodoValidationError("No fields provided for update.")

    updates = data.to_updates()

    if "title" in updates:
        todo.title = _normalize_title(str(updates["title"]))

    if "detail" in updates:
        todo.detail = _normalize_detail(updates["detail"])

    if "due_date" in updates:
        todo.due_date = _validate_due_date(updates["due_date"])

    session.flush()
    session.refresh(todo)
    return todo


def toggle_completed(session: Session, todo_id: int, data: TodoToggleData) -> Todo:
    todo = session.get(Todo, todo_id)
    if todo is None:
        raise TodoNotFoundError()

    if not isinstance(data.is_completed, bool):
        raise TodoValidationError("is_completed must be a boolean.")

    todo.is_completed = data.is_completed
    session.flush()
    session.refresh(todo)
    return todo


def delete_todo(session: Session, todo_id: int) -> None:
    todo = session.get(Todo, todo_id)
    if todo is None:
        raise TodoNotFoundError()

    session.delete(todo)
    session.flush()


def serialize_todo(todo: Todo) -> dict[str, object]:
    schema = TodoResponse.from_model(todo)
    return schema.to_dict()


def serialize_todos(todos: Iterable[Todo]) -> list[dict[str, object]]:
    return [serialize_todo(todo) for todo in todos]


def _normalize_title(title: str) -> str:
    trimmed = title.strip()
    if not trimmed:
        raise TodoValidationError("Title must be between 1 and 120 characters.")
    if len(trimmed) > MAX_TITLE_LENGTH:
        raise TodoValidationError("Title must be between 1 and 120 characters.")
    return trimmed


def _normalize_detail(detail: object | None) -> str | None:
    if detail is None:
        return None
    if not isinstance(detail, str):
        raise TodoValidationError("Detail must be a string.")
    trimmed = detail.strip()
    if len(trimmed) > MAX_DETAIL_LENGTH:
        raise TodoValidationError("Detail must be at most 1000 characters.")
    return trimmed or None


def _validate_due_date(due_date: object | None) -> date | None:
    if due_date is None:
        return None
    if not isinstance(due_date, date):
        raise TodoValidationError("Due date must be a date.")
    if due_date < date.today():
        raise TodoValidationError("Due date cannot be in the past.")
    return due_date


__all__ = [
    "create_todo",
    "update_todo",
    "toggle_completed",
    "delete_todo",
    "list_todos",
    "serialize_todo",
    "serialize_todos",
    "TodoServiceError",
    "TodoValidationError",
    "TodoNotFoundError",
]
