# Stage 1: Build
FROM python:3.12-slim AS builder

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Set working directory
WORKDIR /app

# Copy python-common package first (dependency)
COPY packages/python-common ./packages/python-common

# Copy application files
COPY apps/AMD-backend/pyproject.toml apps/AMD-backend/uv.lock ./apps/AMD-backend/

# Install dependencies (including python-common from local path)
WORKDIR /app/apps/AMD-backend
RUN uv sync --frozen --no-dev

# Install python-common in the venv
RUN uv pip install -e ../../packages/python-common

# Stage 2: Runtime
FROM python:3.12-slim

WORKDIR /app

# Copy application code FIRST (before venv)
COPY apps/AMD-backend/ .

# Remove local .venv if accidentally copied
RUN rm -rf .venv

# Copy python-common from builder stage
COPY --from=builder /app/packages/python-common /app/packages/python-common

# Copy the venv from builder LAST (overwrites any local .venv)
COPY --from=builder /app/apps/AMD-backend/.venv /app/.venv

# Set environment variables
ENV PATH="/app/.venv/bin:$PATH"
ENV PYTHONUNBUFFERED=1

# Expose port
EXPOSE 8010

# Run the application
CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8010"]