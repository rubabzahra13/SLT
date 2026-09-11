FROM python:3.12-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends build-essential libpq-dev \
  && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir -r /app/backend/requirements.txt

COPY backend /app/backend
COPY pricing-rules.json /app/pricing-rules.json
COPY src/data/mock-data.json /app/src/data/mock-data.json

WORKDIR /app/backend
ENV PYTHONPATH=/app/backend

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8001}"]
