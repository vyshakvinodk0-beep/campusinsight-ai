import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { Sparkles, Info, TrendingUp, TrendingDown, HelpCircle, CheckCircle2, AlertTriangle } from 'lucide-react';

const ShapVisualizer = ({ shapData }) => {
  const [viewMode, setViewMode] = useState('simple'); // 'simple' | 'technical'

  if (!shapData || !shapData.feature_attributions) {
    return (
      <div className="p-6 rounded-2xl glass-panel text-center text-slate-500 text-sm bg-white border border-slate-200">
        Select a sub-criterion to inspect why it was assigned its readiness score.
      </div>
    );
  }

  const { sub_criterion, base_value, predicted_score, feature_attributions, top_positive_driver, top_negative_gap } = shapData;

  const chartData = feature_attributions.map(f => ({
    name: f.feature,
    impact: f.shap_value,
    effect: f.effect,
    val: f.value,
    description: f.description
  }));

  const mainInfluencingFactor = top_negative_gap !== "None"
    ? `The result is mainly influenced by incomplete supporting evidence (${top_negative_gap}) for Sub-Criterion ${sub_criterion}.`
    : `The result is mainly supported by strong verified evidence (${top_positive_driver}) for Sub-Criterion ${sub_criterion}.`;

  return (
    <div className="p-6 rounded-3xl glass-panel border border-slate-200 bg-white shadow-xs space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <HelpCircle className="w-5 h-5 text-purple-600" />
            <h3 className="text-base font-bold text-slate-900">Why this result? (AI Explanation)</h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Plain-language breakdown of key evidence factors influencing Sub-Criterion {sub_criterion} readiness.
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex items-center space-x-1 p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-bold shrink-0">
          <button
            onClick={() => setViewMode('simple')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              viewMode === 'simple' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Simple Explanation
          </button>
          <button
            onClick={() => setViewMode('technical')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              viewMode === 'technical' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Technical Details
          </button>
        </div>
      </div>

      {/* Mode 1: Simple Human Explanation */}
      {viewMode === 'simple' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200 space-y-2">
            <span className="text-xs font-extrabold uppercase text-purple-900 tracking-wider block">
              💡 Main Findings Summary:
            </span>
            <p className="text-sm font-semibold text-purple-950 leading-relaxed">
              {mainInfluencingFactor}
            </p>
          </div>

          {/* Key Contributing Factors List */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-1">
              <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Strong Supporting Factors:
              </span>
              <p className="text-emerald-800 leading-relaxed font-medium">
                Verified evidence items found for {top_positive_driver || 'Curriculum Planning'}.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 space-y-1">
              <span className="font-bold text-rose-900 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                Items Needing Attention:
              </span>
              <p className="text-rose-800 leading-relaxed font-medium">
                {top_negative_gap !== "None" ? top_negative_gap : 'Review unverified signatures and required documents.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Mode 2: Technical Attribution View */}
      {viewMode === 'technical' && (
        <div className="space-y-4 animate-fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center space-x-3">
              <TrendingUp className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <span className="text-xs text-slate-500 font-bold uppercase">Top Positive Driver</span>
                <p className="text-sm font-bold text-emerald-800">{top_positive_driver}</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-center space-x-3">
              <TrendingDown className="w-5 h-5 text-rose-600 shrink-0" />
              <div>
                <span className="text-xs text-slate-500 font-bold uppercase">Top Negative Gap</span>
                <p className="text-sm font-bold text-rose-800">{top_negative_gap}</p>
              </div>
            </div>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 120, bottom: 5 }}
              >
                <XAxis type="number" stroke="#64748B" fontSize={12} tickFormatter={(val) => `${val > 0 ? '+' : ''}${val}`} />
                <YAxis type="category" dataKey="name" stroke="#334155" fontSize={11} width={130} fontWeight={600} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-lg text-xs space-y-1">
                          <p className="font-bold text-slate-900">{data.name}</p>
                          <p className="text-slate-600">Measured Score: <span className="font-mono font-bold text-blue-700">{data.val} / 10</span></p>
                          <p className={data.impact >= 0 ? "text-emerald-700 font-bold" : "text-rose-700 font-bold"}>
                            Impact: {data.impact >= 0 ? `+${data.impact}` : data.impact}% ({data.effect})
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <ReferenceLine x={0} stroke="#CBD5E1" strokeDasharray="3 3" />
                <Bar dataKey="impact" radius={[0, 4, 4, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.impact >= 0 ? '#10B981' : '#EF4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShapVisualizer;
