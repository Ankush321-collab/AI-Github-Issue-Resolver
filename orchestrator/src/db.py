from __future__ import annotations

from typing import Any

from prisma import Prisma, Json

from .state import AgentState

prisma = Prisma()


async def connect_db() -> None:
    """Connect the Prisma client.

    Returns:
        None
    """
    await prisma.connect()


async def disconnect_db() -> None:
    """Disconnect the Prisma client.

    Returns:
        None
    """
    await prisma.disconnect()


async def create_run(
    *,
    run_id: str,
    user_id: str,
    issue: str,
    repo_url: str,
    status: str,
) -> None:
    """Create a run record for the user.

    Args:
        run_id: Run identifier.
        user_id: User identifier.
        issue: Issue text.
        repo_url: Repository URL.
        status: Run status.

    Returns:
        None
    """
    await prisma.agentrun.create(
        data={
            "id": run_id,
            "userId": user_id,
            "issue": issue,
            "repoUrl": repo_url,
            "status": status,
        }
    )


async def update_run(
    *,
    run_id: str,
    status: str,
    error: str | None,
    pr_url: str | None,
) -> None:
    """Update run status and metadata.

    Args:
        run_id: Run identifier.
        status: Run status.
        error: Error message if present.
        pr_url: Pull request URL if available.

    Returns:
        None
    """
    await prisma.agentrun.update(
        where={"id": run_id},
        data={
            "status": status,
            "error": error,
            "prUrl": pr_url,
        },
    )


async def upsert_state(state: AgentState) -> None:
    """Persist the agent state JSON for the run.

    Args:
        state: Agent state payload.

    Returns:
        None
    """
    payload = state.model_dump(mode="json")
    await prisma.agentstate.upsert(
        where={"runId": state.run_id},
        data={
            "create": {
                "runId": state.run_id,
                "stateJson": Json(payload),
            },
            "update": {"stateJson": Json(payload)},
        },
    )


async def get_runs_for_user(
    *,
    user_id: str,
    limit: int,
    offset: int,
) -> list[dict[str, Any]]:
    """Fetch runs for a user.

    Args:
        user_id: User identifier.
        limit: Maximum number of runs.
        offset: Pagination offset.

    Returns:
        List of run records.
    """
    results = await prisma.agentrun.find_many(
        where={"userId": user_id},
        order={"createdAt": "desc"},
        skip=offset,
        take=limit,
    )
    return [item.model_dump() for item in results]


async def get_run_for_user(*, run_id: str, user_id: str) -> dict[str, Any] | None:
    """Fetch a single run for a user.

    Args:
        run_id: Run identifier.
        user_id: User identifier.

    Returns:
        Run record when found, otherwise None.
    """
    result = await prisma.agentrun.find_first(
        where={"id": run_id, "userId": user_id}
    )
    return result.model_dump() if result else None


async def get_state_for_run(run_id: str) -> dict[str, Any] | None:
    """Fetch persisted state JSON for a run.

    Args:
        run_id: Run identifier.

    Returns:
        State JSON when found, otherwise None.
    """
    result = await prisma.agentstate.find_unique(where={"runId": run_id})
    if not result:
        return None
    return result.stateJson
