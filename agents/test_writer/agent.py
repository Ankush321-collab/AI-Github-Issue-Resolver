import sys
from pathlib import Path
import json

sys.path.insert(0, str(Path(__file__).parent.parent))

from pydantic import BaseModel

import structlog

from orchestrator.src.state import AgentState
from shared.llm_client import LLMClient

logger = structlog.get_logger(__name__)


SYSTEM_PROMPT = """You are a Test Writer Agent. Your task is to generate unit/integration tests for the implemented code changes.

You must:
1. Understand the code changes
2. Generate appropriate tests
3. Follow the existing test patterns in the codebase

Return JSON in this format:
{
  "tests": "import pytest\\n\\ndef test_feature():\\n    ..."
}
"""


class TestWriterResponse(BaseModel):
    tests: str


def build_task_prompt(state: AgentState) -> str:
    return f"""Issue: {state.issue}
Repository: {state.repo_url}

Plan:
{state.plan}

Code Changes (patch):
{state.patch}

Generate unit/integration tests for the changes."""


async def run(state: AgentState, llm_client: LLMClient) -> AgentState:
    state.add_log("test_writer", "Starting test writer agent")

    try:
        prompt = build_task_prompt(state)
        messages = [{"role": "user", "content": prompt}]

        accumulated = ""

        async def on_token(token: str):
            nonlocal accumulated
            accumulated += token
            state.emit_progress("test_writer", "writing", token)

        async for _ in llm_client.chat_stream(
            messages, SYSTEM_PROMPT, on_token=on_token
        ):
            pass

        content = accumulated.strip()
        if content.startswith("```json"):
            content = content[7:]
        if content.endswith("```"):
            content = content[:-3]
        content = content.strip()

        try:
            parsed = json.loads(content)
            state.tests = parsed.get("tests", "")
        except json.JSONDecodeError:
            state.tests = content

        state.add_log("test_writer", "Tests generated")

    except Exception as e:
        logger.exception("test_writer_error", error=str(e))
        state.add_log("test_writer", f"Error: {str(e)}")
        state.error = str(e)

    return state
