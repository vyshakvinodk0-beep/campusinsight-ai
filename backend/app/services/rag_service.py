import logging
from typing import Dict, Any, List, Optional
from app.services.vector_store import vector_store_service
from app.core.config import settings

logger = logging.getLogger("rag_service")

class RagService:
    @staticmethod
    def answer_query(query: str, sub_criterion: str = "All", top_k: int = 4, doc_id: Optional[int] = None) -> Dict[str, Any]:
        """
        Retrieves relevant Criterion 1 document chunks and synthesizes an answer.
        """
        chunks = vector_store_service.search(query=query, sub_criterion=sub_criterion, top_k=top_k, doc_id=doc_id)
        
        if not chunks:
            return {
                "answer": f"No specific document evidence found in the vector store matching '{query}'. Please upload relevant NAAC Criterion 1 documents (Syllabus, Minutes of Meeting, ATR, Feedback Reports, Certificate Course records).",
                "retrieved_chunks": []
            }

        context_str = "\n\n".join([f"[Doc: {c['filename']} | Sub-Criterion {c['sub_criterion']}]:\n{c['text']}" for c in chunks])

        # If Gemini key is set, use Gemini for synthesis
        answer = ""
        if settings.GEMINI_API_KEY:
            try:
                from langchain_google_genai import ChatGoogleGenerativeAI
                llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", google_api_key=settings.GEMINI_API_KEY)
                prompt = (
                    f"You are CampusInsight AI, an expert NAAC Accreditation Assessor for Criterion 1 (Curricular Aspects).\n"
                    f"User Query: {query}\n\n"
                    f"Retrieved Document Evidence:\n{context_str}\n\n"
                    f"Provide a clear, detailed, professional assessment response citing the retrieved documents where applicable."
                )
                response = llm.invoke(prompt)
                answer = response.content
            except Exception as e:
                logger.warning(f"Gemini API invocation failed: {e}. Using rule-based synthesizer.")
                answer = RagService._synthesize_fallback(query, chunks)
        else:
            answer = RagService._synthesize_fallback(query, chunks)

        return {
            "answer": answer,
            "retrieved_chunks": chunks
        }

    @staticmethod
    def _synthesize_fallback(query: str, chunks: List[Dict[str, Any]]) -> str:
        doc_names = list(set([c['filename'] for c in chunks]))
        sub_crit_list = list(set([c['sub_criterion'] for c in chunks]))
        
        summary_intro = (
            f"Based on the analysis of uploaded NAAC Criterion 1 documents ({', '.join(doc_names)}), "
            f"the relevant evidence for sub-criteria ({', '.join(sub_crit_list)}) indicates:\n\n"
        )
        
        body_points = []
        for i, c in enumerate(chunks, 1):
            snippet = c['text'][:300] + ("..." if len(c['text']) > 300 else "")
            body_points.append(f"{i}. **From {c['filename']} (Sub-Criterion {c['sub_criterion']})**:\n   \"{snippet}\"")
        
        conclusion = (
            "\n\n**NAAC Criterion 1 Assessment Note**:\n"
            "- Ensure alignment between Programme Outcomes (PO), Programme Specific Outcomes (PSO), and Course Outcomes (CO).\n"
            "- Verify that Action Taken Reports (ATR) for stakeholder feedback are formally signed by the Academic Council."
        )
        
        return summary_intro + "\n\n".join(body_points) + conclusion

rag_service = RagService()
