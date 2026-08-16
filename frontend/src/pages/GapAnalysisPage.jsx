import React, { useEffect, useState } from 'react';
import { criterionAPI, analyticsAPI } from '../services/api';
import ShapVisualizer from '../components/ShapVisualizer';
import { AlertTriangle, Lightbulb, Filter, Loader2, Sparkles } from 'lucide-react';

const GapAnalysisPage = () => {
  const [gaps, setGaps] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [selectedSub, setSelectedSub] = useState('1.1');
  const [shapData, setShapData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [gapsRes, recsRes, shapRes] = await Promise.all([
          criterionAPI.getGaps(selectedSub),
          criterionAPI.getRecommendations(selectedSub),
          analyticsAPI.getShapExplanation(selectedSub)
        ]);
        setGaps(gapsRes.data);
        setRecommendations(recsRes.data);
        setShapData(shapRes.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedSub]);

  const handleStatusChange = async (gapId, newStatus) => {
    try {
      await criterionAPI.updateGapStatus(gapId, newStatus);
      setGaps((prev) =>
        prev.map((g) => (g.id === gapId ? { ...g, status: newStatus } : g))
      );
    } catch (err) {
      console.error('Failed to update gap status', err);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-amber-600" />
            Gap Analysis & SHAP Explainable AI
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Detects missing evidence, incomplete documentation, and quantifies feature attributions via SHAP.
          </p>
        </div>

        {/* Sub-criterion selector */}
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-slate-500" />
          <select
            value={selectedSub}
            onChange={(e) => setSelectedSub(e.target.value)}
            className="px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-slate-800 text-xs font-semibold focus:outline-none shadow-xs"
          >
            <option value="1.1">1.1 Curriculum Design</option>
            <option value="1.2">1.2 Academic Flexibility</option>
            <option value="1.3">1.3 Curriculum Enrichment</option>
            <option value="1.4">1.4 Feedback System</option>
          </select>
        </div>
      </div>

      {/* SHAP Visualizer */}
      <ShapVisualizer shapData={shapData} />

      {/* Gaps & Recommendations Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quality Gaps */}
        <div className="p-6 rounded-2xl glass-panel border border-slate-200 bg-white shadow-xs space-y-4">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-600" />
            Identified Documentation Gaps
          </h3>
          {loading ? (
            <Loader2 className="w-6 h-6 text-blue-600 animate-spin mx-auto" />
          ) : gaps.length === 0 ? (
            <p className="text-xs text-slate-500">No open gaps for Sub-Criterion {selectedSub}.</p>
          ) : (
            <div className="space-y-3">
              {gaps.map((g) => (
                <div key={g.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-900">[{g.sub_criterion}] {g.title}</span>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        g.severity === 'High' ? 'bg-rose-100 text-rose-800 border border-rose-200' : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}>
                        {g.severity}
                      </span>
                      <select
                        value={g.status || 'Open'}
                        onChange={(e) => handleStatusChange(g.id, e.target.value)}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border focus:outline-none cursor-pointer ${
                          g.status === 'Resolved' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                          g.status === 'In Progress' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                          'bg-amber-50 text-amber-900 border-amber-300'
                        }`}
                      >
                        <option value="Open">Status: Open</option>
                        <option value="In Progress">Status: In Progress</option>
                        <option value="Resolved">Status: Resolved</option>
                      </select>
                    </div>
                  </div>
                  <p className="text-slate-700">{g.description}</p>
                  {g.missing_evidence && (
                    <p className="text-rose-700 font-bold">Missing: {g.missing_evidence}</p>
                  )}
                  {g.recommended_action && (
                    <p className="text-blue-700 font-bold">Recommended Action: {g.recommended_action}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>


        {/* Gemini AI Recommendations */}
        <div className="p-6 rounded-2xl glass-panel border border-slate-200 bg-white shadow-xs space-y-4">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-blue-600" />
            Agentic AI Action Recommendations
          </h3>
          {loading ? (
            <Loader2 className="w-6 h-6 text-blue-600 animate-spin mx-auto" />
          ) : recommendations.length === 0 ? (
            <p className="text-xs text-slate-500">No active recommendations for Sub-Criterion {selectedSub}.</p>
          ) : (
            <div className="space-y-3">
              {recommendations.map((r) => (
                <div key={r.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">[{r.sub_criterion}] {r.title}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                      {r.priority} Priority
                    </span>
                  </div>
                  <p className="text-slate-700 leading-relaxed font-normal">{r.recommendation_text}</p>
                  {r.action_items && (
                    <div className="pt-1">
                      <span className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Action Items:</span>
                      <ul className="list-disc list-inside text-slate-700 space-y-1">
                        {r.action_items.map((act, idx) => (
                          <li key={idx}>{act}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GapAnalysisPage;
