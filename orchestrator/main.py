import uuid
from contextlib import asynccontextmanager
import sys
from pathlib import Path
from typing import Any

# Add project root and parent to path
sys.path.insert(0, str(Path(__file__).parent))  # orchestrator/
sys.path.insert(0, str(Path(__file__).parent.parent))  # project root

from fastapi import FastAPI, HTTPException  # noqa: E402
from pydantic import BaseModel  # noqa: E402
import structlog  # noqa: E402

from src.graph import LangGraphOrchestrator  # noqa: E402
from src.state import AgentState, AgentProgress, RunStatus  # noqa: E402
from src.db import (  # noqa: E402
    connect_db,
    disconnect_db,
    create_run,
    update_run,
    upsert_state,
    get_runs_for_user,
    get_run_for_user,
    get_state_for_run,
)
from shared.llm_client import create_llm_client  # noqa: E402
from shared.redis_client import create_redis_client  # noqa: E402
from agents.code_reader.agent import run as code_reader_run  # noqa: E402
from agents.planner.agent import run as planner_run  # noqa: E402
from agents.code_writer.agent import run as code_writer_run  # noqa: E402
from agents.test_writer.agent import run as test_writer_run  # noqa: E402
from agents.pr_agent.agent import run as pr_agent_run  # noqa: E402

structlog.configure(
    processors=[
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.dev.ConsoleRenderer(),
    ]
)

logger = structlog.get_logger(__name__)


class StartRunRequest(BaseModel):
    issue: str
    repo_url: str
    github_token: str | None = None
    user_id: str


class RunResponse(BaseModel):
    id: str
    issue: str
    repo_url: str
    status: str
    created_at: str


runs_store: dict[str, AgentState] = {}
llm_client = None
redis_client = None
orchestrator = None


def format_iso(value: Any) -> str:
    """Format datetimes or strings as ISO timestamps.

    Args:
        value: Datetime or string value.

    Returns:
        ISO formatted timestamp.
    """
    if isinstance(value, str):
        return value
    return value.isoformat()


def create_graph(redis_client) -> LangGraphOrchestrator:
    graph = LangGraphOrchestrator()

    def make_progress_callback(run_id: str):
        async def progress_callback(progress: AgentProgress):
            if redis_client:
                await redis_client.publish_update(
                    run_id,
                    {
                        "agent_name": progress.agent_name,
                        "event_type": progress.event_type,
                        "content": progress.content,
                        "timestamp": progress.timestamp,
                    }
                )
        return progress_callback

    async def code_reader_node(state: AgentState) -> AgentState:
        state.set_progress_callback(make_progress_callback(state.run_id))
        return await code_reader_run(state, llm_client)

    async def planner_node(state: AgentState) -> AgentState:
        state.set_progress_callback(make_progress_callback(state.run_id))
        return await planner_run(state, llm_client)

    async def code_writer_node(state: AgentState) -> AgentState:
        state.set_progress_callback(make_progress_callback(state.run_id))
        return await code_writer_run(state, llm_client)

    async def test_writer_node(state: AgentState) -> AgentState:
        state.set_progress_callback(make_progress_callback(state.run_id))
        return await test_writer_run(state, llm_client)

    async def pr_agent_node(state: AgentState) -> AgentState:
        state.set_progress_callback(make_progress_callback(state.run_id))
        return await pr_agent_run(state, llm_client)

    graph.add_node("code_reader", code_reader_node)
    graph.add_node("planner", planner_node)
    graph.add_node("code_writer", code_writer_node)
    graph.add_node("test_writer", test_writer_node)
    graph.add_node("pr_agent", pr_agent_node)

    graph.add_edge("code_reader", "planner")
    graph.add_edge("planner", "code_writer")
    graph.add_edge("code_writer", "test_writer")
    graph.add_edge("test_writer", "pr_agent")

    return graph


@asynccontextmanager
async def lifespan(app: FastAPI):
    global llm_client, redis_client, orchestrator
    import os
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).parent.parent / ".env")

    llm_client = create_llm_client(os.environ.get("NEBIUS_API_KEY", ""))
    redis_host = os.environ.get("REDIS_HOST", "localhost")
    redis_port = int(os.environ.get("REDIS_PORT", "6379"))
    redis_client = create_redis_client(host=redis_host, port=redis_port)
    await redis_client.connect()
    await connect_db()
    orchestrator = create_graph(redis_client)

    logger.info("orchestrator_started")
    yield

    await disconnect_db()
    await llm_client.close()
    await redis_client.close()
    logger.info("orchestrator_stopped")


app = FastAPI(title="Agent Orchestrator", lifespan=lifespan)


