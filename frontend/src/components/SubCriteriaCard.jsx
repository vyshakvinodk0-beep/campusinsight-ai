import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, FileCheck2, AlertCircle } from 'lucide-react';

const SubCriteriaCard = ({ analysis }) => {
  const { sub_criterion, title, score, cgpa_equivalent, readiness_level, evidence_count, gap_count } = analysis;

  const getScoreColor = (sc) => {
    if (sc >= 85) return 'text-emerald-700 border-emerald-200 bg-emerald-50';
    if (sc >= 75) return 'text-blue-700 border-blue-200 bg-blue-50';
    if (sc >= 60) return 'text-amber-700 border-amber-200 bg-amber-50';
    return 'text-rose-700 border-rose-200 bg-rose-50';
  };

  return (
    <div className="p-6 rounded-2xl glass-panel glass-card-hover border border-slate-200 bg-white flex flex-col justify-between shadow-xs">
      <div>
        <div className="flex items-center justify-between">
          <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-slate-100 border border-slate-200 text-blue-700">
            Sub-Criterion {sub_criterion}
          </span>
          <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${getScoreColor(score)}`}>
            {readiness_level}
          </span>
        </div>

        <h3 className="text-base font-bold text-slate-900 mt-3 leading-snug">{title}</h3>

        <div className="mt-4 flex items-baseline justify-between">
          <div>
            <span className="text-3xl font-black text-slate-900">{score.toFixed(1)}%</span>
            <span className="text-xs text-slate-500 font-medium ml-1.5">Score</span>
          </div>
          <div className="text-right">
            <span className="text-lg font-bold text-slate-800">{cgpa_equivalent.toFixed(2)}</span>
            <span className="text-xs text-slate-500 font-medium ml-1">/ 4.0 CGPA</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-100 rounded-full h-2 mt-3 overflow-hidden border border-slate-200/50">
          <div
            className="bg-gradient-to-r from-blue-600 to-indigo-600 h-2 rounded-full transition-all duration-500"
            style={{ width: `${score}%` }}
          ></div>
        </div>

        <div className="mt-4 flex items-center justify-between text-xs text-slate-600 border-t border-slate-100 pt-3 font-medium">
          <span className="flex items-center gap-1.5">
            <FileCheck2 className="w-4 h-4 text-emerald-600" />
            {evidence_count} Evidences
          </span>
          <span className="flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            {gap_count} Gaps
          </span>
        </div>
      </div>

      <Link
        to={`/sub-criterion/${sub_criterion}`}
        className="mt-5 w-full py-2.5 rounded-xl bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 text-xs font-bold flex items-center justify-center space-x-1 border border-slate-200 transition-all"
      >
        <span>Inspect Evidences & Gaps</span>
        <ChevronRight className="w-4 h-4" />
      </Link>
    </div>
  );
};

export default SubCriteriaCard;
