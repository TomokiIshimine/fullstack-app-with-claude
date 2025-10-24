from __future__ import annotations

from typing import Sequence

from sqlalchemy.orm import Session
from werkzeug.exceptions import HTTPException

from app.models.todo import Todo
from app.repositories.todo_repository import TodoRepository
from app.schemas.todo import TodoCreateData, TodoStatus, TodoToggleData, TodoUpdateData


class TodoServiceError(HTTPException):
    code = 500
    description = "TODO service error"

    def __init__(self, message: str | None = None):
        super().__init__(description=message or self.description)


class TodoNotFoundError(TodoServiceError):
    code = 404
    description = "Todo not found."


class TodoService:
    """Service layer for todo business logic."""

    def __init__(self, session: Session):
        self.repository = TodoRepository(session)

    def list_todos(self, status: TodoStatus = "active") -> Sequence[Todo]:
        """Retrieve todos filtered by status."""
        if status == "all":
            return self.repository.find_all()
        elif status == "active":
            return self.repository.find_active()
        elif status == "completed":
            return self.repository.find_completed()
        else:
            # This should not happen due to type constraints, but handle it anyway
            return self.repository.find_active()

    def create_todo(self, data: TodoCreateData) -> Todo:
        """Create a new todo with validated data."""
        # Pydantic validates on instantiation, no need to call validate()
        todo = Todo(
            title=data.title,
            detail=data.detail,
            due_date=data.due_date,
        )
        return self.repository.save(todo)

    def update_todo(self, todo_id: int, data: TodoUpdateData) -> Todo:
        """Update an existing todo with validated data."""
        todo = self.repository.find_by_id(todo_id)
        if todo is None:
            raise TodoNotFoundError()

        if not data.has_updates():
            from app.schemas.todo import TodoValidationError

            raise TodoValidationError("No fields provided for update.")

        # Pydantic validates on instantiation
        updates = data.to_updates()

        if "title" in updates:
            todo.title = str(updates["title"])

        if "detail" in updates:
            todo.detail = updates["detail"]  # type: ignore

        if "due_date" in updates:
            todo.due_date = updates["due_date"]  # type: ignore

        return self.repository.update(todo)

    def toggle_completed(self, todo_id: int, data: TodoToggleData) -> Todo:
        """Toggle the completion status of a todo."""
        todo = self.repository.find_by_id(todo_id)
        if todo is None:
            raise TodoNotFoundError()

        # Pydantic validates on instantiation
        todo.is_completed = data.is_completed

        return self.repository.update(todo)

    def delete_todo(self, todo_id: int) -> None:
        """Delete a todo by ID."""
        todo = self.repository.find_by_id(todo_id)
        if todo is None:
            raise TodoNotFoundError()

        self.repository.delete(todo)


__all__ = [
    "TodoService",
    "TodoServiceError",
    "TodoNotFoundError",
]
