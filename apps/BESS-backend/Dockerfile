# Stage 1: Build
FROM python:3.12-slim AS builder

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Set working directory
WORKDIR /app

# Copy python-common package first (dependency)
COPY packages/python-common /packages/python-common

# Copy application files
COPY apps/BESS-backend/pyproject.toml apps/BESS-backend/uv.lock ./

# Install dependencies (including python-common from local path)
RUN uv sync 
# Install python-common in the venv
RUN uv pip install -e /packages/python-common

# Stage 2: Runtime
FROM python:3.12-slim

WORKDIR /app

# Copy virtual environment from builder
COPY --from=builder /app/.venv /app/.venv

# Copy application code
COPY apps/BESS-backend/ .

# Copy python-common from builder stage (not build context)
COPY --from=builder /packages/python-common /packages/python-common

# Set environment variables
ENV PATH="/app/.venv/bin:$PATH"
ENV PYTHONUNBUFFERED=1

# Expose port
EXPOSE 8020

# Run the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8020"]
