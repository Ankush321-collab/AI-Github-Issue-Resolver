from collections.abc import Callable
from datetime import datetime
from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, Field


class RunStatus(str, Enum):
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"


class TaskStatus(str, Enum):
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class AgentProgress(BaseModel):
    run_id: str
    agent_name: str
    event_type: str
    content: str = ""
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class AgentState(BaseModel):
    run_id: str
    issue: str
    repo_url: str
    code_context: str = ""
    plan: str = ""
    complexity: Optional[str] = None
    patch: str = ""
    tests: str = ""
    pr_url: str = ""
    status: RunStatus = RunStatus.PENDING
    error: Optional[str] = None
    logs: list[dict[str, Any]] = Field(default_factory=list)
    progress_events: list[dict[str, Any]] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    _progress_callback: Optional[Callable[[AgentProgress], Any]] = None

    def set_progress_callback(self, callback: Callable[[AgentProgress], Any]) -> None:
        self._progress_callback = callback

    def emit_progress(self, agent_name: str, event_type: str, content: str) -> None:
        event = AgentProgress(
            run_id=self.run_id,
            agent_name=agent_name,
            event_type=event_type,
            content=content,
        )
        self.progress_events.append(event.model_dump())
        self.updated_at = datetime.utcnow()
        if self._progress_callback:
            self._progress_callback(event)

    def add_log(self, agent: str, message: str) -> None:
        self.logs.append(
            {
                "agent": agent,
                "timestamp": datetime.utcnow().isoformat(),
                "message": message,
            }
        )
        self.updated_at = datetime.utcnow()

    def model_dump(self, **kwargs: Any) -> dict[str, Any]:
        data = super().model_dump(**kwargs)
        data["status"] = self.status.value
        return data

    class Config:
        use_enum_values = True
