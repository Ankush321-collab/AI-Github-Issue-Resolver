import sys
from pathlib import Path
import json

sys.path.insert(0, str(Path(__file__).parent.parent))

from pydantic import BaseModel

import structlog

from orchestrator.src.state import AgentState
from shared.llm_client import LLMClient

logger = structlog.get_logger(__name__)


SYSTEM_PROMPT = """You are a Planner Agent. Your task is to analyze GitHub issues and create a step-by-step solution plan.

You must:
1. Analyze the issue description
2. Understand the code context
3. Generate a detailed solution plan
4. Classify the complexity (simple/complex)

Return JSON in this format:
{
  "plan": "Step-by-step plan...",
  "complexity": "simple" or "complex"
}
"""


class PlannerResponse(BaseModel):
    plan: str
    complexity: str


def build_task_prompt(state: AgentState) -> str:
    return f"""Issue: {state.issue}
Repository: {state.repo_url}

Code Context:
{state.code_context}

Generate a detailed solution plan and classify complexity."""


async def run(state: AgentState, llm_client: LLMClient) -> AgentState:
    state.add_log("planner", "Starting planner agent")

    try:
        prompt = build_task_prompt(state)
        messages = [{"role": "user", "content": prompt}]

        accumulated = ""

        async def on_token(token: str):
            nonlocal accumulated
            accumulated += token
            state.emit_progress("planner", "thinking", token)

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
            state.plan = parsed.get("plan", "No plan generated")
            state.complexity = parsed.get("complexity", "simple")
        except json.JSONDecodeError:
            state.plan = content
            state.complexity = "simple"

        state.add_log(
            "planner", f"Plan generated with complexity: {state.complexity}"
        )

    except Exception as e:
        logger.exception("planner_error", error=str(e))
        state.add_log("planner", f"Error: {str(e)}")
        state.error = str(e)

    return state
