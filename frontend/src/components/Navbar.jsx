import React from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Search, LogOut, User as UserIcon, Sparkles } from 'lucide-react';

const Navbar = ({ onOpenSearch }) => {
  const { user, logout } = useAuth();

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'Administrator': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'Principal': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'HOD': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    }
  };

  return (
    <header className="sticky top-0 z-30 glass-panel border-b border-slate-200 px-6 py-3.5 flex items-center justify-between bg-white/90">
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center shadow-md shadow-blue-500/20">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              CampusInsight <span className="gradient-text font-black">AI</span>
            </h1>
            <p className="text-xs text-slate-500 font-medium flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500 inline" /> NAAC Criterion 1 Specialist System
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        {/* RAG Search Button */}
        <button
          onClick={onOpenSearch}
          className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 border border-slate-200 text-slate-700 text-sm font-medium transition-all shadow-xs"
        >
          <Search className="w-4 h-4 text-blue-600" />
          <span>Ask RAG Assistant...</span>
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-xs bg-white border border-slate-300 rounded text-slate-500">Ctrl+K</kbd>
        </button>

        {/* User Info & Role */}
        {user && (
          <div className="flex items-center space-x-3 pl-3 border-l border-slate-200">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-slate-900">{user.full_name}</p>
              <div className="flex items-center justify-end gap-2 mt-0.5">
                <span className={`text-xs px-2.5 py-0.5 rounded-full border font-semibold ${getRoleBadgeColor(user.role)}`}>
                  {user.role}
                </span>
                <span className="text-xs text-slate-500">{user.department}</span>
              </div>
            </div>
            <button
              onClick={logout}
              title="Logout"
              className="p-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-all"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;
