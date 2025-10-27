from __future__ import annotations

import logging
from typing import Sequence

from sqlalchemy.orm import Session
from werkzeug.exceptions import HTTPException

from app.models.todo import Todo
from app.repositories.todo_repository import TodoRepository
from app.schemas.todo import TodoCreateData, TodoStatus, TodoToggleData, TodoUpdateData

logger = logging.getLogger(__name__)


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
        logger.debug(f"Listing todos with status filter: {status}")
        if status == "all":
            result = self.repository.find_all()
        elif status == "active":
            result = self.repository.find_active()
        elif status == "completed":
            result = self.repository.find_completed()
        else:
            # This should not happen due to type constraints, but handle it anyway
            logger.warning(f"Invalid status '{status}' provided, defaulting to 'active'")
            result = self.repository.find_active()
        logger.debug(f"Listed {len(result)} todos with status filter: {status}")
        return result

    def create_todo(self, data: TodoCreateData) -> Todo:
        """Create a new todo with validated data."""
        logger.debug(f"Creating todo: title='{data.title}', due_date={data.due_date}")
        # Pydantic validates on instantiation, no need to call validate()
        todo = Todo(
            title=data.title,
            detail=data.detail,
            due_date=data.due_date,
        )
        result = self.repository.save(todo)
        logger.info(f"Todo created successfully: id={result.id}, title='{result.title}'")
        return result

    def update_todo(self, todo_id: int, data: TodoUpdateData) -> Todo:
        """Update an existing todo with validated data."""
        logger.debug(f"Updating todo: id={todo_id}")
        todo = self.repository.find_by_id(todo_id)
        if todo is None:
            logger.warning(f"Todo not found for update: id={todo_id}")
            raise TodoNotFoundError()

        if not data.has_updates():
            from app.schemas.todo import TodoValidationError

            logger.warning(f"No fields provided for update: id={todo_id}")
            raise TodoValidationError("No fields provided for update.")

        # Pydantic validates on instantiation
        updates = data.to_updates()
        logger.debug(f"Updating todo fields: id={todo_id}, fields={list(updates.keys())}")

        if "title" in updates:
            todo.title = str(updates["title"])

        if "detail" in updates:
            todo.detail = updates["detail"]  # type: ignore

        if "due_date" in updates:
            todo.due_date = updates["due_date"]  # type: ignore

        result = self.repository.update(todo)
        logger.info(f"Todo updated successfully: id={todo_id}")
        return result

    def toggle_completed(self, todo_id: int, data: TodoToggleData) -> Todo:
        """Toggle the completion status of a todo."""
        logger.debug(f"Toggling todo completion: id={todo_id}, is_completed={data.is_completed}")
        todo = self.repository.find_by_id(todo_id)
        if todo is None:
            logger.warning(f"Todo not found for toggle: id={todo_id}")
            raise TodoNotFoundError()

        # Pydantic validates on instantiation
        todo.is_completed = data.is_completed

        result = self.repository.update(todo)
        logger.info(f"Todo completion toggled successfully: id={todo_id}, is_completed={data.is_completed}")
        return result

    def delete_todo(self, todo_id: int) -> None:
        """Delete a todo by ID."""
        logger.debug(f"Deleting todo: id={todo_id}")
        todo = self.repository.find_by_id(todo_id)
        if todo is None:
            logger.warning(f"Todo not found for deletion: id={todo_id}")
            raise TodoNotFoundError()

        self.repository.delete(todo)
        logger.info(f"Todo deleted successfully: id={todo_id}")


__all__ = [
    "TodoService",
    "TodoServiceError",
    "TodoNotFoundError",
]
