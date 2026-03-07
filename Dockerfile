# ─── Backend Build ─────────────────────────────────────────────────────
FROM python:3.11-slim AS backend

WORKDIR /app

# System dependencies for PDF parsing (Docling)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpoppler-cpp-dev \
    poppler-utils \
    && rm -rf /var/lib/apt/lists/*

# Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt \
    && pip install --no-cache-dir fastapi uvicorn python-multipart

# Application code
COPY config.py ingest.py indexer.py query_engine.py main.py api.py ./

# Create storage directories
RUN mkdir -p storage/documents storage/uploads storage/qdrant

EXPOSE 8000

CMD ["uvicorn", "api:app", "--host", "0.0.0.0", "--port", "8000"]
