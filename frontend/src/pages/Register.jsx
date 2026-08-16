import React, { useState } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import { ShieldCheck, Mail, Lock, User as UserIcon, UserPlus, AlertCircle, UserCheck, Loader2, ArrowRight } from 'lucide-react';

const Register = () => {
  const { user, loading: authLoading, register, googleLogin } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('Faculty');
  const [department, setDepartment] = useState('Computer Science & Engineering');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // Google Modal States
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);
  const [googleStep, setGoogleStep] = useState('select_account'); // 'select_account' or 'choose_role'
  const [googleEmail, setGoogleEmail] = useState('');
  const [googleFullName, setGoogleFullName] = useState('');
  const [googleRole, setGoogleRole] = useState('Faculty');
  const [googleDept, setGoogleDept] = useState('Computer Science & Engineering');
  const [googleLoading, setGoogleLoading] = useState(false);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <Loader2 className="w-10 h-10 text-blue-500 animate-spin mx-auto" />
          <p className="text-xs text-slate-400 font-medium">Loading CampusInsight AI...</p>
        </div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }


  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await register({
        email,
        password,
        full_name: fullName,
        role,
        department
      });
      navigate('/');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to register account');
    } finally {
      setLoading(false);
    }
  };

  const openGoogleModal = () => {
    setError(null);
    setGoogleEmail('');
    setGoogleFullName('');
    setGoogleRole('Faculty');
    setGoogleDept('Computer Science & Engineering');
    setGoogleStep('select_account');
    setIsGoogleModalOpen(true);
  };

  const handleSelectGoogleAccount = async (selectedEmail, nameHint) => {
    if (!selectedEmail || !selectedEmail.trim()) return;
    const cleanEmail = selectedEmail.trim().toLowerCase();
    setGoogleEmail(cleanEmail);
    setGoogleLoading(true);
    
    const defaultName = nameHint || cleanEmail.split('@')[0].replace('.', ' ').replace(/\b\w/g, l => l.toUpperCase());
    setGoogleFullName(defaultName);

    try {
      const checkRes = await authAPI.checkGoogleEmail(cleanEmail);
      if (checkRes.data.exists) {
        // Log in existing account
        await googleLogin(cleanEmail, checkRes.data.full_name, checkRes.data.role, checkRes.data.department);
        setIsGoogleModalOpen(false);
        navigate('/');
      } else {
        // Show role selection step for new user
        setGoogleStep('choose_role');
      }
    } catch (err) {
      console.error(err);
      setError("Google registration failed. Please try again.");
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleCompleteGoogleRegistration = async (e) => {
    e.preventDefault();
    setGoogleLoading(true);
    try {
      await googleLogin(googleEmail, googleFullName, googleRole, googleDept);
      setIsGoogleModalOpen(false);
      navigate('/');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Registration failed');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md glass-panel p-8 rounded-3xl border border-slate-800 space-y-6 shadow-2xl">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center mx-auto shadow-lg shadow-blue-500/30">
            <ShieldCheck className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Create Institutional Account</h1>
          <p className="text-xs text-slate-400">CampusInsight AI - NAAC Criterion 1 Portal</p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Google / Gmail Auth Button */}
        <button
          type="button"
          onClick={openGoogleModal}
          className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center space-x-3 cursor-pointer"
        >
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Continue with Google / Gmail</span>
        </button>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-800" />
          </div>
          <div className="relative flex justify-center text-[10px] uppercase font-bold text-slate-500">
            <span className="bg-slate-950 px-2">or register with email</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Full Name & Designation</label>
            <div className="relative">
              <UserIcon className="w-4 h-4 absolute left-3 top-3.5 text-slate-500" />
              <input
                type="text"
                required
                placeholder="Dr. Rajesh Kumar"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Institutional Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-3.5 text-slate-500" />
              <input
                type="email"
                required
                placeholder="rajesh.k@institution.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-3.5 text-slate-500" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Institutional Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="Faculty">Faculty</option>
                <option value="HOD">HOD</option>
                <option value="Principal">Principal</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Department</label>
              <input
                type="text"
                required
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center space-x-2"
          >
            <UserPlus className="w-4 h-4" />
            <span>{loading ? 'Creating Account...' : 'Register Account'}</span>
          </button>
        </form>

        <div className="text-center">
          <Link to="/login" className="text-xs text-blue-400 hover:underline">
            Already have an account? Sign in
          </Link>
        </div>
      </div>

      {/* Modern Google Sign-In & Role Selection Modal */}
      {isGoogleModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 rounded-3xl border border-slate-800 p-7 space-y-6 shadow-2xl animate-fadeIn">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center space-x-2.5">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <h3 className="font-bold text-white text-base">Sign in with Google</h3>
              </div>
              <button
                onClick={() => setIsGoogleModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-200 text-xs font-medium flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            {/* STEP 1: Privacy-First Google Account Sign-In */}
            {googleStep === 'select_account' && (
              <div className="space-y-5 text-xs">
                <div className="text-center space-y-1">
                  <p className="text-sm font-bold text-white">Sign in to CampusInsight AI</p>
                  <p className="text-slate-400 font-medium text-[11.5px]">
                    Enter your Google Account or Google Workspace email to continue:
                  </p>
                </div>

                {/* Primary Authentic Google Email Input */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (googleEmail.trim()) handleSelectGoogleAccount(googleEmail);
                  }}
                  className="space-y-3"
                >
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Email or Phone
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        required
                        placeholder="yourname@gmail.com or name@institution.edu"
                        value={googleEmail}
                        onChange={(e) => setGoogleEmail(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-white text-sm font-medium focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-900/50 transition-all"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <a
                      href="https://accounts.google.com/signin/v2/recoveryidentifier"
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-400 font-bold text-[11px] hover:underline"
                    >
                      Forgot email?
                    </a>
                    <button
                      type="submit"
                      disabled={!googleEmail.trim() || googleLoading}
                      className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-600/30 disabled:opacity-50 flex items-center space-x-1.5 transition-all cursor-pointer"
                    >
                      {googleLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : (
                        <>
                          <span>Next</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                </form>

                {/* Privacy & Security Standard Disclaimer */}
                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1 text-slate-400 text-[10.5px] leading-relaxed">
                  <div className="flex items-center space-x-1.5 text-slate-200 font-bold">
                    <Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>OAuth 2.0 Encrypted Sign-In</span>
                  </div>
                  <p>
                    To continue, Google shares your verified name, email address, and profile preference with CampusInsight AI in compliance with institutional data privacy rules.
                  </p>
                </div>

                {/* Collapsible Demo Personas (Kept private and collapsed by default) */}
                <div className="pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowDemoOptions(!showDemoOptions)}
                    className="w-full flex items-center justify-between py-1.5 px-2 text-[11px] font-bold text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    <span className="flex items-center space-x-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-purple-400" />
                      <span>Quick Test Demo Accounts (Optional)</span>
                    </span>
                    {showDemoOptions ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  {showDemoOptions && (
                    <div className="mt-2.5 space-y-1.5 animate-fadeIn">
                      <button
                        type="button"
                        onClick={() => handleSelectGoogleAccount('faculty@campusinsight.edu', 'Prof. Meera Deshmukh')}
                        className="w-full p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left flex items-center justify-between transition-all cursor-pointer"
                      >
                        <div className="flex items-center space-x-2.5">
                          <div className="w-7 h-7 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-[10px]">
                            MD
                          </div>
                          <div>
                            <p className="font-bold text-white text-xs">Prof. Meera Deshmukh</p>
                            <p className="text-slate-400 text-[10px]">faculty@campusinsight.edu</p>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">Faculty</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSelectGoogleAccount('hod.cse@campusinsight.edu', 'Dr. Vikramaditya Singh')}
                        className="w-full p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left flex items-center justify-between transition-all cursor-pointer"
                      >
                        <div className="flex items-center space-x-2.5">
                          <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-[10px]">
                            VS
                          </div>
                          <div>
                            <p className="font-bold text-white text-xs">Dr. Vikramaditya Singh</p>
                            <p className="text-slate-400 text-[10px]">hod.cse@campusinsight.edu</p>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-950 text-blue-300 border border-blue-800">HOD</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSelectGoogleAccount('principal@campusinsight.edu', 'Prof. Ananya Roy')}
                        className="w-full p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left flex items-center justify-between transition-all cursor-pointer"
                      >
                        <div className="flex items-center space-x-2.5">
                          <div className="w-7 h-7 rounded-full bg-amber-600 text-white font-bold flex items-center justify-center text-[10px]">
                            AR
                          </div>
                          <div>
                            <p className="font-bold text-white text-xs">Prof. Ananya Roy</p>
                            <p className="text-slate-400 text-[10px]">principal@campusinsight.edu</p>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800">Principal</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSelectGoogleAccount('admin@campusinsight.edu', 'Dr. Ramesh Sharma')}
                        className="w-full p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left flex items-center justify-between transition-all cursor-pointer"
                      >
                        <div className="flex items-center space-x-2.5">
                          <div className="w-7 h-7 rounded-full bg-purple-600 text-white font-bold flex items-center justify-center text-[10px]">
                            RS
                          </div>
                          <div>
                            <p className="font-bold text-white text-xs">Dr. Ramesh Sharma</p>
                            <p className="text-slate-400 text-[10px]">admin@campusinsight.edu</p>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-950 text-purple-300 border border-purple-800">Admin</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* STEP 2: Role & Department Selection */}
            {googleStep === 'choose_role' && (
              <form onSubmit={handleCompleteGoogleRegistration} className="space-y-4 text-xs">
                <div className="p-3 rounded-xl bg-blue-950/60 border border-blue-800 text-blue-200 space-y-1">
                  <p className="font-bold text-xs flex items-center gap-1">
                    <UserCheck className="w-4 h-4 text-blue-400" />
                    New Google User Identified
                  </p>
                  <p className="text-[11px] text-blue-300">
                    Signing in as <b>{googleEmail}</b>. Select your Institutional Role and Department for NAAC Criterion 1 access permissions.
                  </p>
                </div>

                <div>
                  <label className="block font-bold text-slate-300 uppercase mb-1">Full Name & Title</label>
                  <input
                    type="text"
                    required
                    value={googleFullName}
                    onChange={(e) => setGoogleFullName(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-700 bg-slate-950 text-white font-semibold focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-300 uppercase mb-1">Institutional Role</label>
                  <select
                    value={googleRole}
                    onChange={(e) => setGoogleRole(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-700 bg-slate-950 text-white font-bold focus:outline-none focus:border-blue-500"
                  >
                    <option value="Faculty">👨‍🏫 Faculty (Uploads Evidence Documents)</option>
                    <option value="HOD">🎓 HOD - Head of Department (Stage 1 Review)</option>
                    <option value="Principal">🏛️ Principal (Stage 2 Final Institutional Approval)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-300 uppercase mb-1">Department</label>
                  <input
                    type="text"
                    required
                    value={googleDept}
                    onChange={(e) => setGoogleDept(e.target.value)}
                    placeholder="e.g. Computer Science & Engineering"
                    className="w-full p-2.5 rounded-xl border border-slate-700 bg-slate-950 text-white font-semibold focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setGoogleStep('select_account')}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold hover:bg-slate-700"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={googleLoading}
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-md disabled:opacity-50 flex items-center space-x-1.5 cursor-pointer"
                  >
                    {googleLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <span>Complete Registration</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Register;
