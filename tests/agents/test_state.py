

from orchestrator.src.state import AgentState, RunStatus


def test_agent_state_creation():
    state = AgentState(
        run_id="test-123",
        user_id="user-1",
        issue="Fix bug in login",
        repo_url="https://github.com/test/repo",
    )
    assert state.run_id == "test-123"
    assert state.issue == "Fix bug in login"
    assert state.repo_url == "https://github.com/test/repo"
    assert state.status == RunStatus.PENDING
    assert state.code_context == ""
    assert state.plan == ""
    assert state.patch == ""
    assert state.tests == ""
    assert state.pr_url == ""
    assert state.logs == []


def test_agent_state_add_log():
    state = AgentState(
        run_id="test-123",
        user_id="user-1",
        issue="Test issue",
        repo_url="https://github.com/test/repo",
    )
    state.add_log("test_agent", "Test message")

    assert len(state.logs) == 1
    assert state.logs[0]["agent"] == "test_agent"
    assert state.logs[0]["message"] == "Test message"
    assert "timestamp" in state.logs[0]


def test_agent_state_model_dump():
    state = AgentState(
        run_id="test-123",
        user_id="user-1",
        issue="Test issue",
        repo_url="https://github.com/test/repo",
        status=RunStatus.RUNNING,
    )
    data = state.model_dump()

    assert data["run_id"] == "test-123"
    assert data["status"] == "RUNNING"


def test_agent_state_default_values():
    state = AgentState(
        run_id="test-123",
        user_id="user-1",
        issue="Test",
        repo_url="https://github.com/test/repo",
    )

    assert state.created_at is not None
    assert state.updated_at is not None
