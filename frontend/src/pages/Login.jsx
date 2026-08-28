import React, { useState, useEffect } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import { ShieldCheck, Mail, Lock, AlertCircle, ChevronDown, ChevronUp, Loader2, KeyRound, Send, Eye, EyeOff, UserPlus } from 'lucide-react';

const Login = () => {
  const { user, loading: authLoading, login, googleOAuth, googleRegister, verifyAndLoginOtp } = useAuth();
  const navigate = useNavigate();

  // Primary Login Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showDemoOptions, setShowDemoOptions] = useState(false);

  // Authentication Method Toggle: 'password' | 'otp'
  const [authMethod, setAuthMethod] = useState('password');
  const [otpEmail, setOtpEmail] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [otpSentState, setOtpSentState] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpMessage, setOtpMessage] = useState(null);
  const [otpError, setOtpError] = useState(null);

  // Timers for OTP
  const [expiryTimeLeft, setExpiryTimeLeft] = useState(0);
  const [cooldownTimeLeft, setCooldownTimeLeft] = useState(0);

  // Google OAuth States
  const [googleLoading, setGoogleLoading] = useState(false);
  const [unregisteredGoogleUser, setUnregisteredGoogleUser] = useState(null); // { email, full_name }

  // Password Renewal Modal States
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetStep, setResetStep] = useState('request');
  const [resetEmail, setResetEmail] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState(null);

  // Load Google GIS script dynamically if client ID is set
  useEffect(() => {
    const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (googleClientId && !window.google) {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    }
  }, []);

  useEffect(() => {
    let timer;
    if (expiryTimeLeft > 0) {
      timer = setInterval(() => setExpiryTimeLeft((prev) => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [expiryTimeLeft]);

  useEffect(() => {
    let timer;
    if (cooldownTimeLeft > 0) {
      timer = setInterval(() => setCooldownTimeLeft((prev) => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [cooldownTimeLeft]);

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

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
      if (err.response?.status === 401 || err.response?.data?.detail?.includes('credentials')) {
        setError("Email or password is incorrect.");
      } else if (err.code === 'ERR_NETWORK' || !err.response) {
        setError("We couldn't sign you in right now. Please try again.");
      } else {
        setError(err.response?.data?.detail || "Email or password is incorrect.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSendStandaloneOtp = async (e) => {
    if (e) e.preventDefault();
    const cleanEmail = (otpEmail || email).trim();
    if (!cleanEmail) {
      setOtpError("Please enter your registered email address.");
      return;
    }
    setOtpLoading(true);
    setOtpError(null);
    setOtpMessage(null);
    try {
      const res = await authAPI.sendOtp(cleanEmail, 'verification');
      setOtpSentState(true);
      setExpiryTimeLeft(300);
      setCooldownTimeLeft(60);
      setOtpMessage(res.data?.message || `🔑 Security verification code dispatched to ${cleanEmail}. Please check your email inbox.`);
    } catch (err) {
      console.error(err);
      setOtpError(err.response?.data?.detail || "Unable to send OTP. Please try again.");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyStandaloneOtp = async (e) => {
    e.preventDefault();
    const cleanEmail = (otpEmail || email).trim();
    if (!cleanEmail || !otpInput.trim()) {
      setOtpError("Please enter your 6-digit verification code.");
      return;
    }
    setOtpLoading(true);
    setOtpError(null);
    setOtpMessage(null);
    try {
      await verifyAndLoginOtp(cleanEmail, otpInput.trim(), 'verification');
      navigate('/');
    } catch (err) {
      console.error(err);
      setOtpError(err.response?.data?.detail || "Invalid or expired OTP. Please request a new OTP.");
    } finally {
      setOtpLoading(false);
    }
  };

  // Official Google OAuth Flow Initiation
  const handleGoogleSignIn = async (directAccount = null) => {
    setError(null);
    setUnregisteredGoogleUser(null);
    setGoogleLoading(true);

    try {
      const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

      // 1. Standard Google Identity Services GIS Flow if script & client ID present
      if (window.google?.accounts?.id && googleClientId && googleClientId !== 'your_google_client_id.apps.googleusercontent.com') {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: async (response) => {
            if (response.credential) {
              await processGoogleAuthResponse({ token: response.credential });
            }
          }
        });
        window.google.accounts.id.prompt();
        setGoogleLoading(false);
        return;
      }

      // 2. Direct account provided (e.g. via test option or prompt)
      if (directAccount) {
        await processGoogleAuthResponse(typeof directAccount === 'string' ? { email: directAccount } : directAccount);
        return;
      }

      // 3. Fallback for development / test mode without active Google client secret
      const promptEmail = window.prompt("Official Google OAuth 2.0 Sign In:\n\nEnter your Google account email address:");
      if (!promptEmail || !promptEmail.trim()) {
        setGoogleLoading(false);
        return;
      }

      await processGoogleAuthResponse({ email: promptEmail.trim().toLowerCase() });
    } catch (err) {
      console.error("Google OAuth Error:", err);
      setError(err.response?.data?.detail || err.message || "Google authentication failed.");
      setGoogleLoading(false);
    }
  };

  const processGoogleAuthResponse = async (payload) => {
    setGoogleLoading(true);
    try {
      const res = await googleOAuth(payload);
      if (res && res.is_registered) {
        // Existing user authenticated -> role retrieved from DB -> navigate to dashboard
        navigate('/');
      } else if (res && !res.is_registered) {
        // Unregistered Google user -> Prompt account creation as Faculty
        setUnregisteredGoogleUser({
          email: res.email,
          full_name: res.full_name || res.email.split('@')[0].replace('.', ' ').replace(/\b\w/g, l => l.toUpperCase())
        });
      }
    } catch (err) {
      console.error("Backend Google OAuth verification error:", err);
      setError(err.response?.data?.detail || "Google OAuth backend verification failed.");
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleCreateFacultyAccount = async () => {
    if (!unregisteredGoogleUser) return;
    setGoogleLoading(true);
    setError(null);
    try {
      await googleRegister(unregisteredGoogleUser.email, unregisteredGoogleUser.full_name, 'Computer Science & Engineering');
      navigate('/');
    } catch (err) {
      console.error("Google Registration Error:", err);
      setError(err.response?.data?.detail || "Failed to register account.");
    } finally {
      setGoogleLoading(false);
    }
  };

  const openResetModal = (prefillEmail = '') => {
    setResetEmail(prefillEmail || email || '');
    setResetOtp('');
    setNewPassword('');
    setResetMessage(null);
    setResetStep('request');
    setIsResetModalOpen(true);
  };

  const handleRequestReset = async (e) => {
    if (e) e.preventDefault();
    if (!resetEmail || !resetEmail.trim()) {
      setResetMessage("Please enter your registered email address.");
      return;
    }
    setResetLoading(true);
    setResetMessage(null);
    try {
      const res = await authAPI.requestPasswordReset(resetEmail.trim());
      setResetStep('verify');
      setResetOtp('');
      setResetMessage(res.data?.message || `🔑 Security renewal code dispatched to ${resetEmail}.`);
    } catch (err) {
      console.error(err);
      setResetMessage(err.response?.data?.detail || "Failed to send reset code.");
    } finally {
      setResetLoading(false);
    }
  };

  const handleCompleteReset = async (e) => {
    e.preventDefault();
    if (!resetOtp.trim() || !newPassword.trim()) {
      setResetMessage("Please enter both the OTP code and your new password.");
      return;
    }
    setResetLoading(true);
    setResetMessage(null);
    try {
      const res = await authAPI.resetPassword(resetEmail.trim(), resetOtp.trim(), newPassword.trim());
      alert("🎉 " + (res.data?.message || "Password renewed successfully!"));
      setIsResetModalOpen(false);
      setEmail(resetEmail.trim());
      setPassword(newPassword.trim());
      await login(resetEmail.trim(), newPassword.trim());
      navigate('/');
    } catch (err) {
      console.error(err);
      setResetMessage(err.response?.data?.detail || "Failed to reset password.");
    } finally {
      setResetLoading(false);
    }
  };

  const handleQuickDemo = (demoEmail) => {
    setEmail(demoEmail);
    setPassword('password123');
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-100 via-blue-50/40 to-indigo-100/50 flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md bg-white rounded-[2rem] p-7 sm:p-9 shadow-2xl border border-slate-100 space-y-6 relative overflow-hidden">
        
        {/* Header Title */}
        <div className="space-y-1 text-left">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            CampusInsight AI
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            NAAC Accreditation Portal
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium space-y-2">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span className="font-semibold">{error}</span>
            </div>
          </div>
        )}

        {/* Unregistered Google User Notice */}
        {unregisteredGoogleUser && (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-3">
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Google account not registered with CampusInsight AI.</p>
                <p className="text-[11px] text-amber-700 font-mono mt-0.5">{unregisteredGoogleUser.email}</p>
                <p className="text-[11px] text-amber-800 mt-1">
                  Elevated permissions are assigned strictly by institutional administrators. You can create a standard Faculty account to continue.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleCreateFacultyAccount}
              disabled={googleLoading}
              className="w-full py-2.5 px-3 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
            >
              {googleLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : (
                <>
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Create Faculty Account</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* METHOD 1: Email / Phone + Password Sign In */}
        {authMethod === 'password' && (
          <form onSubmit={handlePasswordLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-600">
                Email or phone number
              </label>
              <input
                type="text"
                required
                placeholder="Enter email or phone number"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-100/80 border border-transparent text-slate-900 text-sm font-medium focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all placeholder:text-slate-400"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-600">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-4 pr-11 py-3 rounded-xl bg-slate-100/80 border border-transparent text-slate-900 text-sm font-medium focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all placeholder:text-slate-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 transition-colors p-0.5 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center space-x-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded-md text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
                />
                <span className="text-xs font-semibold text-slate-600 group-hover:text-slate-800">
                  Remember me
                </span>
              </label>

              <button
                type="button"
                onClick={() => openResetModal(email)}
                className="text-xs font-semibold text-blue-500 hover:text-blue-600 hover:underline"
              >
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-sm shadow-md shadow-blue-500/25 transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50 mt-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <span>Sign in</span>
              )}
            </button>
          </form>
        )}

        {/* METHOD 2: Email OTP Sign In Option */}
        {authMethod === 'otp' && (
          <div className="space-y-4">
            {otpMessage && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-start space-x-2">
                <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                <span>{otpMessage}</span>
              </div>
            )}

            {otpError && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{otpError}</span>
              </div>
            )}

            {!otpSentState ? (
              <form onSubmit={handleSendStandaloneOtp} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-600">Institutional Email</label>
                  <input
                    type="email"
                    required
                    placeholder="user@institution.edu or name@gmail.com"
                    value={otpEmail || email}
                    onChange={(e) => {
                      setOtpEmail(e.target.value);
                      setEmail(e.target.value);
                    }}
                    className="w-full px-4 py-3 rounded-xl bg-slate-100/80 border border-transparent text-slate-900 text-sm font-medium focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all placeholder:text-slate-400"
                  />
                </div>

                <button
                  type="submit"
                  disabled={otpLoading}
                  className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-500/20 transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
                >
                  {otpLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Send 6-Digit OTP Code</span>
                    </>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyStandaloneOtp} className="space-y-4">
                <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200 text-xs space-y-1">
                  <div className="flex items-center justify-between text-blue-900 font-bold">
                    <span>Target Email: {(otpEmail || email)}</span>
                    {expiryTimeLeft > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[11px] font-mono font-bold">
                        ⏱️ {formatTimer(expiryTimeLeft)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-slate-600">6-Digit Security OTP</label>
                    <button
                      type="button"
                      onClick={handleSendStandaloneOtp}
                      disabled={otpLoading || cooldownTimeLeft > 0}
                      className="text-[11px] font-bold text-blue-600 hover:underline disabled:text-slate-400"
                    >
                      {cooldownTimeLeft > 0 ? `Resend OTP in ${cooldownTimeLeft}s` : 'Resend OTP'}
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="123456"
                    value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                    className="w-full py-3 px-4 text-center font-mono text-xl tracking-[0.5em] font-bold rounded-xl bg-slate-100/80 border border-transparent text-slate-900 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                </div>

                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => {
                      setOtpSentState(false);
                      setOtpInput('');
                      setOtpError(null);
                      setOtpMessage(null);
                    }}
                    className="w-1/3 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all cursor-pointer"
                  >
                    Change Email
                  </button>
                  <button
                    type="submit"
                    disabled={otpLoading || otpInput.length !== 6}
                    className="w-2/3 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-500/20 transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
                  >
                    {otpLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>Verify & Sign In</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Divider: ---------------- OR ---------------- */}
        <div className="relative my-2">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-3 font-semibold text-slate-400">OR</span>
          </div>
        </div>

        {/* Official Google OAuth Sign In Button */}
        <button
          type="button"
          onClick={() => handleGoogleSignIn()}
          disabled={googleLoading}
          className="w-full py-3.5 px-4 rounded-xl bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 font-bold text-xs shadow-xs border border-slate-300 transition-all flex items-center justify-center space-x-3 cursor-pointer disabled:opacity-50"
        >
          {googleLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-slate-600" />
          ) : (
            <>
              <svg className="w-4.5 h-4.5 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>Sign in with Google</span>
            </>
          )}
        </button>

        {/* Switch to Email OTP Sign In / Sign in with Password */}
        <div className="text-center pt-1">
          <button
            type="button"
            onClick={() => {
              setAuthMethod(authMethod === 'password' ? 'otp' : 'password');
              setError(null);
            }}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
          >
            {authMethod === 'password' ? 'Switch to Email OTP Sign In' : 'Sign in with Password'}
          </button>
        </div>

        {/* Collapsible Demo Account Quick Access */}
        <div className="pt-2 border-t border-slate-100 space-y-2">
          <button
            type="button"
            onClick={() => setShowDemoOptions(!showDemoOptions)}
            className="w-full flex items-center justify-between text-[11px] font-extrabold uppercase tracking-wider text-slate-500 hover:text-slate-700 transition-colors"
          >
            <span>Demo Accounts</span>
            {showDemoOptions ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showDemoOptions && (
            <div className="space-y-2">
              <div className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-200 text-center uppercase tracking-wider">
                DEMO ONLY — QUICK ACCESS FOR TESTING
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
                <button type="button" onClick={() => handleQuickDemo('admin@campusinsight.edu')} className="p-2 rounded-lg bg-slate-50 hover:bg-purple-50 text-purple-700 border border-slate-200 text-left cursor-pointer">
                  🔑 System Admin
                </button>
                <button type="button" onClick={() => handleQuickDemo('principal@campusinsight.edu')} className="p-2 rounded-lg bg-slate-50 hover:bg-amber-50 text-amber-800 border border-slate-200 text-left cursor-pointer">
                  🏛️ Principal
                </button>
                <button type="button" onClick={() => handleQuickDemo('hod.cse@campusinsight.edu')} className="p-2 rounded-lg bg-slate-50 hover:bg-blue-50 text-blue-800 border border-slate-200 text-left cursor-pointer">
                  🎓 HOD (CSE)
                </button>
                <button type="button" onClick={() => handleQuickDemo('faculty@campusinsight.edu')} className="p-2 rounded-lg bg-slate-50 hover:bg-emerald-50 text-emerald-800 border border-slate-200 text-left cursor-pointer">
                  👨‍🏫 Faculty
                </button>
              </div>

              {/* Quick Google Test Account Selector */}
              <div className="p-2 bg-slate-50 rounded-xl border border-slate-200 text-[11px] space-y-1 mt-2">
                <span className="font-bold text-slate-700 block">Test Official Google OAuth with Existing Users:</span>
                <div className="grid grid-cols-2 gap-1.5 text-[10.5px]">
                  <button type="button" onClick={() => handleGoogleSignIn('faculty@campusinsight.edu')} className="p-1.5 bg-white hover:bg-emerald-50 text-emerald-900 border border-slate-200 rounded font-semibold text-left">
                    Google: Faculty
                  </button>
                  <button type="button" onClick={() => handleGoogleSignIn('hod.cse@campusinsight.edu')} className="p-1.5 bg-white hover:bg-blue-50 text-blue-900 border border-slate-200 rounded font-semibold text-left">
                    Google: HOD
                  </button>
                  <button type="button" onClick={() => handleGoogleSignIn('principal@campusinsight.edu')} className="p-1.5 bg-white hover:bg-amber-50 text-amber-900 border border-slate-200 rounded font-semibold text-left">
                    Google: Principal
                  </button>
                  <button type="button" onClick={() => handleGoogleSignIn('admin@campusinsight.edu')} className="p-1.5 bg-white hover:bg-purple-50 text-purple-900 border border-slate-200 rounded font-semibold text-left">
                    Google: Admin
                  </button>
                  <button type="button" onClick={() => handleGoogleSignIn('newuser@gmail.com')} className="p-1.5 bg-white hover:bg-rose-50 text-rose-900 border border-slate-200 rounded font-semibold text-left col-span-2">
                    Google: Unregistered (newuser@gmail.com)
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Signup Link */}
        <div className="text-center text-xs text-slate-500 font-medium pt-1 border-t border-slate-100">
          Don't have an account?{' '}
          <Link to="/register" className="text-blue-600 font-bold hover:underline">
            Sign up
          </Link>
        </div>
      </div>

      {/* Password Reset Modal */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 p-7 space-y-5 shadow-2xl animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2 text-slate-900">
                <KeyRound className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-base">Renew / Reset Password</h3>
              </div>
              <button
                onClick={() => setIsResetModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            {resetMessage && (
              <div className={`p-3 rounded-xl text-xs font-medium border flex items-center space-x-2 ${
                resetMessage.includes('successful') || resetMessage.includes('dispatched') || resetMessage.includes('sent')
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}>
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{resetMessage}</span>
              </div>
            )}

            {resetStep === 'request' ? (
              <form onSubmit={handleRequestReset} className="space-y-4 text-xs">
                <p className="text-slate-600">
                  Enter your registered institutional email address to send a 6-digit Security Renewal OTP code.
                </p>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Registered Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="user@institution.edu or name@gmail.com"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="w-full p-3 rounded-xl border border-slate-300 font-bold text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsResetModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md disabled:opacity-50 flex items-center space-x-1.5 cursor-pointer"
                  >
                    {resetLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    <span>Send Renewal OTP</span>
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleCompleteReset} className="space-y-4 text-xs">
                <p className="text-slate-600">
                  Enter the 6-digit Security OTP sent to <b>{resetEmail}</b>, then enter your new password.
                </p>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">6-Digit Security OTP Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 849201"
                    value={resetOtp}
                    onChange={(e) => setResetOtp(e.target.value)}
                    className="w-full p-3 rounded-xl border border-slate-300 font-mono font-bold text-slate-900 tracking-widest text-center text-sm focus:outline-none focus:border-blue-500 bg-blue-50/50"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">New Password</label>
                  <input
                    type="password"
                    required
                    placeholder="Enter new strong password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full p-3 rounded-xl border border-slate-300 font-bold text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex justify-between items-center pt-2">
                  <button
                    type="button"
                    onClick={() => setResetStep('request')}
                    className="text-xs font-bold text-slate-500 hover:text-slate-800"
                  >
                    Resend Code
                  </button>

                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={() => setIsResetModalOpen(false)}
                      className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={resetLoading}
                      className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md disabled:opacity-50 flex items-center space-x-1.5 cursor-pointer"
                    >
                      {resetLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                      <span>Renew Password</span>
                    </button>
                  </div>
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
