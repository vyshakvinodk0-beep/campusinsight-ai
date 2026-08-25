import React, { useState } from 'react';
import { Cpu, CheckCircle2, Clock, AlertCircle, RefreshCw, ChevronDown, ChevronUp, FileText, ArrowRight } from 'lucide-react';

const AgentPipelineVisualizer = ({ onRetryAgent }) => {
  const [expandedNode, setExpandedNode] = useState(null);
  const [isRetrying, setIsRetrying] = useState(false);

  const agentNodes = [
    {
      id: "doc_analysis",
      name: "✓ Document Analysis",
      status: "Success",
      time: "1.2s",
      summary: "Extracts important information from uploaded evidence.",
      log: "Input: PDF/DOCX Document -> Output: Clean extracted text and structure."
    },
    {
      id: "criteria_mapping",
      name: "✓ Criteria Mapping",
      status: "Success",
      time: "1.8s",
      summary: "Connects evidence to the relevant Criterion 1 requirement.",
      log: "Mapped documents to Sub-Criteria 1.1, 1.2, 1.3, and 1.4 requirements."
    },
    {
      id: "gap_detection",
      name: "✓ Gap Detection",
      status: "Success",
      time: "1.5s",
      summary: "Identifies missing or incomplete evidence.",
      log: "Identified missing Action Taken Report (1.4.2) and attendance logs (1.3.2)."
    },
    {
      id: "recommendation",
      name: "✓ Recommendation Generation",
      status: "Success",
      time: "1.1s",
      summary: "Suggests actions to address identified gaps.",
      log: "Formulated recommended action steps and priority sequence."
    },
    {
      id: "decision_attribution",
      name: "✓ Explanation",
      status: "Success",
      time: "0.7s",
      summary: "Shows the evidence supporting the finding.",
      log: "Computed evidence attribution weights and verified traceability links."
    }
  ];

  const handleRetry = (nodeId) => {
    setIsRetrying(true);
    setTimeout(() => {
      setIsRetrying(false);
      if (onRetryAgent) onRetryAgent(nodeId);
    }, 1200);
  };

  return (
    <div className="glass-card p-6 rounded-3xl border border-slate-200 bg-white space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Cpu className="w-5 h-5 text-blue-600" />
            AI Analysis Process
          </h3>
          <p className="text-xs text-slate-500">
            Automated multi-stage verification connecting uploaded evidence to NAAC Criterion 1 requirements.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Analysis Up-to-Date</span>
          </span>
        </div>
      </div>

      {/* Process Flow Diagram */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {agentNodes.map((node, index) => {
          const isExpanded = expandedNode === node.id;
          return (
            <div
              key={node.id}
              className={`p-4 rounded-2xl border transition-all ${
                isExpanded ? 'bg-blue-50/80 border-blue-300 ring-2 ring-blue-500/20' : 'bg-slate-50 border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-900">{node.name}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-700">
                  {node.time}
                </span>
              </div>

              <p className="text-xs text-slate-600 mt-2 leading-relaxed">{node.summary}</p>

              <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-200/60">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Stage {index + 1}</span>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleRetry(node.id)}
                    disabled={isRetrying}
                    className="p-1 rounded text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
                    title="Re-run Stage"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
                  </button>
                  <button
                    onClick={() => setExpandedNode(isExpanded ? null : node.id)}
                    className="text-[11px] font-semibold text-blue-600 flex items-center gap-0.5 hover:underline cursor-pointer"
                  >
                    <span>{isExpanded ? 'Hide' : 'Log'}</span>
                    {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="mt-3 p-2.5 rounded-xl bg-slate-900 text-slate-200 font-mono text-[10px] space-y-1">
                  <p className="text-emerald-400">Stage Status: Verified</p>
                  <p>{node.log}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AgentPipelineVisualizer;
