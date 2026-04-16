# Autonomous Multi-Agent GitHub Issue Resolver
<div align="center">
 
[![Python 3.9+](https://img.shields.io/badge/python-3.9+-blue.svg)](https://www.python.org/downloads/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
# 🤖 Autonomous Multi-Agent GitHub Issue Resolver
 
A production-style multi-agent system that analyzes GitHub issues, plans a solution, writes code, and opens pull requests. It ships with a GraphQL gateway, a LangGraph-style Python orchestrator, and a Next.js dashboard UI.
<p align="center">
  <img src="https://img.shields.io/badge/Python-3.9+-3776AB?logo=python&logoColor=white&style=for-the-badge" alt="Python 3.9+" />
  <img src="https://img.shields.io/badge/Next.js-14+-000000?logo=next.js&logoColor=white&style=for-the-badge" alt="Next.js 14+" />
  <img src="https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white&style=for-the-badge" alt="Node.js 18+" />
  <img src="https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white&style=for-the-badge" alt="Docker" />
</p>
 
![System diagram](docs/diagram-export-3-30-2026-2_45_41-PM.png)
<p align="center">
  <img src="https://img.shields.io/github/license/Ankush321-collab/AI-Github-Issue-Resolver?style=flat-square" alt="License" />
  <img src="https://img.shields.io/github/stars/Ankush321-collab/AI-Github-Issue-Resolver?style=flat-square&color=yellow" alt="Stars" />
  <img src="https://img.shields.io/github/forks/Ankush321-collab/AI-Github-Issue-Resolver?style=flat-square&color=blue" alt="Forks" />
  <img src="https://img.shields.io/badge/Build-Passing-brightgreen?style=flat-square" alt="Build" />
</p>
 
## Table of Contents
<p align="center">
  <b>🚀 AI-powered autonomous coding agents that analyze, plan, code, test, and deploy</b>
</p>
 
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
<p align="center">
  <a href="#-demo--screenshots">🎥 Demo</a> •
  <a href="#-quickstart">⚡ Quick Start</a> •
  <a href="#-documentation">📚 Docs</a> •
  <a href="#-contributing">🤝 Contribute</a> •
  <a href="https://github.com/Ankush321-collab/AI-Github-Issue-Resolver/issues">🐛 Report Bug</a>
</p>
 
## Overview
<img src="docs/diagram-export-3-30-2026-2_45_41-PM.png" alt="System Architecture Diagram" width="800" />
 
This project orchestrates specialized AI agents to resolve GitHub issues end-to-end. The orchestrator coordinates the planner, code reader, code writer, test writer, and PR agent, while the gateway exposes a GraphQL API and the UI provides a human-friendly control surface.
</div>
 
## Architecture
---
 
- **Frontend (Next.js)**: Dashboard UI for runs, logs, and GitHub token management.
- **Gateway (Node.js + Apollo)**: GraphQL API, authentication, and websocket subscriptions.
- **Orchestrator (Python)**: LangGraph-style state machine that runs agents.
- **Agents (Python)**: Planner, code reader, code writer, test writer, PR agent.
- **Redis**: Run state, pub/sub for progress streaming.
- **LLM**: Nebius AI Studio (OpenAI-compatible) using `moonshotai/Kimi-K2.5`.
## 📑 Table of Contents
 
## Features
- [🚀 Demo & Screenshots](#-demo--screenshots)
- [✨ Features](#-features)
- [🏗️ Architecture](#️-architecture)
- [🛠️ Tech Stack](#️-tech-stack)
- [⚡ Quickstart](#-quickstart)
- [💻 Local Development](#-local-development)
- [⚙️ Configuration](#️-configuration)
- [📖 Usage](#-usage)
- [📊 Project Stats](#-project-stats)
- [🔒 Security](#-security)
- [🤝 Contributing](#-contributing)
- [📱 Support](#-support)
- [📝 License](#-license)
 
- End-to-end issue resolution with multi-agent collaboration.
- Real-time run progress via GraphQL subscriptions.
- Token vault with multi-token support and active token selection.
- Structured logging and run history in the UI.
- Docker-based deployment and local dev scripts.
---
 
## Prerequisites
## 🎥 Demo & Screenshots
 
- Python 3.9+
- Node.js 18+
- Git 2.30+
- Redis (or use Docker)
- GitHub Personal Access Token with `repo` and `workflow` scopes
- Nebius API key
<div align="center">
 
## Quickstart (Docker)
### 🖥️ Next.js Dashboard
![Dashboard Preview](https://via.placeholder.com/800x400/000000/FFFFFF?text=Next.js+Dashboard+Preview)
*Real-time monitoring of agent runs and logs*
 
1. Create a `.env` file in the repo root (see example below).
2. Start the stack:
### 🏗️ System Architecture
```mermaid
graph TB
    User[👤 User] -->|GraphQL| Gateway[🌐 Gateway<br/>Node.js + Apollo]
    Gateway -->|WebSocket| Frontend[💻 Frontend<br/>Next.js 14]
    Gateway -->|gRPC/HTTP| Orchestrator[🎛️ Orchestrator<br/>Python + LangGraph]
    Orchestrator -->|State| Redis[(🔴 Redis)]
    Orchestrator -->|API| LLM[🤖 LLM<br/>Nebius AI Studio]
    Orchestrator -->|Git| GitHub[(🐙 GitHub)]
    
    subgraph Agents[🤖 Agent Cluster]
        Planner[📋 Planner]
        Reader[👁️ Code Reader]
        Writer[✍️ Code Writer]
        Tester[🧪 Test Writer]
        PR[🚀 PR Agent]
    end
    
    Orchestrator --> Agents
```
 
```bash
docker compose up --build
```
<p align="center">
  <a href="#">
    <img src="https://img.shields.io/badge/🔴_LIVE_DEMO-FF0000?style=for-the-badge&logoColor=white" alt="Live Demo" />
  </a>
</p>
 
3. Open the dashboard at `http://localhost:3000`.
</div>
 
## Local Development
---
 
You can run the stack without Docker using the provided scripts:
## ✨ Features
 
- Windows: `run_local.ps1`
- macOS/Linux: `run_local.sh`
<table>
<tr>
<td width="50%">
 
These scripts start Redis (if needed), the orchestrator, the gateway, and the frontend.
### 🤖 Multi-Agent Orchestration
- **Planner**: Analyzes issues and creates execution strategies
- **Code Reader**: Navigates and understands codebase structure
- **Code Writer**: Generates production-ready code
- **Test Writer**: Creates comprehensive test suites
- **PR Agent**: Handles pull request creation and management
 
## Configuration
</td>
<td width="50%">
 
Create a `.env` file in the repo root. Example:
### 🔄 Real-time Collaboration
- Live progress streaming via GraphQL subscriptions
- WebSocket-based state synchronization
- Structured logging with run history
- Multi-token vault with active token selection
 
```env
# Database (optional, only if you enable Postgres)
DATABASE_URL=postgresql://postgres:password@localhost:5432/agent_orchestrator?schema=public
</td>
</tr>
<tr>
<td width="50%">
 
# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
### 🛡️ Enterprise Ready
- Docker-based deployment
- JWT authentication
- Token vault for secure credential management
- Horizontal scaling support
 
# LLM (Nebius AI Studio)
NEBIUS_API_KEY=your_nebius_key
</td>
<td width="50%">
 
# Auth
JWT_SECRET=replace-with-a-strong-secret
### 🎨 Modern UI
- Next.js 14 with App Router
- Real-time dashboard
- Responsive design
- Dark mode support
 
# GitHub (
</td>
</tr>
</table>

---

## 🏗️ Architecture

<div align="center">

| Component | Technology | Purpose |
|-----------|------------|---------|
| 🎨 **Frontend** | Next.js 14 + React | Dashboard UI for runs, logs, and token management |
| 🌐 **Gateway** | Node.js + Apollo | GraphQL API, authentication, WebSocket subscriptions |
| 🎛️ **Orchestrator** | Python + LangGraph | State machine for agent coordination |
| 🤖 **Agents** | Python + OpenAI SDK | Specialized AI workers |
| 🔴 **Cache** | Redis | Run state, pub/sub for progress streaming |
| 🧠 **LLM** | Nebius AI Studio | `moonshotai/Kimi-K2.5` model |

</div>

### Data Flow
```
GitHub Issue → Gateway → Orchestrator → Planner → Code Reader → Code Writer → Test Writer → PR Agent → Pull Request
                ↑           ↓              ↓           ↓            ↓            ↓          ↓
                └───────────┴────────────┴───────────┴────────────┴────────────┴──────────┘
                                        Redis State Store
```

---

## 🛠️ Tech Stack

<div align="center">

### Frontend
![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)

### Backend
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white)
![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)
![GraphQL](https://img.shields.io/badge/GraphQL-E10098?style=for-the-badge&logo=graphql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)

### AI/ML
![OpenAI](https://img.shields.io/badge/Nebius_AI-412991?style=for-the-badge&logo=openai&logoColor=white)
![LangChain](https://img.shields.io/badge/LangGraph-1C3C3C?style=for-the-badge&logo=langchain&logoColor=white)

### DevOps
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-2088FF?style=for-the-badge&logo=github-actions&logoColor=white)

</div>

---

## ⚡ Quickstart

<details>
<summary>📋 Prerequisites (Click to expand)</summary>

### Required
- ✅ Python 3.9+
- ✅ Node.js 18+
- ✅ Git 2.30+
- ✅ Redis (or Docker)
- ✅ GitHub Personal Access Token (`repo` + `workflow` scopes)
- ✅ Nebius API Key

### Verify Installation
```bash
# Check versions
python --version  # >= 3.9
node --version    # >= 18
git --version     # >= 2.30
docker --version  # (optional)
```

</details>

### 🐳 Option 1: Docker (Recommended)

```bash
# 1. Clone the repository

# 2. Create environment file
# Edit .env with your credentials

# 3. Launch the stack
docker compose up --build

# 4. Access the dashboard
open http://localhost:3000
```

### 💻 Option 2: Local Development

```bash
# Windows
.\run_local.ps1

# macOS/Linux
chmod +x run_local.sh
./run_local.sh
```

> 💡 **Tip**: These scripts automatically start Redis, the orchestrator, gateway, and frontend.

---

## 💻 Local Development

### Manual Setup

<details>
<summary>🔧 Step-by-step manual configuration</summary>

#### 1. Start Redis
```bash
# Using Docker

# Or local installation
redis-server
```

#### 2. Start Orchestrator (Python)
```bash
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

#### 3. Start Gateway (Node.js)
```bash
npm install
npm run dev
```

#### 4. Start Frontend (Next.js)
```bash
npm install
npm run dev
```

</details>

---

## ⚙️ Configuration

Create a `.env` file in the repository root:

```bash
```

### Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `NEBIUS_API_KEY` | ✅ | Nebius AI Studio API Key | `nb-...` |
| `GITHUB_TOKEN` | ✅ | GitHub Personal Access Token | `ghp_...` |
| `JWT_SECRET` | ✅ | Secret for JWT signing | `your-secret-key` |
| `REDIS_HOST` | ❌ | Redis hostname | `localhost` |
| `REDIS_PORT` | ❌ | Redis port | `6379` |
| `DATABASE_URL` | ❌ | PostgreSQL URL (optional) | `postgresql://...` |

### 🔒 Security Warning
> ⚠️ **Never commit your `.env` file!** The repository includes `.env` in `.gitignore` for your protection.

### Example `.env` file

```env
# 🔴 Required
NEBIUS_API_KEY=your_nebius_api_key_here
GITHUB_TOKEN=ghp_your_github_token_here
JWT_SECRET=replace-with-strong-random-secret-min-32-chars

# 🟡 Optional (defaults shown)
REDIS_HOST=localhost
REDIS_PORT=6379

# 🟢 Database (only if using Postgres)
# DATABASE_URL=postgresql://postgres:password@localhost:5432/agent_orchestrator?schema=public
```

---

## 📖 Usage

### 1. Configure GitHub Tokens
Navigate to the Token Vault in the dashboard and add your GitHub Personal Access Token.

### 2. Create a New Run
```graphql
mutation CreateRun {
  createRun(input: {
    repoUrl: "https://github.com/owner/repo"
    issueNumber: 42
  }) {
    id
    status
    createdAt
  }
}
```

### 3. Monitor Progress
Subscribe to real-time updates:
```graphql
subscription OnRunUpdate {
  runUpdated {
    id
    status
    logs {
      timestamp
      level
      message
    }
    progress
  }
}
```

---

## 📊 Project Stats

<div align="center">

![GitHub stars](https://img.shields.io/github/stars/Ankush321-collab/AI-Github-Issue-Resolver?style=social)
![GitHub forks](https://img.shields.io/github/forks/Ankush321-collab/AI-Github-Issue-Resolver?style=social)
![GitHub contributors](https://img.shields.io/github/contributors/Ankush321-collab/AI-Github-Issue-Resolver?style=social)

</div>

---

## 🔒 Security

- **Token Vault**: Secure storage for GitHub tokens with encryption at rest
- **JWT Authentication**: Stateless auth with configurable expiration
- **Scope Validation**: Minimal GitHub token permissions required
- **Audit Logging**: Complete history of all agent actions
- **Sandboxed Execution**: Code execution in isolated environments

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Contributors

<a href="https://github.com/Ankush321-collab/AI-Github-Issue-Resolver/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=Ankush321-collab/AI-Github-Issue-Resolver" alt="Contributors" />
</a>

### Development Workflow
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📱 Support

- 💬 [GitHub Discussions](https://github.com/Ankush321-collab/AI-Github-Issue-Resolver/discussions)
- 🐛 [Issue Tracker](https://github.com/Ankush321-collab/AI-Github-Issue-Resolver/issues)
- 📧 Email: [your-email@example.com](mailto:your-email@example.com)

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">

**[⬆ Back to Top](#-autonomous-multi-agent-github-issue-resolver)**

Made with ❤️ by [Ankush321-collab](https://github.com/Ankush321-collab)

</div>
