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
        logger.debug("Querying all todos from database")
        stmt = select(Todo).order_by(Todo.due_date.asc(), Todo.created_at.asc())
        result = list(self.session.scalars(stmt))
        logger.debug(f"Retrieved {len(result)} todos from database")
        return result

    def find_active(self) -> Sequence[Todo]:
        """Retrieve active (not completed) todos."""
        logger.debug("Querying active todos from database")
        stmt = select(Todo).where(Todo.is_completed.is_(False)).order_by(Todo.due_date.asc(), Todo.created_at.asc())
        result = list(self.session.scalars(stmt))
        logger.debug(f"Retrieved {len(result)} active todos from database")
        return result

    def find_completed(self) -> Sequence[Todo]:
        """Retrieve completed todos."""
        logger.debug("Querying completed todos from database")
        stmt = select(Todo).where(Todo.is_completed.is_(True)).order_by(Todo.due_date.asc(), Todo.created_at.asc())
        result = list(self.session.scalars(stmt))
        logger.debug(f"Retrieved {len(result)} completed todos from database")
        return result

    def find_by_id(self, todo_id: int) -> Todo | None:
        """Retrieve a todo by ID."""
        logger.debug(f"Querying todo by id: {todo_id}")
        result = self.session.get(Todo, todo_id)
        if result:
            logger.debug(f"Found todo: id={todo_id}")
        else:
            logger.info(f"Todo not found: id={todo_id}")
        return result

    def save(self, todo: Todo) -> Todo:
        """Save a new todo to the database."""
        logger.debug(f"Saving new todo to database: title='{todo.title}'")
        self.session.add(todo)
        self.session.flush()
        self.session.refresh(todo)
        logger.debug(f"Todo saved to database: id={todo.id}")
        return todo

    def update(self, todo: Todo) -> Todo:
        """Update an existing todo."""
        logger.debug(f"Updating todo in database: id={todo.id}")
        self.session.flush()
        self.session.refresh(todo)
        logger.debug(f"Todo updated in database: id={todo.id}")
        return todo

    def delete(self, todo: Todo) -> None:
        """Delete a todo from the database."""
        logger.debug(f"Deleting todo from database: id={todo.id}")
        self.session.delete(todo)
        self.session.flush()
        logger.debug(f"Todo deleted from database: id={todo.id}")


__all__ = ["TodoRepository"]
