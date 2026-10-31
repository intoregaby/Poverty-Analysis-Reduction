FROM python:3.12-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY engine/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code to match repo structure (engine/ireme/ -> /app/engine/ireme/)
COPY engine/ireme/ ./engine/ireme/

# Copy policy files to match repo structure (required by gateway and release_gate modules)
COPY IREME_INSIGHT_FULL_ENGINE_KIT/09_MACHINE_CONTRACTS/policies/ ./IREME_INSIGHT_FULL_ENGINE_KIT/09_MACHINE_CONTRACTS/policies/

# Expose port (Fly.io expects 8080 by default)
EXPOSE 8080

# Start the application (app-dir points to /app so ireme.api resolves to /app/engine/ireme/api.py)
CMD ["python", "-m", "uvicorn", "engine.ireme.api:configured_app", "--factory", "--app-dir", "/app", "--host", "0.0.0.0", "--port", "8080"]