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

The backend uses a comprehensive logging system with request tracing, sensitive data masking, automatic file rotation, and environment-based configuration.

### Architecture

The logging system is implemented in `app/logger.py` with the following components:

1. **Request Tracing**: Automatic UUID-based request ID generation for distributed tracing
2. **Sensitive Data Masking**: Automatic filtering of passwords, tokens, and secrets
3. **Structured Logging**: JSON format in production, human-readable text in development
4. **File Rotation**: Daily log rotation with 5-day retention
5. **Environment-Aware**: Different configurations for development, testing, and production

### Configuration

Logging is configured in `app/logger.py` and initialized in `app/main.py`. Settings are loaded from environment variables:

- **LOG_LEVEL**: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
  - Development/Testing: `DEBUG` (default)
  - Production: `INFO` (default)
- **LOG_DIR**: Directory for log files (default: `backend/logs`)
- **FLASK_ENV**: Environment mode (`development`, `testing`, `production`)

### Log Files

- **Location**: `backend/logs/app-YYYY-MM-DD.log` (e.g., `app-2025-10-27.log`)
- **Rotation**: Daily at midnight
- **Retention**: 5 backup files
- **Encoding**: UTF-8 (supports Japanese and other non-ASCII characters)

### Log Format

**Development/Testing (Text Format)**:
```
2025-10-27 10:30:45 - [660258eb-2348-4534-859c-c8629c69da74] - app.services.todo - INFO - Todo created: id=1
```

Format: `timestamp - [request_id] - logger_name - level - message`

**Production (JSON Format)**:
```json
{
  "timestamp": "2025-10-27T10:30:45.123456",
  "level": "INFO",
  "logger": "app.services.todo",
  "message": "Todo created: id=1",
  "request_id": "660258eb-2348-4534-859c-c8629c69da74"
}
```

For WARNING and ERROR levels, additional fields are included:
```json
{
  "timestamp": "2025-10-27T10:30:45.123456",
  "level": "ERROR",
  "logger": "app.services.todo",
  "message": "Failed to create todo",
  "request_id": "660258eb-2348-4534-859c-c8629c69da74",
  "file": "/app/app/services/todo_service.py",
  "line": 42,
  "function": "create_todo",
  "exception": "Traceback (most recent call last)..."
}
```

### Request Tracing

Each HTTP request is automatically assigned a unique UUID (`request_id`) for tracing:

- **Generation**: UUID v4 generated in `app/main.py` via `@app.before_request`
- **Storage**: Stored in Flask's `g.request_id` for the request lifetime
- **Propagation**: Automatically added to all log records via `RequestIDFilter`
- **Value**: Shows as `no-request` for logs outside request context (startup, teardown)

**Example request flow**:
```
2025-10-27 04:13:15 - [fa53eeb4-f88c-4f77-9f77-9ccad67e88b6] - app.routes.todo_routes - INFO - POST /api/todos - Creating new todo
2025-10-27 04:13:15 - [fa53eeb4-f88c-4f77-9f77-9ccad67e88b6] - app.services.todo_service - INFO - Todo created successfully: id=22
2025-10-27 04:13:15 - [fa53eeb4-f88c-4f77-9f77-9ccad67e88b6] - app.main - INFO - Request completed: POST /api/todos - status=201 - duration=19.52ms
```

### Performance Tracking

Request completion logs include timing information:

- **Metric**: `duration` field showing request processing time in milliseconds
- **Logging**: Automatically logged in `app/main.py` via `@app.after_request`
- **Format**: `Request completed: {method} {path} - status={code} - duration={ms}ms - request_id={uuid}`

**Example**:
```
Request completed: GET /api/todos - status=200 - duration=77.57ms - request_id=660258eb-2348-4534-859c-c8629c69da74
```

### Sensitive Data Masking

The `SensitiveDataFilter` automatically masks sensitive information in log messages:

**Masked Patterns**:
- `password`: `password='secret123'` → `password='***'`
- `token`: `token=abc123xyz` → `token=***`
- `api_key` / `api-key`: `api_key: sk-123456` → `api_key: ***`
- `secret`: `secret="mysecret"` → `secret="***"`
- `authorization`: `Authorization: Bearer token123` → `Authorization: Bearer ***`

**Implementation**: Applied to all log records via filter, works with both message strings and format args.

**Example**:
```python
# Code
logger.info(f"Database URI: {database_uri}")

# Output (if URI contains password)
Database URI: mysql+pymysql://user:***@db:3306/app_db
```

### Usage in Code

Use Python's standard `logging` module in any layer. The logging system automatically handles request tracing and sensitive data masking.

**Basic Setup**:
```python
import logging

logger = logging.getLogger(__name__)
```

**Log Levels and Guidelines**:

