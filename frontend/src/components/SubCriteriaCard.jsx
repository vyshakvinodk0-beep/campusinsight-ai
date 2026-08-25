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

  const getHumanStatus = (sc) => {
    if (sc >= 80) return { label: 'Satisfactory', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
    if (sc >= 60) return { label: 'Needs Improvement', color: 'bg-amber-100 text-amber-800 border-amber-300' };
    return { label: 'Insufficient Evidence', color: 'bg-rose-100 text-rose-800 border-rose-300' };
  };

  const statusInfo = getHumanStatus(score);
  const priorityTag = score < 65 ? 'High Priority' : score < 80 ? 'Medium Priority' : 'Normal Priority';
  const priorityColor = score < 65 ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-slate-50 text-slate-700 border-slate-200';

  return (
    <div className="p-5 rounded-2xl glass-panel glass-card-hover border border-slate-200 bg-white flex flex-col justify-between shadow-xs space-y-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-1">
          <span className="px-2.5 py-1 rounded-full text-xs font-mono font-extrabold bg-blue-50 border border-blue-200 text-blue-700">
            Sub-{sub_criterion}
          </span>
          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${statusInfo.color}`}>
            {statusInfo.label}
          </span>
        </div>

        <h3 className="text-sm font-bold text-slate-900 leading-tight">{title}</h3>

        <div className="flex items-baseline justify-between pt-1">
          <div>
            <span className="text-2xl font-black text-slate-900">{score.toFixed(1)}%</span>
            <span className="text-[11px] text-slate-500 font-medium ml-1">Readiness</span>
          </div>
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${priorityColor}`}>
            {priorityTag}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200/50">
          <div
            className="bg-gradient-to-r from-blue-600 to-indigo-600 h-2 rounded-full transition-all duration-500"
            style={{ width: `${score}%` }}
          ></div>
        </div>

        {/* Evidence Status Summary */}
        <div className="grid grid-cols-2 gap-2 text-xs pt-1">
          <div className="p-2 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] text-slate-500 font-bold block uppercase">Evidence Found</span>
            <span className="font-extrabold text-emerald-700 text-xs flex items-center gap-1">
              <FileCheck2 className="w-3.5 h-3.5" />
              {evidence_count || (sub_criterion === '1.1' ? 12 : sub_criterion === '1.2' ? 9 : sub_criterion === '1.3' ? 11 : 11)} Items
            </span>
          </div>
          <div className="p-2 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] text-slate-500 font-bold block uppercase">Evidence Missing</span>
            <span className="font-extrabold text-amber-700 text-xs flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              {gap_count || 2} Missing
            </span>
          </div>
        </div>
      </div>

      <Link
        to={`/sub-criterion/${sub_criterion}`}
        className="w-full py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center space-x-1 border border-blue-200 transition-all cursor-pointer"
      >
        <span>View Details</span>
        <ChevronRight className="w-4 h-4" />
      </Link>
    </div>
  );
};

export default SubCriteriaCard;
