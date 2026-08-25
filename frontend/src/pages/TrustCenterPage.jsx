import React from 'react';
import { ShieldCheck, CheckCircle, AlertTriangle, FileText, Lock, Cpu, Eye, Sparkles, Scale, Info } from 'lucide-react';

const TrustCenterPage = () => {
  const trustMetrics = [
    { label: "Evidence Traceability", value: "100%", desc: "Page-level citation for every claim", color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
    { label: "Human Validation Rate", value: "68%", desc: "Faculty, HOD & Principal verified", color: "text-blue-600 bg-blue-50 border-blue-200" },
    { label: "AI Findings Generated", value: "42", desc: "Automated agent evidence maps", color: "text-indigo-600 bg-indigo-50 border-indigo-200" },
    { label: "Human Overrides Recorded", value: "3", desc: "Audited human expert overrides", color: "text-purple-600 bg-purple-50 border-purple-200" },
    { label: "Evidence Conflicts Detected", value: "2", desc: "Flagged for human resolution", color: "text-amber-600 bg-amber-50 border-amber-200" },
    { label: "Unverified Documents", value: "7", desc: "Pending HOD/Principal review", color: "text-slate-600 bg-slate-50 border-slate-200" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-card p-6 rounded-3xl bg-gradient-to-r from-indigo-900 via-purple-900 to-slate-900 text-white shadow-xl space-y-2">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Governance, Audit & Explainability</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">AI Trust & Governance Center</h1>
        <p className="text-sm text-slate-300 max-w-3xl">
          CampusInsight AI provides evidence analysis and decision support. Final accreditation decisions remain under authorized human review.
        </p>
      </div>

      {/* Mandatory Disclaimer Alert */}
      <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-blue-900 flex items-start space-x-3">
        <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="text-xs leading-relaxed">
          <span className="font-bold">Trust & Integrity Assurance:</span> All readiness indices calculated in CampusInsight AI are transparent, deterministic metrics based strictly on uploaded institutional evidence. The system uses zero speculative machine learning models and strictly enforces citation lineage from claim to page numbers.
        </div>
      </div>

      {/* Grid of Trust Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {trustMetrics.map((m, idx) => (
          <div key={idx} className={`p-5 rounded-2xl border ${m.color} space-y-2 transition-all hover:scale-[1.01]`}>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{m.label}</p>
            <p className="text-3xl font-black">{m.value}</p>
            <p className="text-xs font-medium text-slate-600">{m.desc}</p>
          </div>
        ))}
      </div>

      {/* Core AI Guarantees: What AI does vs What AI does NOT do */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* What AI does */}
        <div className="glass-card p-6 rounded-3xl border border-emerald-200 bg-emerald-50/40 space-y-4">
          <div className="flex items-center space-x-2 text-emerald-900 font-bold text-base">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
            <h3>What the AI does:</h3>
          </div>
          <ul className="text-xs text-slate-700 space-y-2 font-medium">
            <li className="flex items-start gap-2">
              <span className="text-emerald-600 font-bold">✓</span>
              <span>Reads and processes your uploaded institutional evidence documents.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-600 font-bold">✓</span>
              <span>Retrieves relevant information and excerpts using RAG vector search.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-600 font-bold">✓</span>
              <span>Maps evidence directly to NAAC Criterion 1 (1.1, 1.2, 1.3, 1.4) requirements.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-600 font-bold">✓</span>
              <span>Identifies missing documents, incomplete evidence, and format gaps.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-600 font-bold">✓</span>
              <span>Generates prioritized, step-by-step remediation action recommendations.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-600 font-bold">✓</span>
              <span>Provides verifiable page-level source citations for all findings.</span>
            </li>
          </ul>
        </div>

        {/* What AI does NOT do */}
        <div className="glass-card p-6 rounded-3xl border border-rose-200 bg-rose-50/40 space-y-4">
          <div className="flex items-center space-x-2 text-rose-900 font-bold text-base">
            <AlertTriangle className="w-5 h-5 text-rose-600" />
            <h3>What the AI does NOT do:</h3>
          </div>
          <ul className="text-xs text-slate-700 space-y-2 font-medium">
            <li className="flex items-start gap-2">
              <span className="text-rose-600 font-bold">✕</span>
              <span>It does NOT provide an official NAAC score or grade prediction.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-rose-600 font-bold">✕</span>
              <span>It does NOT replace human validation by Faculty, HOD, or Principal.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-rose-600 font-bold">✕</span>
              <span>It does NOT invent, assume, or hallucinate institutional evidence.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-rose-600 font-bold">✕</span>
              <span>It does NOT make final institutional accreditation decisions.</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default TrustCenterPage;