@app.post("/api/runs", response_model=RunResponse)
async def start_run(request: StartRunRequest):
    run_id = str(uuid.uuid4())
    state = AgentState(
        run_id=run_id,
        user_id=request.user_id,
        issue=request.issue,
        repo_url=request.repo_url,
        github_token=request.github_token,
    )

    await create_run(
        run_id=run_id,
        user_id=request.user_id,
        issue=request.issue,
        repo_url=request.repo_url,
        status=RunStatus.RUNNING.value,
    )
    runs_store[run_id] = state
    logger.info("run_started", run_id=run_id)

    result = await orchestrator.execute(state)
    runs_store[run_id] = result
    await update_run(
        run_id=run_id,
        status=result.status.value,
        error=result.error,
        pr_url=result.pr_url or None,
    )
    await upsert_state(result)

    return RunResponse(
        id=result.run_id,
        issue=result.issue,
        repo_url=result.repo_url,
        status=result.status.value,
        created_at=result.created_at.isoformat(),
    )


@app.get("/api/runs", response_model=list[RunResponse])
async def get_runs(user_id: str, limit: int = 50, offset: int = 0):
    runs = await get_runs_for_user(user_id=user_id, limit=limit, offset=offset)
    return [
        RunResponse(
            id=run["id"],
            issue=run["issue"],
            repo_url=run["repoUrl"],
            status=run["status"],
            created_at=format_iso(run["createdAt"]),
        )
        for run in runs
    ]


@app.get("/api/runs/{run_id}")
async def get_run_details(run_id: str, user_id: str):
    run = await get_run_for_user(run_id=run_id, user_id=user_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")

    state = runs_store.get(run_id)
    if state and state.user_id == user_id:
        return {
            "id": state.run_id,
            "issue": state.issue,
            "repo_url": state.repo_url,
            "status": state.status.value,
            "error": state.error,
            "plan": state.plan,
            "patch": state.patch,
            "tests": state.tests,
            "pr_url": state.pr_url,
            "logs": state.logs,
            "created_at": state.created_at.isoformat(),
            "updated_at": state.updated_at.isoformat(),
        }

    stored_state = await get_state_for_run(run_id)
    if not stored_state:
        return {
            "id": run["id"],
            "issue": run["issue"],
            "repo_url": run["repoUrl"],
            "status": run["status"],
            "error": run.get("error"),
            "plan": None,
            "patch": None,
            "tests": None,
            "pr_url": run.get("prUrl"),
            "logs": [],
            "created_at": format_iso(run["createdAt"]),
            "updated_at": format_iso(run["updatedAt"]),
        }

    return {
        "id": stored_state.get("run_id", run["id"]),
        "issue": stored_state.get("issue", run["issue"]),
        "repo_url": stored_state.get("repo_url", run["repoUrl"]),
        "status": stored_state.get("status", run["status"]),
        "error": stored_state.get("error"),
        "plan": stored_state.get("plan"),
        "patch": stored_state.get("patch"),
        "tests": stored_state.get("tests"),
        "pr_url": stored_state.get("pr_url") or run.get("prUrl"),
        "logs": stored_state.get("logs", []),
        "created_at": stored_state.get("created_at", format_iso(run["createdAt"])),
        "updated_at": stored_state.get("updated_at", format_iso(run["updatedAt"])),
    }


@app.get("/api/runs/{run_id}/logs")
async def get_run_logs(run_id: str, user_id: str):
    run = await get_run_for_user(run_id=run_id, user_id=user_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")

    state = runs_store.get(run_id)
    if state and state.user_id == user_id:
        return state.logs

    stored_state = await get_state_for_run(run_id)
    if not stored_state:
        return []
    return stored_state.get("logs", [])


@app.post("/api/runs/{run_id}/retry")
async def retry_run(run_id: str, user_id: str):
    run = await get_run_for_user(run_id=run_id, user_id=user_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")

    state = runs_store[run_id]
    state.status = RunStatus.PENDING
    state.error = None

    result = await orchestrator.execute(state)
    runs_store[run_id] = result
    await update_run(
        run_id=run_id,
        status=result.status.value,
        error=result.error,
        pr_url=result.pr_url or None,
    )
    await upsert_state(result)

    return RunResponse(
        id=result.run_id,
        issue=result.issue,
        repo_url=result.repo_url,
        status=result.status.value,
        created_at=result.created_at.isoformat(),
    )


@app.post("/api/runs/{run_id}/cancel")
async def cancel_run(run_id: str, user_id: str):
    run = await get_run_for_user(run_id=run_id, user_id=user_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")

    state = runs_store[run_id]
    state.status = RunStatus.CANCELLED
    state.add_log("orchestrator", "Run cancelled by user")

    await update_run(
        run_id=run_id,
        status=state.status.value,
        error=state.error,
        pr_url=state.pr_url or None,
    )
    await upsert_state(state)

    return RunResponse(
        id=state.run_id,
        issue=state.issue,
        repo_url=state.repo_url,
        status=state.status.value,
        created_at=state.created_at.isoformat(),
    )


@app.get("/health")
async def health():
    return {"status": "healthy"}
