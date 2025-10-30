# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is a full-stack monorepo containing a React + TypeScript frontend and a Flask + SQLAlchemy backend, currently implementing a TODO application. The project uses Docker Compose for local development with MySQL.

**For detailed documentation:**
- Backend: See [backend/CLAUDE.md](backend/CLAUDE.md)
- Frontend: See [frontend/CLAUDE.md](frontend/CLAUDE.md)

## Documentation

Comprehensive documentation is available in the `docs/` directory:

**For new developers, recommended reading order:**
1. **[Development Guide](docs/00_development.md)** - Start here: setup, commands, troubleshooting
2. **[System Architecture](docs/01_system-architecture.md)** - Overall system design and tech stack
3. **[Authentication & Authorization](docs/02_authentication-authorization.md)** - Security fundamentals
4. **[Feature List](docs/03_feature-list.md)** - Implemented features and API endpoints

**Specialized documentation:**
- **[Database Design](docs/04_database-design.md)** - Schema, ER diagrams, table definitions
- **[API Design Guide](docs/05_api-design-guide.md)** - REST API conventions and best practices
- **[Testing Strategy](docs/06_testing-strategy.md)** - Test levels, coverage goals, test data management
- **[Documentation Guide](docs/07_documentation-guide.md)** - Overview of all documentation (meta-document)
- **[E2E Test List](docs/08_e2e-test-list.md)** - E2E test scenarios and implementation guide

## Quick Start

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

### Linting and Formatting
```bash
make lint                 # Lint both frontend and backend
make format               # Format both frontend and backend
```

## Testing

### Run All Tests
```bash
make test                 # Run all tests (frontend and backend) with coverage
```

### Test Variants
```bash
make test-frontend        # Run only frontend tests
make test-backend         # Run only backend tests
make test-fast            # Run tests without coverage (faster)
make test-cov             # Run tests with coverage and generate HTML report
make test-parallel        # Run backend tests in parallel
```

### Run Individual Tests
```bash
# Frontend - run specific test file
pnpm --dir frontend run test src/lib/api/todos.test.ts

# Backend - run specific test file
poetry -C backend run pytest backend/tests/routes/test_todo_routes.py

# Backend - run specific test function
poetry -C backend run pytest backend/tests/routes/test_todo_routes.py::test_create_todo
```

**For detailed testing strategy, see [docs/06_testing-strategy.md](docs/06_testing-strategy.md)**

## Database Management

### Quick Commands
```bash
make db-init              # Initialize/recreate all tables
make db-create-user EMAIL=user@example.com PASSWORD=password123  # Create test user
make db-reset             # Reset database (⚠️ destructive - drops all data)
```

**For detailed database schema and management, see:**
- [docs/04_database-design.md](docs/04_database-design.md) - Complete schema documentation
- [docs/00_development.md](docs/00_development.md) - Database setup workflows

## Pre-commit Hooks

Pre-commit hooks run lightweight checks (formatting, linting) before each commit. Heavy checks (mypy, pytest, vitest) are excluded for fast commits.

```bash
make pre-commit-install   # Install hooks (run once after clone)
make pre-commit-run       # Manually run hooks on all files
make pre-commit-update    # Update hook versions
```

**Note:** Type checking and tests are NOT run on commit. Run them manually with `make lint` and `make test`.

**For detailed setup and troubleshooting, see [docs/00_development.md](docs/00_development.md)**

## Docker Compose Setup

Three services run in Docker: `frontend` (Node 20), `backend` (Python 3.12), `db` (MySQL 8.0). Services communicate via the `app-network` bridge network.

**For detailed architecture and configuration, see [docs/01_system-architecture.md](docs/01_system-architecture.md)**

## Project Conventions

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/) with format `<type>(<scope>): <subject>`.

```bash
pnpm -C frontend run commitlint -- --help  # Check commit message format
```

### Code Organization

- **Backend**: Flask + SQLAlchemy with layered architecture (routes → services → models)
- **Frontend**: React + TypeScript with Vite, organized by pages and components
- All API routes use `/api` prefix
- Frontend proxies API requests to backend in development

**For detailed conventions and best practices, see:**
- [docs/05_api-design-guide.md](docs/05_api-design-guide.md) - API design principles
- [backend/CLAUDE.md](backend/CLAUDE.md) - Backend conventions
- [frontend/CLAUDE.md](frontend/CLAUDE.md) - Frontend conventions
