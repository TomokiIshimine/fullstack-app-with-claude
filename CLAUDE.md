# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is a full-stack monorepo containing a React + TypeScript frontend and a Flask + SQLAlchemy backend, currently implementing a TODO application. The project uses Docker Compose for local development with MySQL.

## Development Commands

### Setup and Installation
```bash
make install              # Install all dependencies (frontend via pnpm, backend via poetry)
make setup                # Full environment setup
```

### Running the Stack
```bash
make up                   # Start Docker containers (MySQL, frontend, backend)
make down                 # Stop Docker containers
```

### Individual Services (without Docker)
```bash
# Frontend (Vite dev server)
pnpm --dir frontend run dev --host 0.0.0.0 --port 5173

# Backend (Flask)
poetry -C backend run flask --app app.main run --host 0.0.0.0 --port 5000
```

### Testing
```bash
make test                 # Run all tests (frontend and backend)

# Frontend only
pnpm --dir frontend run test              # Run all frontend tests
pnpm --dir frontend run test <file>       # Run specific test file

# Backend only
poetry -C backend run pytest                    # Run all backend tests
poetry -C backend run pytest tests/<path>       # Run specific test file
```

### Linting and Formatting
```bash
make lint                 # Lint both frontend and backend
make format               # Format both frontend and backend

# Frontend only
pnpm --dir frontend run lint
pnpm --dir frontend run format

# Backend only
poetry -C backend run flake8 app backend
poetry -C backend run mypy app
poetry -C backend run black app backend
poetry -C backend run isort app backend
```

## Architecture Overview

### Backend Architecture (Flask + SQLAlchemy)

**Session Management**: The backend uses a global SQLAlchemy engine and scoped session factory initialized in `app/main.py`. Sessions are managed per-request via Flask's `g` object and automatically committed/rolled back via `teardown_appcontext` hooks in `_register_session_hooks`.

**Database Access Pattern**:
- `get_session()` returns the current request-scoped session (or creates one outside app context for tests)
- `session_scope()` context manager provides transactional scope for scripts/tests
- Tests use SQLite in-memory databases configured via `conftest.py`

**API Structure**:
- All API routes are under `/api` prefix (defined in `app/routes/__init__.py`)
- Feature routes are organized as Flask Blueprints (e.g., `todo_bp` at `/api/todos`)
- Routes delegate business logic to service layer (`app/services/`)
- Models use SQLAlchemy ORM with a shared `Base` class (`app/models/__init__.py`)

**Error Handling**: Global error handlers in `app/main.py` catch `HTTPException` and generic `Exception`, returning JSON responses with standardized error structure.

### Frontend Architecture (React + TypeScript)

**Build System**: Vite with TypeScript. Uses `@` alias pointing to `src/` directory (configured in `vite.config.ts`).

**API Communication**: Vite dev server proxies `/api/*` requests to backend (target configured via `VITE_API_PROXY` env var, defaults to `http://localhost:5000`). In Docker, this is set to `http://backend:5000`.

**Component Organization**:
- `pages/` - Page-level components
- `components/` - Reusable UI components
- `styles/` - CSS files (e.g., `todo.css`)

**Testing**: Uses Vitest with Testing Library. Test runner script (`scripts/test.mjs`) wraps vitest with single-threaded execution.

### Docker Compose Setup

Three services: `frontend` (Node 20), `backend` (Python 3.12), `db` (MySQL 8.0). All services share the `app-network` bridge network. The backend service waits for database via health checks. MySQL data persists in named volume `mysql-data`.

## Project-Specific Conventions

### Commit Messages
Follow [Conventional Commits](https://www.conventionalcommits.org/) with format `<type>(<scope>): <subject>`. Use `commitlint` via:
```bash
pnpm -C frontend run commitlint -- --help
```

### Backend Code Style
- Line length: 150 characters (Black, isort, flake8)
- Python 3.12+ features encouraged
- Type hints preferred but `disallow_untyped_defs=false` in mypy config
- Import order: stdlib, third-party, first-party (`app`)

### Frontend Code Style
- ESLint with TypeScript rules, max-warnings=0
- Prettier for formatting (via `scripts/format.mjs`)

## Database Configuration

**Default connection**: `mysql+pymysql://user:password@db:3306/app_db`

Override via `DATABASE_URL` environment variable. Backend loads `.env` file from `backend/.env` if it exists (`app/config.py`).

## Current Feature: TODO Application

The TODO feature demonstrates the full stack:
- **Backend**: CRUD operations in `app/routes/todo_routes.py`, business logic in `app/services/todo_service.py`, model in `app/models/todo.py`
- **Frontend**: TODO page in `pages/TodoListPage.tsx`, form/list/filter components in `components/`
- **API endpoints**: GET/POST `/api/todos`, PATCH/DELETE `/api/todos/<id>`, PATCH `/api/todos/<id>/complete`
- **Filtering**: Query param `?status=active|completed|all` on GET endpoint
