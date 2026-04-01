import sys
from pathlib import Path
import json
import re

sys.path.insert(0, str(Path(__file__).parent.parent))

from pydantic import BaseModel

import structlog

from orchestrator.src.state import AgentState
from shared.llm_client import LLMClient

logger = structlog.get_logger(__name__)


SYSTEM_PROMPT = """You are a Code Writer Agent. Your task is to implement the solution based on the plan and generate a git patch.

You must:
1. Understand the plan and code context
2. Generate the code changes
3. Create a git diff/patch format

Return JSON in this format:
{
  "patch": "--- a/file.py\\n+++ b/file.py\\n@@ ...\\n+ new code\\n- old code"
}
"""


class CodeWriterResponse(BaseModel):
    patch: str


def build_task_prompt(state: AgentState) -> str:
    return f"""Issue: {state.issue}
Repository: {state.repo_url}

Plan:
{state.plan}

Code Context:
{state.code_context}

Generate the code changes as a git diff/patch."""


async def run(state: AgentState, llm_client: LLMClient) -> AgentState:
    state.add_log("code_writer", "Starting code writer agent")

    try:
        prompt = build_task_prompt(state)
        messages = [{"role": "user", "content": prompt}]

        accumulated_parts: list[str] = []

        def on_token(token: str) -> None:
            accumulated_parts.append(token)
            state.emit_progress("code_writer", "writing", token)

        async for _ in llm_client.chat_stream(
            messages, SYSTEM_PROMPT, on_token=on_token
        ):
            pass

        content = "".join(accumulated_parts).strip()

        json_block = None
        if "```json" in content:
            match = re.search(r"```json\s*(\{.*?\})\s*```", content, re.DOTALL)
            if match:
                json_block = match.group(1)

        if json_block is None:
            match = re.search(r"\{.*\}", content, re.DOTALL)
            if match:
                json_block = match.group(0)

        if json_block:
            try:
                parsed = json.loads(json_block)
                state.patch = parsed.get("patch", "")
            except json.JSONDecodeError:
                state.patch = ""
        else:
            state.patch = content

        state.add_log("code_writer", "Code patch generated")

    except Exception as e:
        logger.exception("code_writer_error", error=str(e))
        state.add_log("code_writer", f"Error: {str(e)}")
        state.error = str(e)

    return state
