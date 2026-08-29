import React, { useState, useEffect } from 'react';
import { analyticsAPI } from '../services/api';
import { ShieldCheck, CheckCircle, AlertTriangle, Lock, Cpu, Eye, Sparkles, Scale, Info, Loader2, RefreshCw } from 'lucide-react';

const TrustCenterPage = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTrustStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await analyticsAPI.getTrustCenter();
      setStats(res.data);
    } catch (err) {
      console.error('Failed to load trust center stats:', err);
      setError('Unable to load live trust metrics. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrustStats();
  }, []);

  const buildTrustMetrics = (data) => [
    {
      label: "Evidence Traceability",
      value: `${data?.evidence_traceability_pct ?? 100}%`,
      desc: "Page-level citation for every claim",
      color: "text-emerald-600 bg-emerald-50 border-emerald-200"
    },
    {
      label: "Human Validation Rate",
      value: `${data?.human_validation_pct ?? 0}%`,
      desc: `${data?.validated_documents ?? 0} of ${data?.total_documents ?? 0} docs verified`,
      color: "text-blue-600 bg-blue-50 border-blue-200"
    },
    {
      label: "AI Findings Generated",
      value: String(data?.ai_findings_count ?? 0),
      desc: "Evidence items + gaps + recommendations",
      color: "text-indigo-600 bg-indigo-50 border-indigo-200"
    },
    {
      label: "Human Overrides Recorded",
      value: String(data?.human_overrides_count ?? 0),
      desc: "Audited human expert overrides",
      color: "text-purple-600 bg-purple-50 border-purple-200"
    },
    {
      label: "Evidence Conflicts Detected",
      value: String(data?.evidence_conflicts_count ?? 0),
      desc: "Flagged for human resolution",
      color: "text-amber-600 bg-amber-50 border-amber-200"
    },
    {
      label: "Unverified Documents",
      value: String(data?.unverified_documents_count ?? 0),
      desc: "Pending HOD/Principal review",
      color: "text-slate-600 bg-slate-50 border-slate-200"
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-card p-6 rounded-3xl bg-gradient-to-r from-indigo-900 via-purple-900 to-slate-900 text-white shadow-xl space-y-2">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Governance, Audit &amp; Explainability</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">AI Trust &amp; Governance Center</h1>
            <p className="text-sm text-slate-300 max-w-3xl">
              CampusInsight AI provides evidence analysis and decision support. Final accreditation decisions remain under authorized human review.
            </p>
          </div>
          <button
            onClick={fetchTrustStats}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-semibold transition-all disabled:opacity-60"
            title="Refresh live metrics"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Mandatory Disclaimer Alert */}
      <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-blue-900 flex items-start space-x-3">
        <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="text-xs leading-relaxed">
          <span className="font-bold">Trust &amp; Integrity Assurance:</span> All readiness indices calculated in CampusInsight AI are transparent, deterministic metrics based strictly on uploaded institutional evidence. The system uses zero speculative machine learning models and strictly enforces citation lineage from claim to page numbers.
        </div>
      </div>

      {/* Live Metrics Grid */}
      {loading ? (
        <div className="p-12 flex flex-col items-center justify-center gap-3 glass-card rounded-3xl border border-slate-200">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
          <p className="text-sm text-slate-500 font-medium">Loading live trust metrics...</p>
        </div>
      ) : error ? (
        <div className="p-6 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-medium flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          {error}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {buildTrustMetrics(stats).map((m, idx) => (
            <div key={idx} className={`p-5 rounded-2xl border ${m.color} space-y-2 transition-all hover:scale-[1.01]`}>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{m.label}</p>
              <p className="text-3xl font-black">{m.value}</p>
              <p className="text-xs font-medium text-slate-600">{m.desc}</p>
            </div>
          ))}
        </div>
      )}

      {/* Live summary bar */}
      {!loading && !error && stats && (
        <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200 flex flex-wrap gap-6 items-center text-xs">
          <div className="flex items-center gap-2 text-indigo-800">
            <Sparkles className="w-4 h-4 text-indigo-500" />
            <span className="font-bold">Total Documents:</span>
            <span className="font-black text-indigo-700">{stats.total_documents}</span>
          </div>
          <div className="flex items-center gap-2 text-emerald-800">
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            <span className="font-bold">Fully Validated:</span>
            <span className="font-black text-emerald-700">{stats.validated_documents}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-600">
            <Scale className="w-4 h-4 text-slate-500" />
            <span className="font-medium italic">{stats.disclaimer}</span>
          </div>
        </div>
      )}

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

      {/* Audit Trail Principles */}
      <div className="glass-card p-6 rounded-3xl border border-slate-200 bg-white space-y-4">
        <div className="flex items-center gap-2 font-bold text-slate-900 text-base">
          <Eye className="w-5 h-5 text-indigo-600" />
          <h3>Audit Trail &amp; Explainability Principles</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
            <div className="flex items-center gap-2 font-bold text-slate-800">
              <Lock className="w-4 h-4 text-indigo-500" />
              Immutable Audit Log
            </div>
            <p className="text-slate-500">Every AI action, human override, and validation decision is logged with timestamp and user identity.</p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
            <div className="flex items-center gap-2 font-bold text-slate-800">
              <Cpu className="w-4 h-4 text-purple-500" />
              Deterministic Scoring
            </div>
            <p className="text-slate-500">Readiness indices are calculated using a fixed, transparent formula — not a black-box ML model.</p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
            <div className="flex items-center gap-2 font-bold text-slate-800">
              <Scale className="w-4 h-4 text-emerald-500" />
              Human-in-the-Loop
            </div>
            <p className="text-slate-500">Faculty, HOD, and Principal validation is required before any evidence is considered finalized.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrustCenterPage;
