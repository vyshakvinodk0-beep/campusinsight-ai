import React, { useState } from 'react';
import { documentAPI } from '../services/api';
import { Search, X, Sparkles, Loader2, FileText, CheckCircle2 } from 'lucide-react';

const RagSearchModal = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [subCriterion, setSubCriterion] = useState('All');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  if (!isOpen) return null;

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setResult(null);

    try {
      const res = await documentAPI.searchRag(query, subCriterion);
      setResult(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const sampleQueries = [
    "What evidence is missing for Criterion 1.2?",
    "Why was Criterion 1.3 marked Needs Improvement?",
    "Show evidence supporting this finding.",
    "What should we upload next?",
    "Summarize the gaps in Criterion 1."
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-3xl glass-panel bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Ask Your Evidence</h2>
              <p className="text-xs text-slate-500 font-medium">Answers are generated using your uploaded institutional evidence.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Input Form & Example Chips */}
        <div className="p-5 border-b border-slate-100 bg-white space-y-3">
          <form onSubmit={handleSearch} className="space-y-3">
            <div className="flex items-center space-x-2">
              <div className="relative flex-1">
                <Search className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ask a question about your uploaded Criterion 1 evidence..."
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <select
                value={subCriterion}
                onChange={(e) => setSubCriterion(e.target.value)}
                className="px-3 py-3 rounded-xl bg-slate-50 border border-slate-300 text-slate-800 text-sm focus:outline-none font-medium"
              >
                <option value="All">All Sub-Criteria</option>
                <option value="1.1">1.1 Curriculum Design</option>
                <option value="1.2">1.2 Academic Flexibility</option>
                <option value="1.3">1.3 Curriculum Enrichment</option>
                <option value="1.4">1.4 Feedback System</option>
              </select>

              <button
                type="submit"
                disabled={loading || !query.trim()}
                className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm disabled:opacity-50 transition-all flex items-center space-x-2 shrink-0 cursor-pointer shadow-md"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>Search Evidence</span>}
              </button>
            </div>
          </form>

          {/* Sample Question Chips */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[11px] font-bold text-slate-400 mr-1">Suggested:</span>
            {sampleQueries.map((q, idx) => (
              <button
                key={idx}
                onClick={() => { setQuery(q); }}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 text-[11px] font-medium border border-slate-200 transition-all cursor-pointer"
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Result Content */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4 bg-slate-50/40">
          {loading && (
            <div className="text-center py-10 space-y-3">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
              <p className="text-sm text-slate-600 font-medium">Analyzing uploaded institutional documents...</p>
            </div>
          )}

          {!loading && !result && (
            <div className="text-center py-8 text-slate-500 text-xs font-medium space-y-1">
              <p>Type a question or pick a suggested topic above to search your uploaded documents.</p>
            </div>
          )}

          {result && (
            <div className="space-y-4">
              {/* Answer Box */}
              <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-2 shadow-xs">
                <div className="flex items-center space-x-2 text-blue-800 text-xs font-bold uppercase tracking-wider">
                  <CheckCircle2 className="w-4 h-4 text-blue-600" />
                  <span>Evidence-Based Answer</span>
                </div>
                <div className="text-sm text-slate-800 whitespace-pre-line leading-relaxed font-sans font-medium">
                  {result.answer || "No supporting evidence was found in the uploaded documents."}
                </div>
              </div>

              {/* Retrieved Chunks / Citations */}
              {result.retrieved_chunks && result.retrieved_chunks.length > 0 ? (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    Source Document Citations ({result.retrieved_chunks.length})
                  </h4>
                  <div className="space-y-2">
                    {result.retrieved_chunks.map((c, i) => (
                      <div key={i} className="p-3.5 rounded-2xl bg-white border border-slate-200 text-xs space-y-1.5 shadow-xs">
                        <div className="flex items-center justify-between text-blue-700 font-bold">
                          <span className="flex items-center gap-1.5">
                            <FileText className="w-4 h-4 text-blue-600" />
                            {c.filename}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-[10px] text-blue-700 font-mono">
                            Sub-Criterion {c.sub_criterion}
                          </span>
                        </div>
                        <p className="text-slate-700 italic bg-slate-50 p-2.5 rounded-xl border border-slate-100 font-serif">
                          "{c.text}"
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium">
                  No supporting evidence was found in the uploaded documents for this specific query.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RagSearchModal;
