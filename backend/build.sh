#!/usr/bin/env bash
# Render Build Script for SehatSetu Django Backend
# This script runs during the build phase on Render

set -o errexit  # exit on error

echo "==> Upgrading pip..."
pip install --upgrade pip

echo "==> Installing Python dependencies..."
pip install -r requirements.txt
pip install gunicorn whitenoise dj-database-url

echo "==> Collecting static files..."
python manage.py collectstatic --no-input

echo "==> Running database migrations..."
python manage.py migrate --no-input

echo "==> Seeding specialties..."
python manage.py seed_specialties || echo "Seed command not found or already seeded, skipping..."

echo "==> Seeding demo users..."
python manage.py seed_users || echo "Seed users skipped..."

echo "==> Seeding LAN demo users..."
python manage.py lan_demo || echo "LAN demo skipped..."

echo "==> Build complete!"
