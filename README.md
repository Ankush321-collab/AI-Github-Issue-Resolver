# Autonomous Multi-Agent GitHub Issue Resolver

[![Python 3.9+](https://img.shields.io/badge/python-3.9+-blue.svg)](https://www.python.org/downloads/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Code style: black](https://img.shields.io/badge/code%20style-black-000000.svg)](https://github.com/psf/black)

An intelligent, autonomous system that leverages multiple AI agents to analyze, plan, and resolve GitHub issues automatically. Built with a modular multi-agent architecture integrating LLMs (OpenAI/Anthropic) with GitHub's API.

![System diagram](docs/diagram-export-3-30-2026-2_45_41-PM.png)

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [Agent System](#agent-system)
- [Project Structure](#project-structure)
- [Extensibility](#extensibility)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

## 🎯 Overview

This project implements a sophisticated multi-agent system that autonomously resolves GitHub issues through collaborative AI agents. The system fetches open issues, analyzes requirements, generates solutions, reviews code quality, and submits pull requests—all while maintaining human oversight capabilities.

### Key Capabilities

- 🤖 **Autonomous Issue Resolution**: Automatically fetches and processes GitHub issues
- 🧠 **Multi-Agent Collaboration**: Specialized agents for planning, execution, and review
- 🔍 **Intelligent Code Analysis**: LLM-powered code understanding and generation
- ✅ **Automated Quality Assurance**: Built-in code review and validation
- 🔄 **Iterative Improvement**: Self-correcting workflow with retry mechanisms
- 📝 **PR Generation**: Automatic branch creation and pull request submission

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    GitHub Repository                        │
└──────────────────────┬────────────────────────────────────┘
                       │ Issues/PRs
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    Orchestrator Engine                      │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │   Planner   │───▶│  Executor   │───▶│  Reviewer   │     │
│  │   Agent     │    │   Agent     │    │   Agent     │     │
│  └─────────────┘    └─────────────┘    └──────┬──────┘     │
│         │                    │                 │            │
│         └────────────────────┴─────────────────┘            │
│                              │                              │
│                              ▼                              │
│                    ┌─────────────────┐                      │
│                    │  GitHub Tools   │                      │
│                    │  LLM Interface  │                      │
│                    └─────────────────┘                      │
└─────────────────────────────────────────────────────────────┘
```

### Workflow Pipeline

1. **Issue Fetching**: Retrieves open issues from configured repositories
2. **Analysis Phase**: Planner agent decomposes the issue into actionable tasks
3. **Implementation Phase**: Executor agents generate code changes
4. **Review Phase**: Reviewer agents validate solution correctness and quality
5. **Submission Phase**: Creates branches, commits changes, and opens PRs
6. **Feedback Loop**: Monitors PR status and addresses review comments

## ✨ Features

### Agent Capabilities

- **Planner Agent**: Analyzes issue descriptions, creates implementation strategies, and breaks down complex tasks
- **Executor Agent**: Generates code solutions, modifies existing files, and implements features
- **Reviewer Agent**: Validates code quality, checks for bugs, ensures style compliance, and verifies test coverage
- **Coordinator**: Manages agent communication, handles state persistence, and orchestrates workflow transitions

### Integration Features

- GitHub API v4 (GraphQL) and REST API support
- Support for OpenAI GPT-4, GPT-3.5, and Anthropic Claude models
- Git operations (clone, branch, commit, push) automation
- Issue label filtering and priority-based processing
- Concurrent issue processing with rate limiting

## 📋 Prerequisites

- Python 3.9 or higher
- Git 2.30+
- GitHub Personal Access Token with `repo` and `workflow` scopes
- OpenAI API key or Anthropic API key
- (Optional) Docker for containerized deployment

## 🚀 Installation

### Local Setup

1. Clone the repository:
```bash
2. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
3. Install dependencies:
```bash
pip install -r requirements.txt
### Docker Setup

```bash
## ⚙️ Configuration

Create a `.env` file in the root directory:

```env
# GitHub Configuration
GITHUB_TOKEN=ghp_your_personal_access_token
GITHUB_REPO_OWNER=your-org-or-username
GITHUB_REPO_NAME=your-repo-name

# LLM Configuration (Choose one or both)
OPENAI_API_KEY=sk-your-openai-key
ANTHROPIC_API_KEY=sk-your-anthropic-key

# Model Settings
PLANNER_MODEL=gpt-4
EXECUTOR_MODEL=gpt-4
REVIEWER_MODEL=gpt-4
TEMPERATURE=0.2
MAX_TOKENS=4096

# System Configuration
LOG_LEVEL=INFO
MAX_CONCURRENT_ISSUES=3
WORKING_DIRECTORY=./workspace
ENABLE_AUTO_PR=true
REQUIRE_HUMAN_APPROVAL=false

# Optional: Specific issue filtering
ISSUE_LABELS=bug,enhancement
EXCLUDE_LABELS=wontfix,duplicate
### GitHub Token Permissions

Your GitHub token requires the following scopes:
- `repo` - Full control of private repositories
- `workflow` - Update GitHub Action workflows
- `read:org` - Read organization data (if applicable)
## 🎮 Usage

### Basic Usage

Run the system against a specific repository:

```bash
python main.py --repo owner/repo-name
### Process Specific Issues

```bash
python main.py --repo owner/repo-name --issue-numbers 123,124,125
### Dry Run Mode (No actual changes)

```bash
python main.py --repo owner/repo-name --dry-run
### Continuous Monitoring Mode

```bash
python main.py --repo owner/repo-name --watch --interval 300
### Example Output

```
[2024-01-15 10:30:45] INFO: Starting Autonomous Issue Resolver
[2024-01-15 10:30:46] INFO: Fetching open issues from myorg/myrepo...
[2024-01-15 10:30:47] INFO: Found 3 issues to process
[2024-01-15 10:30:48] INFO: Processing Issue #142: Fix authentication bug
[2024-01-15 10:30:50] INFO: Planner Agent: Analyzing issue requirements...
[2024-01-15 10:31:15] INFO: Planner Agent: Created 4 subtasks
[2024-01-15 10:31:16] INFO: Executor Agent: Implementing fix in auth.py...
[2024-01-15 10:32:30] INFO: Executor Agent: Changes committed to branch fix/auth-142
[2024-01-15 10:32:35] INFO: Reviewer Agent: Validating solution...
[2024-01-15 10:33:10] INFO: Reviewer Agent: All checks passed
[2024-01-15 10:33:15] INFO: Created PR #143: Fix authentication bug
## 🤖 Agent System

### Planner Agent

The Planner Agent is responsible for:
- Parsing issue descriptions and comments
- Identifying affected code areas
- Creating step-by-step implementation plans
- Estimating complexity and resource requirements
- Breaking down issues into atomic tasks

**Configuration**: `config/planner_config.yaml`
### Executor Agent

The Executor Agent handles:
- Code generation and modification
- Test creation and updates
- Documentation updates
- Git operations (branching, committing)
- Dependency management

**Configuration**: `config/executor_config.yaml`
### Reviewer Agent

The Reviewer Agent performs:
- Static code analysis
- Syntax and logic validation
- Security vulnerability scanning
- Style guide compliance checking
- Test coverage verification

**Configuration**: `config/reviewer_config.yaml`
### Communication Protocol

Agents communicate via a shared state store (Redis or in-memory) using structured JSON messages:
```json
{
  "message_type": "task_assignment",
  "from_agent": "planner",
  "to_agent": "executor",
  "payload": {
    "task_id": "task_123",
    "description": "Implement user authentication",
    "files_to_modify": ["auth.py"],
    "acceptance_criteria": [...]
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
## 📁 Project Structure

```
.
├── agents/
│   ├── __init__.py
│   ├── base_agent.py          # Abstract base class for all agents
│   ├── planner_agent.py       # Issue analysis and planning
│   ├── executor_agent.py      # Code implementation
│   └── reviewer_agent.py      # Code review and validation
├── tools/
│   ├── __init__.py
│   ├── github_tools.py          # GitHub API wrapper
│   ├── git_tools.py           # Git operations
│   ├── llm_interface.py       # LLM API abstraction
│   └── code_analyzer.py       # Static analysis utilities
├── config/
│   ├── settings.py            # Configuration management
│   ├── planner_config.yaml
│   ├── executor_config.yaml
│   └── reviewer_config.yaml
├── core/
│   ├── orchestrator.py        # Workflow orchestration
│   ├── state_manager.py       # Agent state persistence
│   └── error_handler.py       # Retry and error recovery
├── utils/
│   ├── logger.py              # Logging configuration
│   └── helpers.py             # Utility functions
├── docs/
│   ├── ARCHITECTURE.md        # Detailed architecture docs
│   └── AGENTS.md              # Agent development guide
├── tests/
│   ├── test_agents/
│   └── test_tools/
├── main.py                    # Entry point
├── requirements.txt
├── Dockerfile
└── README.md
## 🔧 Extensibility

### Adding a New Agent

1. Create a new file in `agents/` inheriting from `BaseAgent`:
```python
from agents.base_agent import BaseAgent

class CustomAgent(BaseAgent):
    def __init__(self, config):
        super().__init__(config)
        self.agent_type = "custom"
    
    async def process(self, task):
        # Implementation logic
        pass
    
    async def validate(self, result):
        # Validation logic
        pass
2. Register the agent in `core/orchestrator.py`
3. Add configuration in `config/custom_config.yaml`
### Custom Tools

Add new tools in the `tools/` directory following the tool interface:
```python
class CustomTool:
    def __init__(self, config):
        self.config = config
    
    def execute(self, **kwargs):
        # Tool implementation
        pass
## 🐛 Troubleshooting

### Common Issues

**Rate Limiting**
- GitHub API: The system implements exponential backoff. Check `GITHUB_TOKEN` permissions.
- OpenAI/Anthropic: Monitor token usage in your dashboard.
**Git Authentication Errors**
- Ensure `GITHUB_TOKEN` has `workflow` scope
- Check token expiration dates
- Verify repository access permissions
**LLM Context Length Exceeded**
- Reduce `MAX_TOKENS` in configuration
- Enable code chunking in `config/settings.py`
- Use smaller context models for specific agents
**Agent Communication Failures**
- Check Redis connection (if using distributed mode)
- Verify state manager permissions
- Review logs in `logs/agent_communication.log`
### Debug Mode

Enable verbose logging:
```bash
LOG_LEVEL=DEBUG python main.py --repo owner/repo
## 🤝 Contributing

We welcome contributions! Please follow these steps:
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
### Development Setup

```bash
pip install -r requirements-dev.txt
pre-commit install
pytest tests/
### Code Standards

- Follow PEP 8 style guidelines
- Add type hints for new functions
- Include docstrings (Google format)
- Write unit tests for new features
- Maintain test coverage above 80%
## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
## 🙏 Acknowledgments

- OpenAI for GPT-4 API
- Anthropic for Claude API
- GitHub for their comprehensive API
- The open-source community for inspiration and tools
## 📞 Support

For questions or support:
- Open an issue on GitHub
- Contact: [your-email@example.com]
- Documentation: [Wiki Link]
---
**Disclaimer**: This system performs automated code changes. Always review generated pull requests before merging. Use with appropriate safeguards in production environments.
