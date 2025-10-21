.PHONY: install up down lint test format

PNPM ?= pnpm --dir frontend
POETRY ?= poetry -C backend
COMPOSE ?= docker compose -f infra/docker-compose.yml --env-file infra/.env.development

install:
	$(PNPM) install
	$(POETRY) install

up:
	$(COMPOSE) up -d

down:
	$(COMPOSE) down

lint:
	$(PNPM) run lint
	$(POETRY) run flake8 app backend
	$(POETRY) run mypy app

test:
	$(PNPM) run test -- --runInBand
	$(POETRY) run pytest

format:
	$(PNPM) run format
	$(POETRY) run isort app backend
	$(POETRY) run black app backend
