# ── Stage 1: Install dependencies ──────────────────────────────────────────────
FROM python:3.12-slim AS builder

WORKDIR /app

# System build tools (needed by some Python packages)
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
        curl \
    && rm -rf /var/lib/apt/lists/*

# Copy and install requirements first (layer-cached if requirements.txt unchanged)
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# ── Stage 2: Runtime ────────────────────────────────────────────────────────────
FROM python:3.12-slim

WORKDIR /app

# Copy installed packages from builder
COPY --from=builder /usr/local/lib/python3.12 /usr/local/lib/python3.12
COPY --from=builder /usr/local/bin /usr/local/bin

# Copy application source
COPY api_server.py .
COPY gemini_drug_resolver.py .
COPY xai_langgraph_pipeline.py .
COPY download_checkpoint.py .
COPY src/ ./src/
COPY data/ ./data/

# Pre-download model checkpoint during image build so startup is instant
# (The checkpoint is verified via SHA256 and cached in the layer)
RUN python download_checkpoint.py

# Hugging Face Spaces Docker apps MUST listen on port 7860
ENV PORT=7860
EXPOSE 7860

# Create a non-root user for security
RUN useradd -m -u 1000 appuser && chown -R appuser /app
USER appuser

CMD ["uvicorn", "api_server:app", "--host", "0.0.0.0", "--port", "7860"]
