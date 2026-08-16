import logging
from app.agents.state import AgentState
from app.core.config import settings

logger = logging.getLogger("recommendation_agent")

def recommendation_agent(state: AgentState) -> AgentState:
    """
    Recommendation Agent: Generates actionable recommendations using Gemini 2.5 Flash
    (or fallback AI logic) for improving NAAC Criterion 1 readiness.
    """
    gaps = state.get("detected_gaps", [])
    doc_analysis = state.get("doc_analysis", {})
    filename = state.get("filename", "")
    
    recommendations = []

    # If Gemini API key is configured, invoke Gemini 2.5 Flash
    if settings.GEMINI_API_KEY:
        try:
            from langchain_google_genai import ChatGoogleGenerativeAI
            llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", google_api_key=settings.GEMINI_API_KEY)
            prompt = (
                f"You are CampusInsight AI, an expert NAAC Accreditation Recommendation Agent for Criterion 1 (Curricular Aspects).\n"
                f"Document: {filename}\n"
                f"Detected Quality Gaps: {gaps}\n\n"
                f"Generate 3 precise, actionable NAAC accreditation improvement recommendations."
            )
            response = llm.invoke(prompt)
            recommendations.append({
                "sub_criterion": doc_analysis.get("primary_sub_criterion", "1.1"),
                "title": f"Gemini AI Recommendation for {filename}",
                "recommendation_text": response.content,
                "priority": "High",
                "action_items": [
                    "Review PO-CO attainment sheets with departmental BoS.",
                    "Obtain institutional head approval for ATR.",
                    "Archive digitized certificate course attendance."
                ]
            })
        except Exception as e:
            logger.warning(f"Gemini API invocation failed: {e}. Falling back to heuristic recommendation generator.")

    if not recommendations:
        # Fallback intelligent recommendations based on detected gaps
        for gap in gaps[:4]:
            recommendations.append({
                "sub_criterion": gap["sub_criterion"],
                "title": f"Targeted Improvement: {gap['title']}",
                "recommendation_text": (
                    f"To address the identified gap in Sub-Criterion {gap['sub_criterion']}, the department should: "
                    f"{gap['recommended_action']} Ensure evidence is indexed with institutional seal and uploaded to the NAAC portal."
                ),
                "priority": gap["severity"],
                "action_items": [
                    f"Action 1: Execute '{gap['recommended_action']}'",
                    f"Action 2: Verify compliance against NAAC Sub-Criterion {gap['sub_criterion']} metrics.",
                    "Action 3: Store signed PDF in CampusInsight document repository."
                ]
            })

    if not recommendations:
        recommendations.append({
            "sub_criterion": "1.1",
            "title": "General NAAC Criterion 1 Best Practice Alignment",
            "recommendation_text": "Maintain systematic digital records of all curriculum revisions, feedback analysis reports, and credit transfer approvals.",
            "priority": "Medium",
            "action_items": ["Conduct annual departmental curriculum audit."]
        })

    state["recommendations"] = recommendations
    return state
