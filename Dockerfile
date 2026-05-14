FROM python:3.12-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy pyproject.toml
COPY pyproject.toml .

# Install dependencies directly using pip
RUN pip install .

# Copy source code
COPY src/ /app/src/

# Expose the SSE port (fastmcp default for SSE is usually 8000)
EXPOSE 8000

# Run the server via standard python command (defaults to Uvicorn cloud mode)
CMD ["python", "src/schemo_server/server.py"]