- **DEBUG**: Detailed execution flow, database queries, performance metrics
  - Use sparingly to avoid noise
  - Avoid logging routine operations that happen on every request
  - Good for: Complex algorithm steps, detailed state information

- **INFO**: Important operations completed, request/response summaries, state changes
  - Business-level operations (e.g., "Todo created", "User logged in")
  - Request lifecycle events (start, completion with timing)
  - System initialization and configuration

- **WARNING**: Validation errors, not-found errors, deprecated features, fallback behaviors
  - Recoverable errors (e.g., invalid input, missing optional data)
  - Business rule violations
  - Rollback operations

- **ERROR**: Exceptions, unexpected failures, transaction failures, system errors
  - Always include `exc_info=True` to capture stack traces
  - Use for unrecoverable errors that require investigation
  - Database failures, external service failures

**Examples by Layer**:

**Routes Layer** (`app/routes/`):
```python
# Request start (INFO)
logger.info(f"POST /api/todos - Creating new todo")

# Success (INFO)
logger.info(f"POST /api/todos - Todo created successfully: id={todo.id}")

# Validation error (WARNING)
logger.warning(f"POST /api/todos - Validation error: {exc}")

# Unexpected error (ERROR)
logger.error(f"POST /api/todos - Unexpected error: {exc}", exc_info=True)
```

**Service Layer** (`app/services/`):
```python
# Business operation success (INFO)
logger.info(f"Todo created successfully: id={result.id}, title='{result.title}'")

# Not found (WARNING)
logger.warning(f"Todo not found for update: id={todo_id}")

# Business logic error (ERROR)
logger.error(f"Failed to create todo: {exc}", exc_info=True)
```

**Repository Layer** (`app/repositories/`):
```python
# Query result (DEBUG) - only when investigating issues
logger.debug(f"Retrieved {len(result)} active todos from database")

# Complex query (DEBUG)
logger.debug(f"Executing complex query with filters: {filters}")
```

**Database Layer** (`app/database.py`):
```python
# Initialization (INFO)
logger.info(f"Initializing database engine: {safe_uri}")

# Transaction scope (DEBUG) - for session_scope() context manager
logger.debug("Starting database transaction scope")

# Transaction failure (ERROR)
logger.error(f"Database transaction failed, rolling back: {e}", exc_info=True)
```

**Error Handling** (`app/main.py`):
```python
# HTTP exceptions (WARNING)
app.logger.warning(f"HTTP exception: {err.code} - {err.description}")

# Unhandled errors (ERROR)
app.logger.error(f"Unhandled application error: {type(err).__name__}: {err}", exc_info=True)
```

### Environment-Specific Behavior

**Development** (`FLASK_ENV=development`):
- **Format**: Text format with color support (via ANSI codes from werkzeug)
- **Output**: File (`logs/app-YYYY-MM-DD.log`) AND console
- **Log Level**: DEBUG
- **Werkzeug**: INFO level (shows all HTTP requests)
- **Request ID**: Included in all logs

**Testing** (`FLASK_ENV=testing`):
- **Format**: Text format
- **Output**: Console only (avoids file rotation issues in tests)
- **Log Level**: DEBUG
- **Werkzeug**: Same as root logger level
- **Request ID**: Included when available

**Production** (`FLASK_ENV=production`):
- **Format**: JSON (structured logging for log aggregation tools)
- **Output**: File only (`logs/app-YYYY-MM-DD.log`)
- **Log Level**: INFO (reduces noise)
- **Werkzeug**: WARNING level (only errors, no routine HTTP logs)
- **Request ID**: Included in all logs

### Best Practices

1. **Don't log on every request**: Avoid DEBUG logs that run on every request (e.g., session creation)
2. **Use request_id**: All logs automatically include request_id for tracing
3. **Mask sensitive data**: The filter handles common patterns, but avoid logging raw user input
4. **Include context**: Add relevant IDs, states, and values to log messages
5. **Use exc_info**: Always add `exc_info=True` to ERROR logs from exception handlers
6. **Avoid duplicate logs**: Don't log the same information at multiple layers
7. **Keep it concise**: Log messages should be clear and actionable

## Database Configuration

**Default connection**: `mysql+pymysql://user:password@db:3306/app_db`

The backend supports two connection modes:
1. **Standard Connection** (default): Direct connection using `DATABASE_URL`
2. **Cloud SQL Connector**: Secure connection to Google Cloud SQL with SSL/TLS and IAM authentication support

Backend loads `.env` file from `backend/.env` if it exists (`app/config.py`).

### Environment Variables

#### Standard Connection Mode (Local Development)

Create a `backend/.env` file for local development:

```env
DATABASE_URL=mysql+pymysql://user:password@localhost:3306/app_db
FLASK_ENV=development
```

#### Cloud SQL Connector Mode (Production/Cloud)

For Google Cloud SQL connections with enhanced security:

