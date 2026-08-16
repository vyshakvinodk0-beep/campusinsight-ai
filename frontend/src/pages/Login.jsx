import React, { useState } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import { ShieldCheck, Mail, Lock, LogIn, AlertCircle, ChevronDown, ChevronUp, UserCheck, Shield, Sparkles, Loader2, ArrowRight, KeyRound, Send } from 'lucide-react';

const Login = () => {
  const { user, loading: authLoading, login, googleLogin } = useAuth();
  const navigate = useNavigate();

  // Clean default input states so nothing is pre-filled when visiting the page
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showDemoOptions, setShowDemoOptions] = useState(false);

  // Google OAuth & Security Verification Modal States
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);
  const [googleStep, setGoogleStep] = useState('select_account'); // 'select_account', 'verify_existing', 'choose_role'
  const [googleEmail, setGoogleEmail] = useState('');
  const [googleFullName, setGoogleFullName] = useState('');
  const [googleRole, setGoogleRole] = useState('Faculty');
  const [googleDept, setGoogleDept] = useState('Computer Science & Engineering');
  const [googlePassword, setGooglePassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [useOtpMode, setUseOtpMode] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto" />
          <p className="text-xs text-slate-600 font-medium">Loading CampusInsight AI...</p>
        </div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }


  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  // Open Standard Google OAuth Modal
  const openGoogleModal = () => {
    setError(null);
    setGoogleEmail('');
    setGoogleFullName('');
    setGoogleRole('Faculty');
    setGoogleDept('Computer Science & Engineering');
    setGooglePassword('');
    setOtpCode('');
    setUseOtpMode(false);
    setOtpSent(false);
    setGoogleStep('select_account');
    setIsGoogleModalOpen(true);
  };

  // Select a Google Account -> Checks account existence
  const handleSelectGoogleAccount = async (selectedEmail, nameHint) => {
    if (!selectedEmail || !selectedEmail.trim()) {
      setError("Please enter your Google email address to continue.");
      return;
    }
    const cleanEmail = selectedEmail.trim().toLowerCase();
    setGoogleEmail(cleanEmail);
    setGoogleLoading(true);
    setError(null);
    
    const defaultName = nameHint || cleanEmail.split('@')[0].replace('.', ' ').replace(/\b\w/g, l => l.toUpperCase());
    setGoogleFullName(defaultName);

    try {
      // Check if email already exists in system
      const checkRes = await authAPI.checkGoogleEmail(cleanEmail);
      if (checkRes.data && checkRes.data.exists) {
        setGoogleRole(checkRes.data.role);
        setGoogleDept(checkRes.data.department);
        setGoogleFullName(checkRes.data.full_name);
        // Security requirement: Require password or Gmail OTP verification for existing account!
        setGoogleStep('verify_existing');
      } else {
        // New Google user -> Advance to Role & Department Selection Step
        setGoogleStep('choose_role');
      }
    } catch (err) {
      console.error("Google login check error:", err);
      // Fallback: If account check fails or backend is unreachable, advance to role setup or show error
      if (err.code === 'ERR_NETWORK' || err.message?.includes('Network Error')) {
        setError("Unable to connect to backend server. Please start the backend server via start.bat.");
      } else {
        // Allow proceeding to role step as new user if backend check returns 404 or soft error
        setGoogleStep('choose_role');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  // Trigger sending OTP to Gmail address
  const handleSendOtp = async () => {
    setGoogleLoading(true);
    setError(null);
    try {
      await authAPI.checkGoogleEmail(googleEmail); // Verify route
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: googleEmail })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Failed to send verification code");
      }
      setOtpSent(true);
      if (data.dev_mode && data.otp) {
        setOtpCode(data.otp);
        setError(`🔑 Dev Mode: Verification code [ ${data.otp} ] auto-filled for quick testing!`);
      } else {
        setError(`✅ Verification security code sent to ${googleEmail}. Please check your Gmail inbox.`);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to send OTP to Gmail address.");
    } finally {
      setGoogleLoading(false);
    }
  };

  // Verify Security Credentials (Password or OTP) for Existing Account
  const handleVerifyAndLoginExisting = async (e) => {
    e.preventDefault();
    setGoogleLoading(true);
    setError(null);
    try {
      if (useOtpMode) {
        // Verify OTP code
        const res = await fetch('/api/auth/verify-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: googleEmail, otp: otpCode })
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.detail || "Invalid verification code");
        }
        // OTP verified -> Complete Google login
        await googleLogin(googleEmail, googleFullName, googleRole, googleDept);
      } else {
        // Verify password
        await login(googleEmail, googlePassword);
      }
      setIsGoogleModalOpen(false);
      navigate('/');
    } catch (err) {
      console.error(err);
      setError(err.message || err.response?.data?.detail || "Authentication verification failed. Please check credentials.");
    } finally {
      setGoogleLoading(false);
    }
  };

  // Submit Registration for First-Time Google Users
  const handleCompleteGoogleRegistration = async (e) => {
    e.preventDefault();
    setGoogleLoading(true);
    setError(null);
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

  const handleQuickDemo = (demoEmail) => {
    setEmail(demoEmail);
    setPassword('password123');
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md glass-panel bg-white p-8 rounded-3xl border border-slate-200 space-y-6 shadow-xl">
        {/* Title Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center mx-auto shadow-md shadow-blue-500/20">
            <ShieldCheck className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-black text-slate-900">CampusInsight AI</h1>
          <p className="text-xs text-slate-500 font-medium">NAAC Criterion 1 Intelligent Document Analysis System</p>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Standard Google OAuth Sign-In Button */}
        <div>
          <button
            type="button"
            onClick={openGoogleModal}
            className="w-full py-3 px-4 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-bold text-xs shadow-xs transition-all flex items-center justify-center space-x-3 cursor-pointer"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>Continue with Google / Gmail</span>
          </button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase font-bold text-slate-400">
              <span className="bg-white px-2">or sign in with password</span>
            </div>
          </div>
        </div>

        {/* Clean Standard Login Form (Starts empty) */}
        <form onSubmit={handlePasswordLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Institutional Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-3.5 text-slate-400" />
              <input
                type="email"
                required
                placeholder="user@institution.edu or name@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-sm font-semibold focus:outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-3.5 text-slate-400" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-sm font-semibold focus:outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm shadow-md shadow-blue-500/20 transition-all flex items-center justify-center space-x-2 cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
            <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
          </button>
        </form>

        {/* Collapsible Demo Roles Option */}
        <div className="border-t border-slate-200 pt-3">
          <button
            type="button"
            onClick={() => setShowDemoOptions(!showDemoOptions)}
            className="w-full flex items-center justify-between text-[11px] font-bold uppercase text-slate-400 hover:text-slate-600 transition-colors"
          >
            <span>Need Demo Account Access?</span>
            {showDemoOptions ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showDemoOptions && (
            <div className="grid grid-cols-2 gap-2 text-xs font-semibold mt-3">
              <button onClick={() => handleQuickDemo('admin@campusinsight.edu')} className="p-2 rounded-lg bg-slate-50 hover:bg-purple-50 text-purple-700 border border-slate-200 text-left cursor-pointer">
                🔑 System Admin
              </button>
              <button onClick={() => handleQuickDemo('principal@campusinsight.edu')} className="p-2 rounded-lg bg-slate-50 hover:bg-amber-50 text-amber-800 border border-slate-200 text-left cursor-pointer">
                🏛️ Principal
              </button>
              <button onClick={() => handleQuickDemo('hod.cse@campusinsight.edu')} className="p-2 rounded-lg bg-slate-50 hover:bg-blue-50 text-blue-800 border border-slate-200 text-left cursor-pointer">
                🎓 HOD (CSE)
              </button>
              <button onClick={() => handleQuickDemo('faculty@campusinsight.edu')} className="p-2 rounded-lg bg-slate-50 hover:bg-emerald-50 text-emerald-800 border border-slate-200 text-left cursor-pointer">
                👨‍🏫 Faculty
              </button>
            </div>
          )}
        </div>

        <div className="text-center pt-1">
          <Link to="/register" className="text-xs text-blue-700 font-bold hover:underline">
            Don't have an account? Register institutional user
          </Link>
        </div>
      </div>

      {/* Modern Google Sign-In & Security Verification Modal */}
      {isGoogleModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 p-7 space-y-6 shadow-2xl animate-fadeIn">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center space-x-2.5">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <h3 className="font-bold text-slate-900 text-base">Sign in with Google</h3>
              </div>
              <button
                onClick={() => setIsGoogleModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            {/* STEP 1: Privacy-First Google Account Sign-In */}
            {googleStep === 'select_account' && (
              <div className="space-y-5 text-xs">
                <div className="text-center space-y-1">
                  <p className="text-sm font-bold text-slate-800">Sign in to CampusInsight AI</p>
                  <p className="text-slate-500 font-medium text-[11.5px]">
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
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                      Email or Phone
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        required
                        placeholder="yourname@gmail.com or name@institution.edu"
                        value={googleEmail}
                        onChange={(e) => setGoogleEmail(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm font-medium focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <a
                      href="https://accounts.google.com/signin/v2/recoveryidentifier"
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 font-bold text-[11px] hover:underline"
                    >
                      Forgot email?
                    </a>
                    <button
                      type="submit"
                      disabled={!googleEmail.trim() || googleLoading}
                      className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 disabled:opacity-50 flex items-center space-x-1.5 transition-all cursor-pointer"
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
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1 text-slate-500 text-[10.5px] leading-relaxed">
                  <div className="flex items-center space-x-1.5 text-slate-700 font-bold">
                    <Shield className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>OAuth 2.0 Encrypted Sign-In</span>
                  </div>
                  <p>
                    To continue, Google shares your verified name, email address, and profile preference with CampusInsight AI in compliance with institutional data privacy rules.
                  </p>
                </div>

                {/* Collapsible Demo Personas (Kept private and collapsed by default) */}
                <div className="pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowDemoOptions(!showDemoOptions)}
                    className="w-full flex items-center justify-between py-1.5 px-2 text-[11px] font-bold text-slate-500 hover:text-slate-800 transition-colors"
                  >
                    <span className="flex items-center space-x-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-purple-600" />
                      <span>Quick Test Demo Accounts (Optional)</span>
                    </span>
                    {showDemoOptions ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  {showDemoOptions && (
                    <div className="mt-2.5 space-y-1.5 animate-fadeIn">
                      <button
                        type="button"
                        onClick={() => handleSelectGoogleAccount('faculty@campusinsight.edu', 'Prof. Meera Deshmukh')}
                        className="w-full p-2.5 rounded-xl bg-slate-50 hover:bg-emerald-50 border border-slate-200 text-left flex items-center justify-between transition-all cursor-pointer"
                      >
                        <div className="flex items-center space-x-2.5">
                          <div className="w-7 h-7 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-[10px]">
                            MD
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 text-xs">Prof. Meera Deshmukh</p>
                            <p className="text-slate-500 text-[10px]">faculty@campusinsight.edu</p>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">Faculty</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSelectGoogleAccount('hod.cse@campusinsight.edu', 'Dr. Vikramaditya Singh')}
                        className="w-full p-2.5 rounded-xl bg-slate-50 hover:bg-blue-50 border border-slate-200 text-left flex items-center justify-between transition-all cursor-pointer"
                      >
                        <div className="flex items-center space-x-2.5">
                          <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-[10px]">
                            VS
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 text-xs">Dr. Vikramaditya Singh</p>
                            <p className="text-slate-500 text-[10px]">hod.cse@campusinsight.edu</p>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">HOD</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSelectGoogleAccount('principal@campusinsight.edu', 'Prof. Ananya Roy')}
                        className="w-full p-2.5 rounded-xl bg-slate-50 hover:bg-amber-50 border border-slate-200 text-left flex items-center justify-between transition-all cursor-pointer"
                      >
                        <div className="flex items-center space-x-2.5">
                          <div className="w-7 h-7 rounded-full bg-amber-600 text-white font-bold flex items-center justify-center text-[10px]">
                            AR
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 text-xs">Prof. Ananya Roy</p>
                            <p className="text-slate-500 text-[10px]">principal@campusinsight.edu</p>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">Principal</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSelectGoogleAccount('admin@campusinsight.edu', 'Dr. Ramesh Sharma')}
                        className="w-full p-2.5 rounded-xl bg-slate-50 hover:bg-purple-50 border border-slate-200 text-left flex items-center justify-between transition-all cursor-pointer"
                      >
                        <div className="flex items-center space-x-2.5">
                          <div className="w-7 h-7 rounded-full bg-purple-600 text-white font-bold flex items-center justify-center text-[10px]">
                            RS
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 text-xs">Dr. Ramesh Sharma</p>
                            <p className="text-slate-500 text-[10px]">admin@campusinsight.edu</p>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800">Admin</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* STEP 2A: Security Password / Gmail OTP Verification for Existing Users */}
            {googleStep === 'verify_existing' && (
              <form onSubmit={handleVerifyAndLoginExisting} className="space-y-4 text-xs">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1 text-slate-800">
                  <div className="flex items-center space-x-2">
                    <Shield className="w-4 h-4 text-purple-600" />
                    <span className="font-bold text-slate-900">{googleFullName}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-mono">{googleEmail}</p>
                  <div className="pt-1 flex items-center space-x-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">Role: {googleRole}</span>
                    <span className="text-[10px] text-slate-400">{googleDept}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="font-bold text-slate-700 uppercase">Security Verification</span>
                  <button
                    type="button"
                    onClick={() => setUseOtpMode(!useOtpMode)}
                    className="text-[11px] font-bold text-blue-600 hover:underline"
                  >
                    {useOtpMode ? 'Use Account Password' : 'Send Gmail Security OTP'}
                  </button>
                </div>

                {!useOtpMode ? (
                  <div>
                    <label className="block font-bold text-slate-700 uppercase mb-1">Enter Account Password</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3 top-3.5 text-slate-400" />
                      <input
                        type="password"
                        required
                        placeholder="••••••••"
                        value={googlePassword}
                        onChange={(e) => setGooglePassword(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-semibold focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block font-bold text-slate-700 uppercase">Gmail Security OTP</label>
                      <button
                        type="button"
                        onClick={handleSendOtp}
                        disabled={googleLoading}
                        className="text-[11px] font-bold text-blue-600 hover:underline flex items-center gap-1"
                      >
                        <Send className="w-3 h-3" />
                        {otpSent ? 'Resend Code' : 'Send Code to Gmail'}
                      </button>
                    </div>
                    <input
                      type="text"
                      required
                      placeholder="Enter 6-digit OTP code"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-300 text-slate-900 font-mono text-center text-sm font-bold tracking-widest focus:outline-none focus:border-blue-500"
                    />
                  </div>
                )}

                <div className="flex justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setGoogleStep('select_account')}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={googleLoading}
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md disabled:opacity-50 flex items-center space-x-1.5 cursor-pointer"
                  >
                    {googleLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <span>Verify & Sign In</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* STEP 2B: Role & Department Selection for New Google Users */}
            {googleStep === 'choose_role' && (
              <form onSubmit={handleCompleteGoogleRegistration} className="space-y-4 text-xs">
                <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 space-y-1">
                  <p className="font-bold text-xs flex items-center gap-1">
                    <UserCheck className="w-4 h-4 text-blue-600" />
                    New Google User Registration
                  </p>
                  <p className="text-[11px] text-blue-800">
                    Registering <b>{googleEmail}</b>. Select your Institutional Role and Department for NAAC Criterion 1 permissions.
                  </p>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Full Name & Title</label>
                  <input
                    type="text"
                    required
                    value={googleFullName}
                    onChange={(e) => setGoogleFullName(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-slate-900 font-semibold focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Institutional Role</label>
                  <select
                    value={googleRole}
                    onChange={(e) => setGoogleRole(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-slate-900 font-bold focus:outline-none focus:border-blue-500"
                  >
                    <option value="Faculty">👨‍🏫 Faculty (Uploads Evidence Documents)</option>
                    <option value="HOD">🎓 HOD - Head of Department (Stage 1 Review)</option>
                    <option value="Principal">🏛️ Principal (Stage 2 Final Institutional Approval)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Department</label>
                  <input
                    type="text"
                    required
                    value={googleDept}
                    onChange={(e) => setGoogleDept(e.target.value)}
                    placeholder="e.g. Computer Science & Engineering"
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-slate-900 font-semibold focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setGoogleStep('select_account')}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={googleLoading}
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md disabled:opacity-50 flex items-center space-x-1.5 cursor-pointer"
                  >
                    {googleLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <span>Complete Sign In</span>
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

export default Login;
