from __future__ import annotations

from datetime import date, datetime
from typing import TYPE_CHECKING, Any, Dict, Iterable, Literal

from pydantic import BaseModel, Field, field_validator

if TYPE_CHECKING:
    from app.models.todo import Todo

TodoStatus = Literal["all", "active", "completed"]

MAX_TITLE_LENGTH = 120
MAX_DETAIL_LENGTH = 1000
VALID_STATUSES: tuple[TodoStatus, ...] = ("all", "active", "completed")


class TodoValidationError(ValueError):
    """Raised when todo data validation fails."""

    pass


class TodoCreateData(BaseModel):
    """Schema for creating a new todo."""

    title: str
    detail: str | None = None
    due_date: date | None = None

    @field_validator("title")
    @classmethod
    def validate_title(cls, v: str) -> str:
        """Validate and normalize the title."""
        if not isinstance(v, str):
            raise TodoValidationError("Title must be a string.")
        trimmed = v.strip()
        if not trimmed:
            raise TodoValidationError("Title must be between 1 and 120 characters.")
        if len(trimmed) > MAX_TITLE_LENGTH:
            raise TodoValidationError("Title must be between 1 and 120 characters.")
        return trimmed

    @field_validator("detail")
    @classmethod
    def validate_detail(cls, v: str | None) -> str | None:
        """Validate and normalize the detail."""
        if v is None:
            return None
        if not isinstance(v, str):
            raise TodoValidationError("Detail must be a string.")
        trimmed = v.strip()
        if len(trimmed) > MAX_DETAIL_LENGTH:
            raise TodoValidationError("Detail must be at most 1000 characters.")
        return trimmed or None

    @field_validator("due_date")
    @classmethod
    def validate_due_date(cls, v: date | None) -> date | None:
        """Validate the due date."""
        if v is None:
            return None
        if not isinstance(v, date):
            raise TodoValidationError("Due date must be a date.")
        if v < date.today():
            raise TodoValidationError("Due date cannot be in the past.")
        return v


class TodoUpdateData(BaseModel):
    """Schema for updating an existing todo. All fields are optional."""

    title: str | None = None
    detail: str | None = Field(default=None, validate_default=False)
    due_date: date | None = Field(default=None, validate_default=False)

    # Track which fields were explicitly set
    _fields_set: set[str] = set()

    def model_post_init(self, __context: Any) -> None:
        """Store which fields were explicitly set."""
        self._fields_set = set(self.model_fields_set)

    @field_validator("title")
    @classmethod
    def validate_title(cls, v: str | None) -> str | None:
        """Validate and normalize the title if provided."""
        if v is None:
            return None
        if not isinstance(v, str):
            raise TodoValidationError("Title must be a string.")
        trimmed = v.strip()
        if not trimmed:
            raise TodoValidationError("Title must be between 1 and 120 characters.")
        if len(trimmed) > MAX_TITLE_LENGTH:
            raise TodoValidationError("Title must be between 1 and 120 characters.")
        return trimmed

    @field_validator("detail")
    @classmethod
    def validate_detail(cls, v: str | None) -> str | None:
        """Validate and normalize the detail if provided."""
        if v is None:
            return None
        if not isinstance(v, str):
            raise TodoValidationError("Detail must be a string or null.")
        trimmed = v.strip()
        if len(trimmed) > MAX_DETAIL_LENGTH:
            raise TodoValidationError("Detail must be at most 1000 characters.")
        return trimmed or None

    @field_validator("due_date")
    @classmethod
    def validate_due_date(cls, v: date | None) -> date | None:
        """Validate the due date if provided."""
        if v is None:
            return None
        if not isinstance(v, date):
            raise TodoValidationError("Due date must be a date or null.")
        if v < date.today():
            raise TodoValidationError("Due date cannot be in the past.")
        return v

    def to_updates(self) -> Dict[str, Any]:
        """Return only the fields that were explicitly set."""
        updates: Dict[str, Any] = {}
        if "title" in self._fields_set:
            updates["title"] = self.title
        if "detail" in self._fields_set:
            updates["detail"] = self.detail
        if "due_date" in self._fields_set:
            updates["due_date"] = self.due_date
        return updates

    def has_updates(self) -> bool:
        """Check if any fields were explicitly set."""
        return len(self._fields_set) > 0


class TodoToggleData(BaseModel):
    """Schema for toggling todo completion status."""

    model_config = {"strict": True}

    is_completed: bool

    @field_validator("is_completed")
    @classmethod
    def validate_is_completed(cls, v: bool) -> bool:
        """Validate that is_completed is a boolean."""
        if not isinstance(v, bool):
            raise TodoValidationError("is_completed must be a boolean.")
        return v


class TodoResponse(BaseModel):
    """Schema for todo response."""

    id: int
    title: str
    detail: str | None
    due_date: date | None
    is_completed: bool
    created_at: datetime
    updated_at: datetime

    @classmethod
    def from_model(cls, todo: "Todo") -> "TodoResponse":
        """Create a response schema from a Todo model."""
        return cls(
            id=todo.id,
            title=todo.title,
            detail=todo.detail,
            due_date=todo.due_date,
            is_completed=todo.is_completed,
            created_at=todo.created_at,
            updated_at=todo.updated_at,
        )

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary with proper serialization."""
        return {
            "id": self.id,
            "title": self.title,
            "detail": self.detail,
            "due_date": self.due_date.isoformat() if self.due_date else None,
            "is_completed": self.is_completed,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }


def serialize_todo(todo: "Todo") -> Dict[str, Any]:
    """Convert a Todo model to a dictionary."""
    schema = TodoResponse.from_model(todo)
    return schema.to_dict()


def serialize_todos(todos: Iterable["Todo"]) -> list[Dict[str, Any]]:
    """Convert a sequence of Todo models to a list of dictionaries."""
    return [serialize_todo(todo) for todo in todos]


def validate_status(status: str | None) -> TodoStatus:
    """Validate and normalize the status filter."""
    if status is None:
        return "active"
    if status not in VALID_STATUSES:
        raise TodoValidationError("Invalid status filter.")
    return status  # type: ignore


__all__ = [
    "TodoCreateData",
    "TodoUpdateData",
    "TodoToggleData",
    "TodoResponse",
    "TodoStatus",
    "TodoValidationError",
    "serialize_todo",
    "serialize_todos",
    "validate_status",
]
