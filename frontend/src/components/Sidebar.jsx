import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, FileText, AlertTriangle, FileCheck, Layers, Users, ShieldCheck, Inbox, ShieldAlert, Table } from 'lucide-react';

const Sidebar = () => {
  const { user } = useAuth();

  const getDashboardLabel = () => {
    switch (user?.role) {
      case 'Faculty': return 'My Evidence Portal';
      case 'HOD': return 'HOD Verification Hub';
      case 'Principal': return 'Executive Office Hub';
      case 'Administrator': return 'System Admin Dashboard';
      default: return 'Criterion 1 Command Center';
    }
  };

  const getVaultLabel = () => {
    switch (user?.role) {
      case 'Faculty': return 'My Uploaded Evidence';
      case 'HOD': return 'Dept Validations Queue';
      case 'Principal': return 'Institutional Approval Vault';
      case 'Administrator': return 'System Document Registry';
      default: return 'Document Vault & OCR';
    }
  };

  const workspaceItems = [
    { path: '/', label: getDashboardLabel(), icon: LayoutDashboard },
    { path: '/evidence-matrix', label: 'Evidence Matrix (1.1-1.4)', icon: Table },
    { path: '/documents', label: getVaultLabel(), icon: FileText },
  ];

  const criterionItems = [
    { path: '/sub-criterion/1.1', label: '1.1 Curriculum Design', icon: Layers },
    { path: '/sub-criterion/1.2', label: '1.2 Academic Flexibility', icon: Layers },
    { path: '/sub-criterion/1.3', label: '1.3 Curriculum Enrichment', icon: Layers },
    { path: '/sub-criterion/1.4', label: '1.4 Feedback System', icon: Layers },
  ];

  const analysisItems = [
    { path: '/gaps-recommendations', label: 'Gap Analysis & Priorities', icon: AlertTriangle },
  ];

  const governanceItems = [
    { path: '/inbox', label: 'Accreditation Inbox', icon: Inbox },
    { path: '/trust-center', label: 'AI Trust Center', icon: ShieldAlert },
    { path: '/reports', label: 'Accreditation Reports', icon: FileCheck },
  ];

  const renderSection = (title, items) => (
    <div className="space-y-1 pt-2">
      <p className="px-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
        {title}
      </p>
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `flex items-center space-x-3 px-3 py-2 rounded-xl font-medium text-xs transition-all ${
                isActive
                  ? 'bg-blue-600 text-white font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
              }`
            }
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span className="truncate">{item.label}</span>
          </NavLink>
        );
      })}
    </div>
  );

  return (
    <aside className="w-64 glass-panel border-r border-slate-200 min-h-[calc(100vh-65px)] p-4 flex flex-col justify-between shrink-0 bg-white/80">
      <div className="space-y-4">
        {/* User Role Badge */}
        <div className="px-3 pb-2 border-b border-slate-100">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
            NAAC Criterion 1 Portal
          </p>
          <div className="flex items-center justify-between mt-0.5">
            <span className="text-xs font-bold text-blue-700">{user?.role || 'User'}</span>
            <span className="text-[10px] font-semibold bg-blue-50 text-blue-800 px-2 py-0.5 rounded-full border border-blue-200">
              {user?.department?.split(' ')[0] || 'Institutional'}
            </span>
          </div>
        </div>

        <nav className="space-y-3">
          {renderSection('WORKSPACE', workspaceItems)}
          {renderSection('CRITERION 1', criterionItems)}
          {renderSection('ANALYSIS & PRIORITIES', analysisItems)}
          {renderSection('GOVERNANCE & REPORTS', governanceItems)}
          {user?.role === 'Administrator' && renderSection('ADMINISTRATION', [
            { path: '/manage-users', label: 'Manage Users & Access', icon: Users }
          ])}
        </nav>
      </div>

      <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1 mt-4">
        <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-800">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
          <span>Criterion 1 Engine</span>
        </div>
        <p className="text-[11px] text-slate-500 font-medium">1.1, 1.2, 1.3, 1.4 Active</p>
        <div className="text-[10px] text-indigo-700 font-mono font-semibold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 inline-block">
          LangGraph + RAG + FAISS
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
