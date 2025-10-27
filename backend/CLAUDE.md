# Backend Guide

This file provides guidance to Claude Code when working with the Flask + SQLAlchemy backend.

## Architecture Overview

### Session Management

The backend uses a global SQLAlchemy engine and scoped session factory initialized in `app/main.py`. Sessions are managed per-request via Flask's `g` object and automatically committed/rolled back via `teardown_appcontext` hooks in `_register_session_hooks`.

### Database Access Pattern

- `get_session()` returns the current request-scoped session (or creates one outside app context for tests)
- `session_scope()` context manager provides transactional scope for scripts/tests
- Tests use SQLite in-memory databases configured via `conftest.py`

### API Structure

- All API routes are under `/api` prefix (defined in `app/routes/__init__.py`)
- Feature routes are organized as Flask Blueprints (e.g., `todo_bp` at `/api/todos`)
- Routes delegate business logic to service layer (`app/services/`)
- Models use SQLAlchemy ORM with a shared `Base` class (`app/models/__init__.py`)

### Error Handling

Global error handlers in `app/main.py` catch `HTTPException` and generic `Exception`, returning JSON responses with standardized error structure.

## Development Commands

### Running the Backend

```bash
# With Docker Compose (recommended)
make up                   # Starts all services including backend

# Standalone (without Docker)
poetry -C backend run flask --app app.main run --host 0.0.0.0 --port 5000
```

### Testing

```bash
# Run all backend tests
poetry -C backend run pytest

# Run specific test file
poetry -C backend run pytest tests/<path>

# Run with coverage
poetry -C backend run pytest --cov=app --cov-report=html
```

### Linting and Formatting

```bash
# Linting
poetry -C backend run flake8 app backend
poetry -C backend run mypy app

# Formatting
poetry -C backend run black app backend
poetry -C backend run isort app backend
```

### Dependencies

```bash
# Install dependencies
poetry -C backend install

# Add new dependency
poetry -C backend add <package>

# Add development dependency
poetry -C backend add --group dev <package>
```

## Code Style Guidelines

### General Rules

- **Line length**: 150 characters (Black, isort, flake8)
- **Python version**: 3.12+ features encouraged
- **Type hints**: Preferred but `disallow_untyped_defs=false` in mypy config
- **Import order**: stdlib, third-party, first-party (`app`)

### Validation with Pydantic

The backend uses **Pydantic v2** for request/response validation:

#### Schema Definition (`app/schemas/`)

- All request/response schemas inherit from `pydantic.BaseModel`
- Use `@field_validator` for custom field validation
- Use `@model_validator` for cross-field validation
- Pydantic validates automatically on instantiation

#### Route Layer (`app/routes/`)

- Parse JSON requests with `Schema.model_validate(payload)`
- Pydantic's `ValidationError` is caught and converted to custom error types for consistent error responses
- No manual validation logic in routes

#### Service Layer (`app/services/`)

- Receive validated Pydantic models as input
- No need to call `.validate()` - validation happens at instantiation
- Business logic operates on validated data

#### Example

```python
# Schema definition
class TodoCreateData(BaseModel):
    title: str

    @field_validator("title")
    @classmethod
    def validate_title(cls, v: str) -> str:
        trimmed = v.strip()
        if not trimmed:
            raise TodoValidationError("Title is required")
        return trimmed

# Route handler
@todo_bp.post("")
def create_todo():
    payload = request.get_json()
    data = TodoCreateData.model_validate(payload)  # Auto-validates
    return service.create_todo(data)
```

## Logging

The backend uses a configured logging system with automatic file rotation and environment-based settings.

### Configuration

Logging is configured in `app/logger.py` and initialized in `app/main.py`. Settings are loaded from environment variables:

- **LOG_LEVEL**: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
  - Development/Testing: `DEBUG` (default)
  - Production: `INFO` (default)
- **LOG_DIR**: Directory for log files (default: `backend/logs`)
- **FLASK_ENV**: Environment mode (`development`, `testing`, `production`)

### Log Files

- Location: `backend/logs/app.log`
- Rotation: Daily at midnight
- Retention: 5 backup files
- Format: `2025-10-27 10:30:45 - app.services.todo - INFO - Todo created: id=1`

### Usage in Code

Use Python's standard `logging` module in any layer. All application files include comprehensive logging at appropriate levels.

**Basic Setup**:
```python
import logging

logger = logging.getLogger(__name__)
```

**Log Levels and Guidelines**:
- **DEBUG**: Detailed execution flow, database queries, method parameters
- **INFO**: Important operations completed, request/response summaries
- **WARNING**: Validation errors, not-found errors, fallback behaviors
- **ERROR**: Exceptions, unexpected failures, transaction rollbacks

