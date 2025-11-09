.PHONY: install setup up down lint format format-check test test-frontend test-backend test-fast test-cov test-parallel pre-commit-install pre-commit-run pre-commit-update db-init db-create-user db-reset

PNPM ?= pnpm --dir frontend
POETRY ?= poetry -C backend
COMPOSE ?= docker compose -f infra/docker-compose.yml --env-file infra/.env.development

install:
	CI=true $(PNPM) install --config.allow-scripts=true
	$(POETRY) install

setup: install
	@printf '✅ Environment setup complete. You can now run `make up` to start the stack.\n'

up:
	$(COMPOSE) up -d

down:
	$(COMPOSE) down

lint:
	$(PNPM) run lint
	$(PNPM) exec tsc --noEmit
	$(POETRY) run flake8 app tests
	$(POETRY) run mypy app

test:
	$(PNPM) run test -- --runInBand
	$(POETRY) run pytest --cov=app --cov-report=term-missing

test-frontend:
	$(PNPM) run test -- --runInBand

test-backend:
	$(POETRY) run pytest --cov=app --cov-report=term-missing

test-fast:
	$(PNPM) run test -- --runInBand
	$(POETRY) run pytest --no-cov

test-cov:
	$(PNPM) run test -- --runInBand
	$(POETRY) run pytest --cov=app --cov-report=term-missing --cov-report=html
	@printf '\n✅ Coverage report generated in backend/htmlcov/index.html\n'

test-parallel:
	$(PNPM) run test -- --runInBand
	$(POETRY) run pytest -n auto --cov=app --cov-report=term-missing

format:
	$(PNPM) run format
	$(POETRY) run isort app tests
	$(POETRY) run black app tests

format-check:
	$(PNPM) exec node scripts/format.mjs --check
	$(POETRY) run isort --check-only app tests
	$(POETRY) run black --check app tests

pre-commit-install:
	$(POETRY) run pre-commit install
	@printf '✅ Pre-commit hooks installed\n'

pre-commit-run:
	$(POETRY) run pre-commit run --all-files

pre-commit-update:
	$(POETRY) run pre-commit autoupdate
	@printf '✅ Pre-commit hooks updated\n'

# Database management targets
db-init:
	$(POETRY) run python scripts/create_tables.py
	@printf '✅ Database tables created\n'

db-create-user:
	@if [ -z "$(EMAIL)" ] || [ -z "$(PASSWORD)" ]; then \
		printf 'Usage: make db-create-user EMAIL=user@example.com PASSWORD=password123\n'; \
		exit 1; \
	fi
	$(POETRY) run python scripts/create_user.py $(EMAIL) $(PASSWORD)

db-reset:
	@printf '⚠️  This will reset the database. Are you sure? [y/N] ' && read ans && [ $${ans:-N} = y ]
	$(COMPOSE) down -v
	$(COMPOSE) up -d db
	@printf 'Waiting for database to be ready...\n'
	@sleep 5
	@printf '✅ Database reset complete\n'
