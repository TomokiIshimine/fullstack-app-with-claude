.PHONY: install setup up down lint test format

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
	$(POETRY) run flake8 backend/app backend/tests
	$(POETRY) run mypy backend/app

test:
	$(PNPM) run test -- --runInBand
	$(POETRY) run pytest

format:
	$(PNPM) run format
	$(POETRY) run isort backend/app backend/tests
	$(POETRY) run black backend/app backend/tests
