# Use official lightweight Python 3.12 base image
FROM python:3.12-slim

# Prevent Python from writing .pyc files and unbuffer stdout/stderr for Cloud Logging
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8080 \
    HOME=/home/appuser

# Set working directory
WORKDIR /app

# Create a non-root system user and home directory for security compliance on Cloud Run
RUN addgroup --system --gid 1001 appgroup && \
    adduser --system --uid 1001 --gid 1001 --home /home/appuser appuser

# Install Python dependencies with layer caching
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application code and set ownership
COPY . .
RUN chown -R appuser:appgroup /app /home/appuser

# Run as non-root user
USER appuser

# Document exposed container port (Cloud Run defaults to 8080)
EXPOSE 8080

# Run FastAPI with uvicorn listening on $PORT
# Using exec ensures uvicorn receives SIGTERM directly for Cloud Run graceful shutdown
CMD ["sh", "-c", "exec uvicorn server:app --host 0.0.0.0 --port ${PORT:-8080} --proxy-headers --forwarded-allow-ips='*'"]

