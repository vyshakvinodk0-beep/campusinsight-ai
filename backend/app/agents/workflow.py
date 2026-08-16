from langgraph.graph import StateGraph, END
from app.agents.state import AgentState
from app.agents.doc_analysis_agent import document_analysis_agent
from app.agents.evidence_verification_agent import evidence_verification_agent
from app.agents.criteria_mapper_agent import criteria_mapping_agent
from app.agents.gap_detection_agent import gap_detection_agent
from app.agents.recommendation_agent import recommendation_agent
from app.agents.explanation_agent import explanation_agent

def build_langgraph_workflow():
    """
    Builds and compiles the 6-agent LangGraph StateGraph workflow for NAAC Criterion 1 evidence analysis:
    Document Analysis -> Evidence Verification -> Criteria Mapping -> Gap Detection -> Recommendation -> Decision Explanation
    """
    workflow = StateGraph(AgentState)

    # Define Agent Nodes
    workflow.add_node("document_analysis_agent", document_analysis_agent)
    workflow.add_node("evidence_verification_agent", evidence_verification_agent)
    workflow.add_node("criteria_mapping_agent", criteria_mapping_agent)
    workflow.add_node("gap_detection_agent", gap_detection_agent)
    workflow.add_node("recommendation_agent", recommendation_agent)
    workflow.add_node("explanation_agent", explanation_agent)

    # Set Entry Point
    workflow.set_entry_point("document_analysis_agent")

    # Connect Edges sequentially
    workflow.add_edge("document_analysis_agent", "evidence_verification_agent")
    workflow.add_edge("evidence_verification_agent", "criteria_mapping_agent")
    workflow.add_edge("criteria_mapping_agent", "gap_detection_agent")
    workflow.add_edge("gap_detection_agent", "recommendation_agent")
    workflow.add_edge("recommendation_agent", "explanation_agent")
    workflow.add_edge("explanation_agent", END)

    app = workflow.compile()
    return app

langgraph_agent_pipeline = build_langgraph_workflow()