**Examples by Layer**:

**Routes Layer** (`app/routes/`):
```python
# Request logging
logger.info(f"POST /api/todos - Creating new todo")

# Success logging
logger.info(f"POST /api/todos - Todo created successfully: id={todo.id}")

# Validation error logging
logger.warning(f"POST /api/todos - Validation error: {exc}")
```

**Service Layer** (`app/services/`):
```python
# Operation start
logger.debug(f"Creating todo: title='{data.title}', due_date={data.due_date}")

# Business logic
logger.info(f"Todo created successfully: id={result.id}, title='{result.title}'")

# Not found warning
logger.warning(f"Todo not found for update: id={todo_id}")
```

**Repository Layer** (`app/repositories/`):
```python
# Database query
logger.debug("Querying active todos from database")

# Query result
logger.debug(f"Retrieved {len(result)} active todos from database")

# Save operation
logger.debug(f"Saving new todo to database: title='{todo.title}'")
logger.debug(f"Todo saved to database: id={todo.id}")
```

**Database Layer** (`app/database.py`):
```python
# Connection initialization
logger.info(f"Initializing database engine: {safe_uri}")

# Transaction management
logger.debug("Starting database transaction scope")
logger.error(f"Database transaction failed, rolling back: {e}", exc_info=True)
```

**Error Handling** (`app/main.py`):
```python
# HTTP exceptions
app.logger.warning(f"HTTP exception: {err.code} - {err.description}")

# Unhandled errors
app.logger.error(f"Unhandled application error: {type(err).__name__}: {err}", exc_info=True)
```

### Environment-Specific Behavior

- **Development** (`FLASK_ENV=development`):
  - Logs to file AND console
  - Log level: DEBUG
- **Testing** (`FLASK_ENV=testing`):
  - Logs to console only (no file rotation issues)
  - Log level: DEBUG
- **Production** (`FLASK_ENV=production`):
  - Logs to file only
  - Log level: INFO

## Database Configuration

**Default connection**: `mysql+pymysql://user:password@db:3306/app_db`

Override via `DATABASE_URL` environment variable. Backend loads `.env` file from `backend/.env` if it exists (`app/config.py`).

### Environment Variables

Create a `backend/.env` file for local development:

```env
DATABASE_URL=mysql+pymysql://user:password@localhost:3306/app_db
FLASK_ENV=development
```

## Feature Implementation Example: TODO

The TODO feature demonstrates the full backend stack:

### Files

- **Model**: `app/models/todo.py` - SQLAlchemy ORM model
- **Schema**: `app/schemas/todo_schemas.py` - Pydantic request/response schemas
- **Routes**: `app/routes/todo_routes.py` - Flask Blueprint with endpoints
- **Service**: `app/services/todo_service.py` - Business logic layer
- **Tests**: `backend/tests/test_todo*.py` - Unit and integration tests

### API Endpoints

- `GET /api/todos` - List todos (supports `?status=active|completed|all` query param)
- `POST /api/todos` - Create todo
- `PATCH /api/todos/<id>` - Update todo
- `DELETE /api/todos/<id>` - Delete todo
- `PATCH /api/todos/<id>/complete` - Toggle todo completion status

### Implementation Pattern

1. **Define Model** (`app/models/`)
   ```python
   class Todo(Base):
       __tablename__ = "todos"
       id = Column(Integer, primary_key=True)
       title = Column(String(255), nullable=False)
       is_completed = Column(Boolean, default=False)
   ```

2. **Define Schemas** (`app/schemas/`)
   ```python
   class TodoCreateData(BaseModel):
       title: str

   class TodoResponse(BaseModel):
       id: int
       title: str
       is_completed: bool
   ```

3. **Implement Service** (`app/services/`)
   ```python
   def create_todo(data: TodoCreateData) -> TodoResponse:
       session = get_session()
       todo = Todo(title=data.title)
       session.add(todo)
       session.commit()
       return TodoResponse.model_validate(todo, from_attributes=True)
   ```

4. **Create Routes** (`app/routes/`)
   ```python
   @todo_bp.post("")
   def create_todo():
       payload = request.get_json()
       data = TodoCreateData.model_validate(payload)
       result = service.create_todo(data)
       return result.model_dump(), 201
   ```

5. **Write Tests** (`backend/tests/`)
   ```python
   def test_create_todo(client):
       response = client.post("/api/todos", json={"title": "Test"})
       assert response.status_code == 201
   ```
