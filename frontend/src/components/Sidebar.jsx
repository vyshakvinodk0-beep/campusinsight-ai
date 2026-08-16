import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, FileText, AlertTriangle, FileCheck, Layers, Users, ShieldCheck, CheckCircle2, Table } from 'lucide-react';

const Sidebar = () => {
  const { user } = useAuth();

  const getDashboardLabel = () => {
    switch (user?.role) {
      case 'Faculty': return 'My Evidence Portal';
      case 'HOD': return 'HOD Verification Hub';
      case 'Principal': return 'Executive Office Hub';
      case 'Administrator': return 'System Admin Dashboard';
      default: return 'Criterion 1 Dashboard';
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

  const navItems = [
    { path: '/', label: getDashboardLabel(), icon: LayoutDashboard },
    { path: '/evidence-matrix', label: 'Evidence Matrix (1.1 - 1.4)', icon: Table },
    { path: '/sub-criterion/1.1', label: '1.1 Curriculum Design', icon: Layers },
    { path: '/sub-criterion/1.2', label: '1.2 Academic Flexibility', icon: Layers },
    { path: '/sub-criterion/1.3', label: '1.3 Curriculum Enrichment', icon: Layers },
    { path: '/sub-criterion/1.4', label: '1.4 Feedback System', icon: Layers },
    { path: '/documents', label: getVaultLabel(), icon: FileText },
    { path: '/gaps-recommendations', label: 'Gap Analysis & Attribution', icon: AlertTriangle },
    { path: '/reports', label: 'Accreditation Reports', icon: FileCheck },
  ];

  if (user?.role === 'Administrator') {
    navItems.push({ path: '/manage-users', label: 'Manage Users & Access', icon: Users });
  }

  return (
    <aside className="w-64 glass-panel border-r border-slate-200 min-h-[calc(100vh-65px)] p-4 flex flex-col justify-between shrink-0 bg-white/80">
      <div className="space-y-6">
        <div>
          <div className="px-3 mb-3">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              NAAC Criterion 1 Scope
            </p>
            <p className="text-[11px] font-semibold text-blue-600 capitalize">
              Role: {user?.role || 'User'}
            </p>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  className={({ isActive }) =>
                    `flex items-center space-x-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 border border-blue-200/80 shadow-xs font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                    }`
                  }
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>
      </div>

      <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
        <div className="flex items-center space-x-1 text-xs font-bold text-slate-800">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
          <span>Criterion 1 Specialist</span>
        </div>
        <p className="text-[11px] text-slate-500">1.1, 1.2, 1.3, 1.4 Active</p>
        <div className="text-[10px] text-purple-700 font-mono font-semibold bg-purple-50 px-2 py-0.5 rounded border border-purple-100 inline-block">
          LangGraph 5-Agent RAG
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
