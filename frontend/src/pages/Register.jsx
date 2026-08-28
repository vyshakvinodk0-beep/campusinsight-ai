import React, { useState, useEffect } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Mail, Lock, User as UserIcon, UserPlus, AlertCircle, Loader2 } from 'lucide-react';

const Register = () => {
  const { user, loading: authLoading, register, googleOAuth, googleRegister } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('Faculty');
  const [department, setDepartment] = useState('Computer Science & Engineering');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await register({
        email: email.trim().toLowerCase(),
        password: password.trim(),
        full_name: fullName.trim(),
        role,
        department: department.trim()
      });
      navigate('/');
    } catch (err) {
      console.error("Registration error:", err);
      setError(err.response?.data?.detail || 'Failed to register account. Please check details.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async (directAccount = null) => {
    setError(null);
    setGoogleLoading(true);

    try {
      const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

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

      if (directAccount) {
        await processGoogleAuthResponse(typeof directAccount === 'string' ? { email: directAccount } : directAccount);
        return;
      }

      const promptEmail = window.prompt("Official Google OAuth 2.0 Registration:\n\nEnter your Google account email address:");
      if (!promptEmail || !promptEmail.trim()) {
        setGoogleLoading(false);
        return;
      }

      await processGoogleAuthResponse({ email: promptEmail.trim().toLowerCase() });
    } catch (err) {
      console.error("Google OAuth Sign Up Error:", err);
      setError(err.response?.data?.detail || err.message || "Google authentication failed.");
      setGoogleLoading(false);
    }
  };

  const processGoogleAuthResponse = async (payload) => {
    setGoogleLoading(true);
    try {
      const res = await googleOAuth(payload);
      if (res && res.is_registered) {
        navigate('/');
      } else if (res && !res.is_registered) {
        // Register new Google account as Faculty
        await googleRegister(res.email, res.full_name || res.email.split('@')[0].replace('.', ' ').replace(/\b\w/g, l => l.toUpperCase()), department);
        navigate('/');
      }
    } catch (err) {
      console.error("Backend Google OAuth registration error:", err);
      setError(err.response?.data?.detail || "Google OAuth registration failed.");
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-100 via-blue-50/40 to-indigo-100/50 flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md bg-white rounded-[2rem] p-7 sm:p-9 shadow-2xl border border-slate-100 space-y-6 relative overflow-hidden">
        
        {/* Title Header */}
        <div className="space-y-1 text-left">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Create Account
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            CampusInsight AI • NAAC Accreditation Portal
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span className="font-semibold">{error}</span>
          </div>
        )}

        {/* Official Google Sign-Up Button */}
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
              <span>Sign up with Google</span>
            </>
          )}
        </button>

        {/* Divider */}
        <div className="relative my-2">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-3 font-semibold text-slate-400">OR REGISTER WITH EMAIL</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-600">Full Name & Title</label>
            <input
              type="text"
              required
              placeholder="Dr. Rajesh Kumar"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-100/80 border border-transparent text-slate-900 text-sm font-medium focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all placeholder:text-slate-400"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-600">Institutional Email</label>
            <input
              type="email"
              required
              placeholder="rajesh.k@institution.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-100/80 border border-transparent text-slate-900 text-sm font-medium focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all placeholder:text-slate-400"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-600">Password</label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-100/80 border border-transparent text-slate-900 text-sm font-medium focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all placeholder:text-slate-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-600">Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-100/80 border border-transparent text-slate-900 text-xs font-bold focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
              >
                <option value="Faculty">Faculty</option>
                <option value="HOD">HOD</option>
                <option value="Principal">Principal</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-600">Department</label>
              <input
                type="text"
                required
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-100/80 border border-transparent text-slate-900 text-xs font-medium focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-sm shadow-md shadow-blue-500/25 transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50 mt-2"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Create Account</span>
              </>
            )}
          </button>
        </form>

        <div className="text-center text-xs text-slate-500 font-medium pt-1 border-t border-slate-100">
          Already have an account?{' '}
          <Link to="/login" className="text-blue-600 font-bold hover:underline">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