```env
# Enable Cloud SQL Connector
USE_CLOUD_SQL_CONNECTOR=true

# Cloud SQL connection details
CLOUDSQL_INSTANCE=project-id:region:instance-name
DB_USER=your-db-user
DB_NAME=your-database-name

# IP type: PRIVATE (default) or PUBLIC
# Use PRIVATE when connecting via VPC (recommended for security)
# Use PUBLIC when connecting from outside GCP
CLOUDSQL_IP_TYPE=PRIVATE

# Authentication method (choose one):
# Option 1: IAM Authentication (recommended for GCP environments)
ENABLE_IAM_AUTH=true

# Option 2: Password Authentication
ENABLE_IAM_AUTH=false
DB_PASS=your-db-password

# Optional: Connection pool configuration
DB_POOL_SIZE=5           # Default: 5
DB_MAX_OVERFLOW=10       # Default: 10
```

**Authentication Methods:**

- **IAM Authentication** (`ENABLE_IAM_AUTH=true`):
  - Uses Google Cloud IAM for authentication
  - No password required
  - Recommended for Cloud Run, Cloud Functions, GKE
  - User must have Cloud SQL Client role
  - Example user: `serviceaccount@project.iam`

- **Password Authentication** (`ENABLE_IAM_AUTH=false`):
  - Traditional username/password authentication
  - Requires `DB_PASS` environment variable
  - Useful for local testing or non-GCP environments

**Connection Security:**

The Cloud SQL Connector provides:
- Automatic SSL/TLS encryption
- Automatic credential refresh for IAM auth
- Connection pooling and retry logic
- No need to manage SSL certificates manually

**Installation:**

Cloud SQL Connector dependencies are included in `pyproject.toml`:
```toml
cloud-sql-python-connector[pymysql] (>=1.0,<2.0)
```

### Schema Management

The project uses **three approaches** for database schema management:

#### 1. Docker Compose Initialization (New Environments)

When Docker starts with an empty volume, `infra/mysql/init/001_init.sql` automatically creates all tables:

```bash
make up                   # Starts Docker, MySQL initializes automatically
```

This SQL file contains the complete schema and is the **single source of truth** for initial setup.

#### 2. SQL Migrations (Schema Changes to Existing Databases)

For modifying existing database schemas, use SQL migration files:

**Apply migrations (Local Development):**
```bash
poetry -C backend run python scripts/apply_sql_migrations.py
```

**Migration Features:**
- Reads all `.sql` files from `infra/mysql/migrations/`
- Tracks applied migrations in `schema_migrations` table
- Prevents duplicate execution (idempotent)
- Validates file integrity with SHA256 checksums
- Executes migrations in alphabetical order

**CI/CD Environments:**

Migrations are **automatically applied** during deployment:
- GitHub Actions triggers `scripts/run_migrations.sh` via Cloud Run Job
- Step 1: Create tables (new tables only)
- Step 2: Apply SQL migrations (schema changes)
- Step 3: Grant IAM permissions
- Application deploys only after successful migration

**Migration Tracking Table:**

The `schema_migrations` table records all applied migrations:

```python
class SchemaMigration(Base):
    __tablename__ = "schema_migrations"

    id: Mapped[int]                    # Primary key
    filename: Mapped[str]               # Migration file name
    checksum: Mapped[str]               # SHA256 hash for integrity
    applied_at: Mapped[datetime]        # Application timestamp
```

#### 3. Python Scripts (Development & Testing)

For development, testing, or manual schema updates:

**Create/recreate all tables:**
```bash
make db-init
# Or directly:
poetry -C backend run python scripts/create_tables.py
```

This script uses SQLAlchemy models to create tables via `Base.metadata.create_all()`.

**Create a test user:**
```bash
make db-create-user EMAIL=user@example.com PASSWORD=password123
# Or directly:
poetry -C backend run python scripts/create_user.py user@example.com password123
```

**Reset database (destructive):**
```bash
make db-reset             # Drops Docker volume and recreates database
```

#### Schema Update Workflow

When modifying database schema:

1. Update SQLAlchemy model in `app/models/`
2. Update `infra/mysql/init/001_init.sql` to match (for new installations)
3. Create migration SQL in `infra/mysql/migrations/` with sequential numbering
   - Example: `002_add_status_column.sql`
4. Test migration locally:
   ```bash
   poetry -C backend run python scripts/apply_sql_migrations.py
   make test  # Verify application works
   ```
5. Commit all changes together
6. CI/CD automatically applies migration on deployment

**Important Notes:**
- SQLAlchemy models and SQL files must be kept in sync manually
- Migration files are **immutable** - never modify after application
- New changes require new migration files
- Migrations are automatically applied in production (no manual intervention)
- For detailed migration workflow, see `infra/mysql/migrations/README.md`

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
