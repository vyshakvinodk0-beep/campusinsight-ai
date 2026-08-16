import React from 'react';

const MetricCard = ({ title, value, subtitle, icon: Icon, color = 'blue' }) => {
  const getColorClasses = () => {
    switch (color) {
      case 'emerald': return 'from-emerald-50 to-teal-50/50 border-emerald-200 text-emerald-700';
      case 'amber': return 'from-amber-50 to-orange-50/50 border-amber-200 text-amber-700';
      case 'purple': return 'from-purple-50 to-indigo-50/50 border-purple-200 text-purple-700';
      case 'red': return 'from-rose-50 to-red-50/50 border-rose-200 text-rose-700';
      default: return 'from-blue-50 to-cyan-50/50 border-blue-200 text-blue-700';
    }
  };

  return (
    <div className={`p-5 rounded-2xl bg-gradient-to-br ${getColorClasses()} border glass-card-hover bg-white`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{title}</p>
          <h3 className="text-2xl font-black text-slate-900 mt-1">{value}</h3>
          {subtitle && <p className="text-xs text-slate-600 font-medium mt-1">{subtitle}</p>}
        </div>
        {Icon && (
          <div className="p-3 rounded-xl bg-white border border-slate-200/80 shadow-xs">
            <Icon className="w-6 h-6" />
          </div>
        )}
      </div>
    </div>
  );
};

export default MetricCard;
