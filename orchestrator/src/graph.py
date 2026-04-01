from collections.abc import Awaitable, Callable
from enum import Enum
from typing import Optional

import structlog

from .state import AgentState, RunStatus

logger = structlog.get_logger(__name__)


class EdgeType(str, Enum):
    DIRECT = "direct"
    CONDITIONAL = "conditional"


class GraphNode:
    def __init__(
        self,
        name: str,
        handler: Callable[[AgentState], Awaitable[AgentState]],
    ) -> None:
        self.name = name
        self.handler = handler


class GraphEdge:
    def __init__(
        self,
        source: str,
        target: str,
        edge_type: EdgeType = EdgeType.DIRECT,
        condition: Optional[Callable[[AgentState], bool]] = None,
    ) -> None:
        self.source = source
        self.target = target
        self.edge_type = edge_type
        self.condition = condition


class LangGraphOrchestrator:
    def __init__(self) -> None:
        self.nodes: dict[str, GraphNode] = {}
        self.edges: list[GraphEdge] = []
        self.conditional_edges: dict[str, list[GraphEdge]] = {}

    def add_node(
        self,
        name: str,
        handler: Callable[[AgentState], Awaitable[AgentState]],
    ) -> "LangGraphOrchestrator":
        self.nodes[name] = GraphNode(name, handler)
        return self

    def add_edge(self, source: str, target: str) -> "LangGraphOrchestrator":
        self.edges.append(GraphEdge(source, target, EdgeType.DIRECT))
        return self

    def add_conditional_edge(
        self,
        source: str,
        condition: Callable[[AgentState], str],
        mappings: dict[str, str],
    ) -> "LangGraphOrchestrator":
        for target, check_value in mappings.items():
            self.edges.append(
                GraphEdge(
                    source,
                    target,
                    EdgeType.CONDITIONAL,
                    lambda state, cv=check_value: condition(state) == cv,
                )
            )
        return self

    def get_next_node(self, current: str, state: AgentState) -> Optional[str]:
        for edge in self.edges:
            if edge.source == current:
                if edge.edge_type == EdgeType.DIRECT:
                    return edge.target
                if edge.edge_type == EdgeType.CONDITIONAL and edge.condition:
                    if edge.condition(state):
                        return edge.target
        return None

    async def execute(self, state: AgentState) -> AgentState:
        state.status = RunStatus.RUNNING

        if not self.nodes:
            state.status = RunStatus.FAILED
            state.error = "No nodes registered in graph"
            return state

        current = self._get_start_node()
        if not current:
            state.status = RunStatus.FAILED
            state.error = "No start node found"
            return state

        try:
            while current and current in self.nodes:
                node = self.nodes[current]
                logger.info("executing_node", node=current, run_id=state.run_id)

                state.emit_progress(current, "started", f"Starting {current} agent...")

                state = await node.handler(state)

                state.emit_progress(current, "completed", f"{current} completed")

                if state.status == RunStatus.FAILED:
                    error_message = f"{current} failed: {state.error}"
                    state.emit_progress(current, "error", error_message)
                    logger.error("node_failed", node=current, run_id=state.run_id)
                    break

                next_node = self.get_next_node(current, state)
                if not next_node:
                    break

                current = next_node

            if state.status == RunStatus.RUNNING:
                state.status = RunStatus.COMPLETED

        except Exception as e:
            logger.exception("graph_execution_error", run_id=state.run_id, error=str(e))
            state.status = RunStatus.FAILED
            state.error = str(e)
            if current:
                state.emit_progress(current, "error", f"Error: {str(e)}")

        state.updated_at = __import__("datetime").datetime.utcnow()
        return state

    def _get_start_node(self) -> Optional[str]:
        sources = {edge.source for edge in self.edges}
        targets = {edge.target for edge in self.edges}
        start_nodes = sources - targets
        return next(iter(start_nodes)) if start_nodes else None


def create_orchestrator() -> LangGraphOrchestrator:
    return LangGraphOrchestrator()
