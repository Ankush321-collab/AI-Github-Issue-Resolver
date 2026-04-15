import os
import subprocess
import tempfile
from pathlib import Path
import sys
import re

sys.path.insert(0, str(Path(__file__).parent.parent))

import httpx
import structlog
from pydantic import BaseModel

from orchestrator.src.state import AgentState
from shared.llm_client import LLMClient

logger = structlog.get_logger(__name__)


SYSTEM_PROMPT = """You are a PR Agent. Your task is to create a GitHub pull request with the implemented changes.

You must:
1. Create a new branch
2. Apply the patch or write files directly
3. Commit the changes
4. Push to GitHub
5. Create a pull request

Return JSON in this format:
{
  "pr_url": "https://github.com/owner/repo/pull/123"
}
"""


def parse_patch(patch: str) -> dict[str, str]:
    files = {}
    current_file = None
    current_content = []

    for line in patch.split("\n"):
        if line.startswith("+++ b/") or line.startswith("--- a/"):
            if current_file:
                files[current_file] = "\n".join(current_content)
            current_file = line.split("/", 1)[1].strip()
            current_content = []
        elif current_file and (line.startswith("+") or line.startswith(" ") or line.startswith("-")):
            if not line.startswith("+++") and not line.startswith("---"):
                current_content.append(line[1:] if line.startswith(("+", "-")) else line)

    if current_file:
        files[current_file] = "\n".join(current_content)

    return files


async def apply_patch(target_dir: Path, patch: str) -> bool:
    if not patch.strip():
        return False

    patch_file = target_dir / "changes.patch"
    patch_file.write_text(patch, encoding="utf-8")

    result = subprocess.run(
        ["git", "apply", "--3way", str(patch_file)],
        cwd=target_dir,
        capture_output=True,
        text=True,
    )

    if result.returncode == 0:
        logger.info("patch_applied_successfully")
        return True

    logger.warning("patch_apply_failed_3way", stderr=result.stderr, stdout=result.stdout)

    result = subprocess.run(
        ["git", "apply", "--ignore-whitespace", str(patch_file)],
        cwd=target_dir,
        capture_output=True,
        text=True,
    )

    if result.returncode == 0:
        logger.info("patch_applied_with_ignore_whitespace")
        return True

    logger.warning("patch_apply_failed_ignore_whitespace", stderr=result.stderr)

    parsed = parse_patch(patch)
    if parsed:
        logger.info("falling_back_to_direct_file_write", files=list(parsed.keys()))
        for file_path, content in parsed.items():
            try:
                full_path = target_dir / file_path
                full_path.parent.mkdir(parents=True, exist_ok=True)
                full_path.write_text(content + "\n", encoding="utf-8")
                logger.info("file_written", file=file_path)
            except Exception as e:
                logger.error("file_write_failed", file=file_path, error=str(e))
        return True

    return False


class PRResponse(BaseModel):
    pr_url: str


def build_task_prompt(state: AgentState) -> str:
    return f"""Issue: {state.issue}
Repository: {state.repo_url}

Patch:
{state.patch}

Tests:
{state.tests}

Create a branch, apply the changes, and create a pull request."""


async def run(state: AgentState, llm_client: LLMClient) -> AgentState:
    state.add_log("pr_agent", "Starting PR agent")

    github_token = state.github_token or os.environ.get("GITHUB_TOKEN")
    if not github_token:
        state.add_log("pr_agent", "Error: GITHUB_TOKEN not set")
        state.error = "GITHUB_TOKEN not configured"
        return state

    try:
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            repo_name = state.repo_url.rstrip("/").split("/")[-1].replace(".git", "")
            target_dir = temp_path / repo_name

            subprocess.run(
                ["git", "clone", "--depth", "1", state.repo_url, str(target_dir)],
                check=True,
                capture_output=True,
            )

            branch_name = f"fix/{state.run_id[:8]}"
            subprocess.run(
                ["git", "checkout", "-b", branch_name],
                cwd=target_dir,
                check=True,
                capture_output=True,
            )

            if state.patch:
                if not await apply_patch(target_dir, state.patch):
                    state.add_log("pr_agent", "Failed to apply patch")
                    state.error = "Failed to apply patch"
                    return state

            if state.tests:
                if not await apply_patch(target_dir, state.tests):
                    state.add_log("pr_agent", "Failed to apply test patch, continuing anyway")

            subprocess.run(
                ["git", "config", "user.email", "agent@orchestrator.local"],
                cwd=target_dir,
                check=True,
            )
            subprocess.run(
                ["git", "config", "user.name", "AI Agent"],
                cwd=target_dir,
                check=True,
            )

            result = subprocess.run(
                ["git", "status", "--porcelain"],
                cwd=target_dir,
                capture_output=True,
                text=True,
            )

            if not result.stdout.strip():
                state.add_log("pr_agent", "No changes to commit")
                state.error = "No changes to commit"
                return state

            subprocess.run(
                ["git", "add", "."],
                cwd=target_dir,
                check=True,
                capture_output=True,
            )

            commit_message = f"Fix: {state.issue[:50]}"
            result = subprocess.run(
                ["git", "commit", "-m", commit_message],
                cwd=target_dir,
                capture_output=True,
                text=True,
            )

            if result.returncode != 0:
                state.add_log("pr_agent", f"Commit failed: {result.stderr}")
                state.error = f"Commit failed: {result.stderr}"
                return state

            repo_url_with_token = state.repo_url.replace(
                "https://github.com/",
                f"https://{github_token}@github.com/"
            )
            subprocess.run(
                ["git", "remote", "set-url", "origin", repo_url_with_token],
                cwd=target_dir,
                check=True,
            )

            subprocess.run(
                ["git", "push", "origin", branch_name, "--force"],
                cwd=target_dir,
                check=True,
                capture_output=True,
            )

            owner_repo = state.repo_url.replace("https://github.com/", "").replace(
                ".git", ""
            )
            pr_body = f"## Summary\n\n{state.issue}\n\n## Changes\n\n{state.plan}\n\n## Tests\n\n```\n{state.tests[:500]}...\n```"

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"https://api.github.com/repos/{owner_repo}/pulls",
                    headers={
                        "Authorization": f"token {github_token}",
                        "Accept": "application/vnd.github.v3+json",
                    },
                    json={
                        "title": f"Fix: {state.issue[:50]}",
                        "body": pr_body,
                        "head": branch_name,
                        "base": "main",
                    },
                )

                if response.status_code == 201:
                    pr_data = response.json()
                    state.pr_url = pr_data["html_url"]
                    state.add_log("pr_agent", f"PR created: {state.pr_url}")
                else:
                    state.error = f"PR creation failed: {response.text}"
                    state.add_log("pr_agent", state.error)

    except Exception as e:
        logger.exception("pr_agent_error", error=str(e))
        state.add_log("pr_agent", f"Error: {str(e)}")
        state.error = str(e)

    return state
