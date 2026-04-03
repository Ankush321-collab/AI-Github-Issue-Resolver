import os
import re
import shutil
import subprocess
import tempfile
from itertools import islice
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).parent.parent))

import structlog

from orchestrator.src.state import AgentState
from shared.llm_client import LLMClient

logger = structlog.get_logger(__name__)


SYSTEM_PROMPT = """You are a Code Reader Agent. Your task is to analyze GitHub repositories and extract relevant code context for solving issues.

You must:
1. Clone the repository (shallow clone)
2. Find files relevant to the issue
3. Extract the relevant code sections
4. Return structured JSON with the code context

Return JSON in this format:
{
  "relevant_files": ["file1.py", "file2.ts"],
  "code_context": "..."
}
"""


def build_task_prompt(state: AgentState) -> str:
    return f"""Issue: {state.issue}
Repository: {state.repo_url}

Analyze the repository and find relevant code for solving this issue. Return the relevant files and code context."""


async def clone_repo(repo_url: str, temp_dir: Path) -> Path:
    repo_name = repo_url.rstrip("/").split("/")[-1].replace(".git", "")
    target_dir = temp_dir / repo_name

    cmd = ["git", "clone", "--depth", "1", repo_url, str(target_dir)]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)

    if result.returncode != 0:
        raise RuntimeError(f"Failed to clone repo: {result.stderr}")

    logger.info("repo_cloned", repo=repo_url, dir=str(target_dir))
    return target_dir


def find_relevant_files(repo_dir: Path, issue: str) -> list[str]:
    keywords = re.findall(r"\b\w+\b", issue.lower())
    keywords = [k for k in keywords if len(k) > 3]

    relevant = []
    for ext in [".py", ".ts", ".tsx", ".js", ".jsx", ".go", ".rs", ".java"]:
        for file in repo_dir.rglob(f"*{ext}"):
            if any(kw in file.name.lower() for kw in keywords):
                relevant.append(str(file.relative_to(repo_dir)))

    if not relevant:
        fallback_files = islice(repo_dir.rglob("*.py"), 10)
        relevant = [str(f.relative_to(repo_dir)) for f in fallback_files]

    return relevant[:15]


def extract_code_context(repo_dir: Path, files: list[str]) -> str:
    context_parts = []

    for file_path in files:
        full_path = repo_dir / file_path
        if full_path.exists():
            try:
                content = full_path.read_text(encoding="utf-8", errors="ignore")
                context_parts.append(f"File: {file_path}\n\n{content[:3000]}")
            except Exception as e:
                logger.warning("file_read_error", file=file_path, error=str(e))

    return "\n\n---\n\n".join(context_parts)


async def run(state: AgentState, llm_client: LLMClient) -> AgentState:
    state.add_log("code_reader", "Starting code reader agent")

    try:
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)

            repo_path = await clone_repo(state.repo_url, temp_path)
            relevant_files = find_relevant_files(repo_path, state.issue)

            state.add_log("code_reader", f"Found {len(relevant_files)} relevant files")

            code_context = extract_code_context(repo_path, relevant_files)
            state.code_context = code_context

            prompt = build_task_prompt(state)
            messages = [{"role": "user", "content": f"{prompt}\n\nCode Context:\n{code_context}"}]

            try:
                response = await llm_client.chat_json(messages, SYSTEM_PROMPT)
            except Exception as e:
                logger.warning("code_reader_llm_json_error", error=str(e))
                response = {}

            if isinstance(response, dict):
                if response.get("relevant_files"):
                    state.code_context = extract_code_context(
                        repo_path, response["relevant_files"]
                    )

            state.add_log("code_reader", "Code context extraction complete")

    except Exception as e:
        logger.exception("code_reader_error", error=str(e))
        state.add_log("code_reader", f"Error: {str(e)}")
        state.error = str(e)

    return state
