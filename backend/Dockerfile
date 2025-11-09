# Multi-stage build for full-stack application
# Stage 1: Build frontend
FROM node:20-slim AS frontend-builder

WORKDIR /frontend

# Install pnpm
RUN npm install -g pnpm

# Note: Build context must be the repository root
# Copy frontend dependency files
COPY frontend/package.json frontend/pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy frontend source code
COPY frontend ./

# Build frontend with API URL pointing to same domain
ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

RUN pnpm run build

# Stage 2: Build backend dependencies
FROM python:3.12-slim AS backend-builder

WORKDIR /app

# Install system dependencies for building Python packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    default-libmysqlclient-dev \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install Poetry
RUN pip install --no-cache-dir poetry==2.0.1

# Copy dependency files
COPY backend/pyproject.toml backend/poetry.lock* ./

# Configure Poetry to not create a virtual environment
RUN poetry config virtualenvs.create false

# Install dependencies (production only)
RUN poetry install --only main --no-interaction --no-ansi

# Stage 3: Runtime with Nginx + Gunicorn
FROM python:3.12-slim

WORKDIR /app

# Install runtime system dependencies and Nginx
RUN apt-get update && apt-get install -y --no-install-recommends \
    default-libmysqlclient-dev \
    nginx \
    procps \
    && rm -rf /var/lib/apt/lists/*

# Copy installed Python packages from backend-builder
COPY --from=backend-builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=backend-builder /usr/local/bin /usr/local/bin

# Copy frontend build output from frontend-builder
COPY --from=frontend-builder /frontend/dist /app/static

# Copy application code
COPY backend/app ./app
COPY backend/scripts ./scripts

# Copy database migrations for Cloud Run Job
COPY infra/mysql /infra/mysql

# Make scripts executable
RUN chmod +x ./scripts/*.sh

# Copy Nginx configuration
COPY backend/nginx.conf /etc/nginx/sites-available/default
RUN rm -f /etc/nginx/sites-enabled/default && \
    ln -s /etc/nginx/sites-available/default /etc/nginx/sites-enabled/default

# Copy entrypoint script
COPY backend/entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

# Create log directories
RUN mkdir -p /var/log/nginx && \
    chmod -R 755 /var/log/nginx

# Expose port 5000 (Nginx)
EXPOSE 5000

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV FLASK_APP=app.main:app

# Health check (via Nginx)
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:5000/api/health')"

# Run entrypoint script
CMD ["./entrypoint.sh"]
