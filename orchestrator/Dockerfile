FROM python:3.11-slim

RUN apt-get update && apt-get install -y --no-install-recommends git && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy all project files
COPY . .

RUN pip install --no-cache-dir --default-timeout=120 --retries=5 ruff mypy
RUN pip install --no-cache-dir --default-timeout=120 --retries=5 -r orchestrator/requirements.txt

ARG DATABASE_URL=postgresql://postgres:postgres@localhost:5432/agent_orchestrator?schema=public
ENV DATABASE_URL=${DATABASE_URL}

RUN python -m prisma generate --schema /app/prisma/schema.python.prisma --generator client_py

WORKDIR /app/orchestrator

RUN ruff check . --ignore E402,I001,UP042,UP045

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
