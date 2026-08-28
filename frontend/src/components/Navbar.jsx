import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import NotificationBell from './NotificationBell';
import api from '../services/api';

const Navbar = ({ onOpenSearch, isDemoMode, onToggleDemoMode }) => {
  const { user, logout } = useAuth();
  const [unreadCount, setUnreadCount] = useState(2);

  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const res = await api.get('/inbox/unread-count');
        if (res.data && res.data.unread_count !== undefined) {
          setUnreadCount(res.data.unread_count);
        }
      } catch (err) {
        // Fallback for offline/demo
      }
    };
    if (user) fetchUnread();
  }, [user]);

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'Administrator': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'Principal': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'HOD': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    }
  };

  return (
    <header className="sticky top-0 z-30 glass-panel border-b border-slate-200 px-6 py-3.5 flex items-center justify-between bg-white/95 backdrop-blur-md">
      <div className="flex items-center space-x-4">
        <Link to="/" className="flex items-center space-x-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
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
        </Link>
      </div>

      <div className="flex items-center space-x-3 sm:space-x-4">
        {/* Demo Mode Toggle Button */}
        <button
          onClick={onToggleDemoMode}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
            isDemoMode
              ? 'bg-amber-50 border-amber-300 text-amber-800 shadow-xs'
              : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
          }`}
          title="Toggle Demo Data Mode"
        >
          {isDemoMode ? (
            <>
              <ToggleRight className="w-4 h-4 text-amber-600" />
              <span>Demo Mode ON</span>
            </>
          ) : (
            <>
              <ToggleLeft className="w-4 h-4 text-slate-400" />
              <span>Demo Mode</span>
            </>
          )}
        </button>

        {/* AI Trust Center Link */}
        <Link
          to="/trust-center"
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-xs font-semibold transition-all shadow-xs"
        >
          <ShieldAlert className="w-4 h-4 text-indigo-600" />
          <span className="hidden md:inline">Trust Center</span>
        </Link>

        {/* Dynamic Role-Based Notification & Action Alert Bell */}
        <NotificationBell />

        {/* Accreditation Inbox Button */}
        <Link
          to="/inbox"
          className="relative p-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 border border-slate-200 text-slate-700 transition-all shadow-xs"
          title="Accreditation Workflow Inbox"
        >
          <Inbox className="w-5 h-5 text-blue-600" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
              {unreadCount}
            </span>
          )}
        </Link>

        {/* RAG Search Button */}
        <button
          onClick={onOpenSearch}
          className="flex items-center space-x-2 px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 border border-slate-200 text-slate-700 text-xs font-medium transition-all shadow-xs"
        >
          <Search className="w-4 h-4 text-blue-600" />
          <span className="hidden lg:inline">Ask RAG Assistant...</span>
          <kbd className="hidden xl:inline-block px-1.5 py-0.5 text-[10px] bg-white border border-slate-300 rounded text-slate-500">Ctrl+K</kbd>
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
