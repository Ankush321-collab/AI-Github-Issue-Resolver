FROM python:3.11-slim

RUN apt-get update && apt-get install -y --no-install-recommends git && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy all project files
COPY . .

RUN pip install --no-cache-dir ruff mypy
RUN pip install --no-cache-dir -r orchestrator/requirements.txt

WORKDIR /app/orchestrator

RUN ruff check . --ignore E402,I001,UP042,UP045

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
