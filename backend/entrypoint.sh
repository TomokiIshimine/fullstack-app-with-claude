#!/bin/bash
set -e

echo "Starting entrypoint script..."

# Start Nginx in the background
echo "Starting Nginx..."
nginx -c /etc/nginx/nginx.conf

# Wait a moment for Nginx to start
sleep 2

# Check if Nginx started successfully
if ! pgrep nginx > /dev/null; then
    echo "ERROR: Nginx failed to start"
    exit 1
fi
echo "Nginx started successfully"

# Start Gunicorn in the foreground
echo "Starting Gunicorn..."
exec poetry run gunicorn \
    --bind 0.0.0.0:8000 \
    --workers 2 \
    --threads 4 \
    --timeout 300 \
    --access-logfile - \
    --error-logfile - \
    --log-level info \
    app.main:app
