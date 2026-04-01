# AGENTS.md — Autonomous Multi-Agent GitHub Issue Resolver

> For agentic coding agents operating in this repository. Read this file fully before making any changes.

---

## Project Overview

**Project:** Autonomous Multi-Agent GitHub Issue Resolver (LangGraph Architecture)  
**Goal:** Production-grade backend where AI agents collaborate to resolve GitHub issues — reading issues, analyzing repos, generating plans, writing code, and opening pull requests.  
**Architecture:** Graph-based orchestration (LangGraph-style state machine), not a linear pipeline.

---

## Tech Stack

| Layer       | Technology                                      |
|-------------|-------------------------------------------------|
| API Gateway | Node.js + GraphQL (Apollo Server)               |
| Orchestrator| Python + LangGraph-style state machine          |
| Agents      | Python (FastAPI microservices)                  |
| Database    | PostgreSQL via Prisma ORM                       |
| Queue       | Redis (task queue + pub/sub)                    |
| AI Model    | Nebius AI Studio — `moonshotai/Kimi-K2.5`       |
| Infra       | Docker + Docker Compose                         |
| GitHub      | GitHub REST API (PyGitHub / direct HTTP)        |

---

## Build, Lint, and Test Commands

### Python (Orchestrator + Agents)

```bash
# Install dependencies
pip install -r requirements.txt

# Run a specific service
uvicorn orchestrator.main:app --reload --port 8000

# Lint (enforced)
ruff check .
ruff format --check .

# Type check
mypy . --strict

# Run all tests
pytest

# Run a single test file
pytest tests/agents/test_planner.py

# Run a single test by name
pytest tests/agents/test_planner.py::test_plan_generation -v

# Run with coverage
pytest --cov=src --cov-report=term-missing
```

### Node.js (GraphQL Gateway)

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Lint
npm run lint

# Type check
npx tsc --noEmit

# Run all tests
npm test

# Run a single test file
npx jest src/resolvers/runs.test.ts

# Run a single test by name
npx jest --testNamePattern="startRun mutation"
```

### Docker

```bash
# Start all services
docker compose up --build

# Rebuild a single service
docker compose up --build orchestrator

# Tear down
docker compose down -v
```

### Validation Scripts (from `.agent/`)

```bash
# Quick dev audit (security, lint, schema, tests, UX, SEO)
python .agent/scripts/checklist.py .

