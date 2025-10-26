.PHONY: install setup up down lint test test-fast test-cov test-parallel format pre-commit-install pre-commit-run pre-commit-update

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
	$(POETRY) run flake8 app tests
	$(POETRY) run mypy app

test:
	$(PNPM) run test -- --runInBand
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

pre-commit-install:
	$(POETRY) run pre-commit install
	@printf '✅ Pre-commit hooks installed\n'

pre-commit-run:
	$(POETRY) run pre-commit run --all-files

pre-commit-update:
	$(POETRY) run pre-commit autoupdate
	@printf '✅ Pre-commit hooks updated\n'
