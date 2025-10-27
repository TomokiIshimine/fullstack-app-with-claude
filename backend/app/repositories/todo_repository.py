from __future__ import annotations

import logging
from typing import Sequence

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.todo import Todo

logger = logging.getLogger(__name__)


class TodoRepository:
    """Repository for Todo data access operations."""

    def __init__(self, session: Session):
        self.session = session

    def find_all(self) -> Sequence[Todo]:
        """Retrieve all todos ordered by due date and created time."""
        stmt = select(Todo).order_by(Todo.due_date.asc(), Todo.created_at.asc())
        result = list(self.session.scalars(stmt))
        logger.debug(f"Retrieved {len(result)} todos from database")
        return result

    def find_active(self) -> Sequence[Todo]:
        """Retrieve active (not completed) todos."""
        stmt = select(Todo).where(Todo.is_completed.is_(False)).order_by(Todo.due_date.asc(), Todo.created_at.asc())
        result = list(self.session.scalars(stmt))
        logger.debug(f"Retrieved {len(result)} active todos from database")
        return result

    def find_completed(self) -> Sequence[Todo]:
        """Retrieve completed todos."""
        stmt = select(Todo).where(Todo.is_completed.is_(True)).order_by(Todo.due_date.asc(), Todo.created_at.asc())
        result = list(self.session.scalars(stmt))
        logger.debug(f"Retrieved {len(result)} completed todos from database")
        return result

    def find_by_id(self, todo_id: int) -> Todo | None:
        """Retrieve a todo by ID."""
        result = self.session.get(Todo, todo_id)
        if not result:
            logger.debug(f"Todo not found: id={todo_id}")
        return result

    def save(self, todo: Todo) -> Todo:
        """Save a new todo to the database."""
        self.session.add(todo)
        self.session.flush()
        self.session.refresh(todo)
        return todo

    def update(self, todo: Todo) -> Todo:
        """Update an existing todo."""
        self.session.flush()
        self.session.refresh(todo)
        return todo

    def delete(self, todo: Todo) -> None:
        """Delete a todo from the database."""
        self.session.delete(todo)
        self.session.flush()


__all__ = ["TodoRepository"]