# Full pre-deploy verification (+ Lighthouse, Playwright, bundle)
python .agent/scripts/verify_all.py . --url http://localhost:3000
```

---

## Project Structure

```
.
├── gateway/                  # Node.js GraphQL API
│   ├── src/
│   │   ├── resolvers/
│   │   ├── schema/
│   │   └── subscriptions/
│   └── package.json
├── orchestrator/             # Python LangGraph-style engine
│   ├── graph.py              # Node registration, edge routing
│   ├── state.py              # AgentState definition
│   └── main.py
├── agents/
│   ├── code_reader/
│   ├── planner/
│   ├── code_writer/
│   ├── test_writer/
│   └── pr_agent/
├── shared/
│   ├── llm_client.py         # Nebius OpenAI-compatible client
│   ├── redis_client.py
│   └── db.py                 # Prisma client wrapper
├── prisma/
│   └── schema.prisma
├── tests/
├── docker-compose.yml
└── .agent/                   # Agent skills, workflows, rules
```

---

## Code Style Guidelines

### Python

- **Formatter:** `ruff format` (Black-compatible, 88-char line length)
- **Linter:** `ruff check` — all warnings are errors in CI
- **Type hints:** Mandatory on all function signatures and class attributes; use `Optional[T]` or `T | None`, never bare `None` returns
- **Pydantic v2:** All request/response models and the `AgentState` class must be Pydantic `BaseModel` subclasses
- **Async:** All I/O-bound operations (DB, HTTP, Redis, GitHub API) must use `async def`; CPU-bound work uses sync + multiprocessing
- **Imports:** Standard library → third-party → local, one blank line between groups; no wildcard imports
- **Constants:** `UPPER_SNAKE_CASE` at module level; never hardcode secrets — use `os.environ` or `pydantic-settings`
- **Docstrings:** Google style for public functions and classes

### Node.js / TypeScript

- **Formatter:** Prettier (default config)
- **Linter:** ESLint with TypeScript plugin; `@typescript-eslint/strict` ruleset
- **Types:** `strict: true` in `tsconfig.json`; no `any`, no non-null assertions (`!`) without a comment
- **Imports:** Use `import type` for type-only imports; absolute imports via `tsconfig` paths
- **Naming:** `camelCase` for variables/functions, `PascalCase` for types/classes, `UPPER_SNAKE_CASE` for env constants

### General Conventions

- **Naming:**
  - Files/modules: `snake_case.py`, `kebab-case.ts`
  - Agent classes: `PascalCaseAgent` (e.g., `PlannerAgent`)
  - Graph nodes: `snake_case` strings matching agent name (e.g., `"planner"`)
- **No magic strings:** All node names, queue keys, and status values must be defined as constants or enums
- **Self-documenting code:** Prefer clear naming over inline comments; add comments only for non-obvious decisions

---

## Error Handling

- **Python agents:** Raise typed domain exceptions (e.g., `AgentExecutionError`, `LLMResponseError`); never let raw exceptions propagate to the orchestrator
- **Orchestrator:** Catch domain exceptions per node, log with `structlog`, update `AgentState.status`, and trigger retry or rollback logic
- **Retries:** Use exponential backoff (max 3 attempts) for LLM calls and GitHub API calls
- **State rollback:** On unrecoverable failure, persist final state to PostgreSQL with `status="failed"` and full logs before exiting
- **Node.js:** All GraphQL resolvers must wrap async operations in try/catch; return structured `{ error: { code, message } }` — never expose stack traces

---

## Agent Development Rules

1. **Each agent is a self-contained module** with its own `system_prompt`, `task_prompt`, and a `run(state: AgentState) -> AgentState` method
2. **Agents must return structured JSON** from the LLM; validate with Pydantic before writing to state
3. **State is immutable per step:** agents receive a state copy and return an updated copy; never mutate in place
4. **Logs:** Append to `state.logs` with `{"agent": name, "timestamp": ..., "message": ...}` — structured, no PII
5. **LLM calls:** Always go through `shared/llm_client.py`; never instantiate the OpenAI client directly in an agent

---

## Using `.agent/` Skills

This repo includes the **Antigravity Kit** in `.agent/`. Before implementing in any domain, load the relevant skill:

| Domain                   | Skill to Load                     | Agent to Apply               |
|--------------------------|-----------------------------------|------------------------------|
| Python / async patterns  | `.agent/skills/python-patterns`   | `backend-specialist`         |
| API design (GraphQL/REST)| `.agent/skills/api-patterns`      | `backend-specialist`         |
| Database / Prisma schema | `.agent/skills/prisma-expert`     | `database-architect`         |
| Testing strategy         | `.agent/skills/testing-patterns`  | `test-engineer`              |
| Docker / CI/CD           | `.agent/skills/docker-expert`     | `devops-engineer`            |
| Security audit           | `.agent/skills/vulnerability-scanner` | `security-auditor`       |
| Code quality             | `.agent/skills/clean-code`        | any                          |
| Debugging                | `.agent/skills/systematic-debugging` | `debugger`                |

**Protocol:** Read `SKILL.md` for the relevant skill first, then only read the specific sections matching your task. Do not read all files in a skill folder.

---

## LLM Integration

- **Base URL:** `https://api.tokenfactory.me-west1.nebius.com/v1/`
- **Model:** `moonshotai/Kimi-K2.5`
- **Client:** OpenAI-compatible Python SDK via `shared/llm_client.py`
- **Output contract:** Every LLM call must request `response_format={"type": "json_object"}`; parse and validate with Pydantic before use
- **Prompt structure:** Each agent defines `SYSTEM_PROMPT` and `build_task_prompt(state)` as module-level constants/functions

---

## Database & State

- **ORM:** Prisma (Node.js schema, Python client via `prisma-client-py`)
- **Migrations:** Always run `npx prisma migrate dev` after schema changes; never edit the DB directly
- **AgentState** must be JSON-serializable at all times; validate serialization in unit tests
- **TaskLog entries** must be written after every agent execution, success or failure

---

## Security Rules

- No secrets in source code; all credentials via environment variables (`.env` for local, Docker secrets for prod)
- GitHub tokens scoped to minimum required permissions
- Validate and sanitize all issue content before passing to LLM prompts (prompt injection risk)
- Redis channels must not publish raw LLM output without sanitization

---

## Pre-Commit Checklist

Before marking any task complete, verify:

- [ ] `ruff check .` passes with zero errors
- [ ] `mypy . --strict` passes (Python)
- [ ] `npx tsc --noEmit` passes (Node.js)
- [ ] `pytest` passes with no failures
- [ ] New agent has unit tests covering the `run()` method
- [ ] No hardcoded secrets or API keys
- [ ] `python .agent/scripts/checklist.py .` returns success
