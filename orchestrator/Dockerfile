FROM python:3.11-slim

RUN apt-get update && apt-get install -y --no-install-recommends git libatomic1 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy all project files
COPY . .

# Skip linting in docker build, keep only runtime requirements
RUN pip install --upgrade pip
RUN pip install --no-cache-dir --default-timeout=120 --retries=5 -r orchestrator/requirements.txt

ARG DATABASE_URL
ENV DATABASE_URL=${DATABASE_URL}

RUN python -m prisma generate --schema /app/prisma/schema.python.prisma --generator client_py

WORKDIR /app/orchestrator

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
