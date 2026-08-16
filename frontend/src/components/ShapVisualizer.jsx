import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { Sparkles, Info, TrendingUp, TrendingDown } from 'lucide-react';

const ShapVisualizer = ({ shapData }) => {
  if (!shapData || !shapData.feature_attributions) {
    return (
      <div className="p-6 rounded-2xl glass-panel text-center text-slate-500 text-sm bg-white border border-slate-200">
        Select a recommendation or sub-criterion to compute Evidence-Based Decision Attribution.
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

  return (
    <div className="p-6 rounded-2xl glass-panel border border-slate-200 bg-white shadow-xs space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-purple-100 text-purple-700 border border-purple-200">
              Evidence Attribution
            </span>
            <h3 className="text-lg font-bold text-slate-900">Evidence-Based Decision Attribution & Score Rationale</h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Quantifies which evidence completeness and document quality features positively boosted or lowered Sub-Criterion {sub_criterion} readiness rating.
          </p>
        </div>

        <div className="text-right bg-slate-50 px-4 py-2 rounded-xl border border-slate-200">
          <span className="text-xs text-slate-500 uppercase font-bold tracking-wider block">Criterion 1 Score</span>
          <span className="text-2xl font-black text-blue-700">{predicted_score}%</span>
        </div>
      </div>

      {/* Driver Summary Pills */}
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
            <span className="text-xs text-slate-500 font-bold uppercase">Top Negative Evidence Gap</span>
            <p className="text-sm font-bold text-rose-800">{top_negative_gap}</p>
          </div>
        </div>
      </div>

      {/* Recharts Bar Chart for Attribution Values */}
      <div className="h-64 w-full">
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
                      <p className="text-slate-600">Measured Value: <span className="font-mono font-bold text-blue-700">{data.val} / 10</span></p>
                      <p className={data.impact >= 0 ? "text-emerald-700 font-bold" : "text-rose-700 font-bold"}>
                        Impact: {data.impact >= 0 ? `+${data.impact}` : data.impact}% ({data.effect})
                      </p>
                      <p className="text-slate-500 text-[11px] italic">{data.description}</p>
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

      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-start space-x-2">
        <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <span>
          <strong>Evidence Attribution Methodology:</strong> Uses deterministic weighting rules to calculate the contribution of document quality, required evidence availability, and human verification status toward the final NAAC Criterion 1 score.
        </span>
      </div>
    </div>
  );
};

export default ShapVisualizer;
