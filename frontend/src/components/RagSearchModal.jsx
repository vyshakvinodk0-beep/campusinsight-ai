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

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-3xl glass-panel bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 border border-blue-200 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Criterion 1 RAG Semantic Assistant</h2>
              <p className="text-xs text-slate-500">Query uploaded institutional evidence documents using LangChain & FAISS vector store</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Input Form */}
        <div className="p-5 border-b border-slate-200 bg-white">
          <form onSubmit={handleSearch} className="space-y-3">
            <div className="flex items-center space-x-2">
              <div className="relative flex-1">
                <Search className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="e.g. 'Show PO-CO mapping matrix evidence' or 'Are employer feedback ATRs present?'"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <select
                value={subCriterion}
                onChange={(e) => setSubCriterion(e.target.value)}
                className="px-3 py-3 rounded-xl bg-slate-50 border border-slate-300 text-slate-800 text-sm focus:outline-none"
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
                className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm disabled:opacity-50 transition-all flex items-center space-x-2 shrink-0 cursor-pointer shadow-xs"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>Retrieve</span>}
              </button>
            </div>
          </form>
        </div>

        {/* Result Content */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4 bg-slate-50/50">
          {loading && (
            <div className="text-center py-10 space-y-3">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
              <p className="text-sm text-slate-600 font-medium">Searching FAISS Vector Store & Synthesizing NAAC Evidence...</p>
            </div>
          )}

          {result && (
            <div className="space-y-5">
              {/* Answer Box */}
              <div className="p-4.5 rounded-xl bg-blue-50/80 border border-blue-200 space-y-2">
                <div className="flex items-center space-x-2 text-blue-800 text-xs font-bold uppercase tracking-wider">
                  <CheckCircle2 className="w-4 h-4 text-blue-600" />
                  <span>Synthesized NAAC Assessment Answer</span>
                </div>
                <div className="text-sm text-slate-800 whitespace-pre-line leading-relaxed font-sans font-normal">
                  {result.answer}
                </div>
              </div>

              {/* Retrieved Chunks */}
              {result.retrieved_chunks && result.retrieved_chunks.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    Retrieved Document Source Evidence ({result.retrieved_chunks.length})
                  </h4>
                  <div className="space-y-2">
                    {result.retrieved_chunks.map((c, i) => (
                      <div key={i} className="p-3.5 rounded-xl bg-white border border-slate-200 text-xs space-y-1 shadow-xs">
                        <div className="flex items-center justify-between text-blue-700 font-bold">
                          <span className="flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-blue-600" />
                            {c.filename}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10px] text-slate-700 font-mono">
                            Sub-Criterion {c.sub_criterion}
                          </span>
                        </div>
                        <p className="text-slate-700 italic">"{c.text}"</p>
                      </div>
                    ))}
                  </div>
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
