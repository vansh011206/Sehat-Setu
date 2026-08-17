# Backend Dockerfile for SehatSetu (Django 5.2 + Daphne ASGI)
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY requirements.txt .
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy backend source code
COPY . .

# Expose Daphne ASGI server port
EXPOSE 8000

# Default entrypoint command
CMD ["daphne", "-b", "0.0.0.0", "-p", "8000", "config.asgi:application"]
