#!/bin/bash
set -e

echo "Starting entrypoint script..."

# Test Nginx configuration
echo "Testing Nginx configuration..."
nginx -t

# Start Nginx in the background
echo "Starting Nginx..."
nginx

# Wait a moment for Nginx to start
sleep 2

# Check if Nginx started successfully
if ! pgrep nginx > /dev/null; then
    echo "ERROR: Nginx failed to start"
    if [ -f /var/log/nginx/error.log ]; then
        cat /var/log/nginx/error.log
    fi
    exit 1
fi
echo "Nginx started successfully on port 5000"

# Start Gunicorn in the foreground
echo "Starting Gunicorn..."
exec gunicorn \
    --bind 0.0.0.0:8000 \
    --workers 2 \
    --threads 4 \
    --timeout 300 \
    --access-logfile - \
    --error-logfile - \
    --log-level info \
    app.main:app
