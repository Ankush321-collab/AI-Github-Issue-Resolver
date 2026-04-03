import pytest

from orchestrator.src.graph import LangGraphOrchestrator, EdgeType
from orchestrator.src.state import AgentState, RunStatus


@pytest.mark.asyncio
async def test_graph_node_execution():
    graph = LangGraphOrchestrator()

    async def handler(state: AgentState) -> AgentState:
        state.add_log("test_node", "Node executed")
        return state

    graph.add_node("test_node", handler)
    graph.add_edge("test_node", "end")

    state = AgentState(
        run_id="test-123",
        user_id="user-1",
        issue="Test",
        repo_url="https://github.com/test/repo",
    )
    result = await graph.execute(state)

    assert len(result.logs) == 1
    assert result.logs[0]["message"] == "Node executed"


@pytest.mark.asyncio
async def test_graph_multiple_nodes():
    graph = LangGraphOrchestrator()

    async def node1(state: AgentState) -> AgentState:
        state.add_log("node1", "First node")
        return state

    async def node2(state: AgentState) -> AgentState:
        state.add_log("node2", "Second node")
        return state

    graph.add_node("node1", node1)
    graph.add_node("node2", node2)
    graph.add_edge("node1", "node2")

    state = AgentState(
        run_id="test-123",
        user_id="user-1",
        issue="Test",
        repo_url="https://github.com/test/repo",
    )
    result = await graph.execute(state)

    assert len(result.logs) == 2
    assert result.status == RunStatus.COMPLETED


@pytest.mark.asyncio
async def test_graph_status_on_error():
    graph = LangGraphOrchestrator()

    async def failing_node(state: AgentState) -> AgentState:
        state.status = RunStatus.FAILED
        state.error = "Test error"
        return state

    graph.add_node("failing", failing_node)

    state = AgentState(
        run_id="test-123",
        user_id="user-1",
        issue="Test",
        repo_url="https://github.com/test/repo",
    )
    result = await graph.execute(state)

    assert result.status == RunStatus.FAILED
    assert result.error == "Test error"


def test_graph_add_edge():
    graph = LangGraphOrchestrator()
    graph.add_edge("node_a", "node_b")

    assert len(graph.edges) == 1
    assert graph.edges[0].source == "node_a"
    assert graph.edges[0].target == "node_b"
    assert graph.edges[0].edge_type == EdgeType.DIRECT


def test_graph_get_next_node():
    graph = LangGraphOrchestrator()
    graph.add_edge("node_a", "node_b")

    state = AgentState(
        run_id="test",
        user_id="user-1",
        issue="Test",
        repo_url="https://github.com/test/repo",
    )
    next_node = graph.get_next_node("node_a", state)

    assert next_node == "node_b"


def test_graph_get_next_node_no_edge():
    graph = LangGraphOrchestrator()

    state = AgentState(
        run_id="test",
        user_id="user-1",
        issue="Test",
        repo_url="https://github.com/test/repo",
    )
    next_node = graph.get_next_node("node_a", state)

    assert next_node is None
