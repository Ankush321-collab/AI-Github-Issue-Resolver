# Autonomous Multi-Agent GitHub Issue Resolver

[![Python 3.9+](https://img.shields.io/badge/python-3.9+-blue.svg)](https://www.python.org/downloads/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A production-style multi-agent system that analyzes GitHub issues, plans a solution, writes code, and opens pull requests. It ships with a GraphQL gateway, a LangGraph-style Python orchestrator, and a Next.js dashboard UI.

![System diagram](docs/diagram-export-3-30-2026-2_45_41-PM.png)

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Quickstart (Docker)](#quickstart-docker)
- [Local Development](#local-development)
- [Configuration](#configuration)
- [Usage](#usage)
- [Project Structure](#project-structure)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

## Overview

This project orchestrates specialized AI agents to resolve GitHub issues end-to-end. The orchestrator coordinates the planner, code reader, code writer, test writer, and PR agent, while the gateway exposes a GraphQL API and the UI provides a human-friendly control surface.

## Architecture

- **Frontend (Next.js)**: Dashboard UI for runs, logs, and GitHub token management.
- **Gateway (Node.js + Apollo)**: GraphQL API, authentication, and websocket subscriptions.
- **Orchestrator (Python)**: LangGraph-style state machine that runs agents.
- **Agents (Python)**: Planner, code reader, code writer, test writer, PR agent.
- **Redis**: Run state, pub/sub for progress streaming.
- **LLM**: Nebius AI Studio (OpenAI-compatible) using `moonshotai/Kimi-K2.5`.

## Features

- End-to-end issue resolution with multi-agent collaboration.
- Real-time run progress via GraphQL subscriptions.
- Token vault with multi-token support and active token selection.
- Structured logging and run history in the UI.
- Docker-based deployment and local dev scripts.

## Prerequisites

- Python 3.9+
- Node.js 18+
- Git 2.30+
- Redis (or use Docker)
- GitHub Personal Access Token with `repo` and `workflow` scopes
- Nebius API key

## Quickstart (Docker)

1. Create a `.env` file in the repo root (see example below).
2. Start the stack:

```bash
docker compose up --build
```

3. Open the dashboard at `http://localhost:3000`.

## Local Development

You can run the stack without Docker using the provided scripts:

- Windows: `run_local.ps1`
- macOS/Linux: `run_local.sh`

These scripts start Redis (if needed), the orchestrator, the gateway, and the frontend.

## Configuration

Create a `.env` file in the repo root. Example:

```env
# Database (optional, only if you enable Postgres)
DATABASE_URL=postgresql://postgres:password@localhost:5432/agent_orchestrator?schema=public

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# LLM (Nebius AI Studio)
NEBIUS_API_KEY=your_nebius_key

# Auth
JWT_SECRET=replace-with-a-strong-secret

# GitHub (optional fallback)
GITHUB_TOKEN=ghp_your_personal_access_token
```

Notes:
- **JWT_SECRET is required** for the gateway to start.
- The UI uses a token vault. Add a token in the UI and mark it active before starting a run.
- `GITHUB_TOKEN` is optional and can be used as a fallback for non-UI runs.

## Usage

### Dashboard

1. Go to `http://localhost:3000`.
2. Register or log in.
3. Open **GitHub Token** and add a personal access token (max 3).
4. Click **Set Active** for the token you want to use.
5. Click **New Orchestration Run** and provide an issue description and repo URL.

### GraphQL API

- HTTP endpoint: `http://localhost:4000/graphql`
- WS endpoint: `ws://localhost:4000/graphql`

Authentication is via a JWT returned by `login` or `register` and sent as `Authorization: Bearer <token>`.

## Project Structure

```
.
├── agents/                 # Planner, code reader/writer, test writer, PR agent
├── orchestrator/           # Python LangGraph-style orchestrator
├── gateway/                # Node.js GraphQL API
├── frontend/               # Next.js dashboard UI
├── shared/                 # Shared clients (LLM, Redis, DB)
├── prisma/                 # Prisma schema (optional DB)
├── tests/                  # Unit tests
├── docker-compose.yml
└── README.md
```

## Troubleshooting

- **GitHub token not found**: Add a token in the UI and set it active. Tokens are per-user.
- **Failed to start run**: Check gateway logs for auth or token errors.
- **JWT_SECRET missing**: The gateway will fail to start without it.
- **Redis connection issues**: Ensure Redis is running and `REDIS_HOST` is reachable.
- **No progress updates**: Verify the websocket URL and that the gateway can reach Redis.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m "Add amazing feature"`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE).
