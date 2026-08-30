import React, { useState } from 'react';
import { 
  X, 
  Mail, 
  Lock, 
  User, 
  ShieldCheck, 
  Key, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Crown, 
  Smartphone,
  Eye,
  EyeOff,
  Building2,
  Briefcase,
  Layers,
  Sparkles
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ClientType } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'login' | 'register' | 'forgot' | 'admin_setup' | 'verify';
  initialToken?: string;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'login',
  initialToken = ''
}) => {
  const { setCurrentUser, refreshData } = useApp();
  const [tab, setTab] = useState<'login' | 'register' | 'forgot' | 'admin_setup' | 'verify' | '2fa'>(initialTab);

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [clientType, setClientType] = useState<ClientType>('business');
  const [termsAccepted, setTermsAccepted] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // 2FA / Token fields
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [preAuthToken, setPreAuthToken] = useState('');
  const [verifyToken, setVerifyToken] = useState(initialToken);
  const [adminToken, setAdminToken] = useState(initialToken);
  const [useRecoveryCode, setUseRecoveryCode] = useState(false);

  // Status
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const resetForm = () => {
    setError(null);
    setSuccessMessage(null);
    setPassword('');
    setConfirmPassword('');
    setTwoFactorCode('');
    setRecoveryCode('');
  };

  // Password strength calculation
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: 'Empty', color: 'bg-slate-700' };
    let score = 0;
    if (pass.length >= 8) score++;
    if (pass.length >= 12) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;

    if (score <= 2) return { score, label: 'Weak', color: 'bg-rose-500' };
    if (score <= 4) return { score, label: 'Moderate', color: 'bg-amber-500' };
    return { score, label: 'Strong (Production Grade)', color: 'bg-emerald-500' };
  };

  const passStrength = getPasswordStrength(password);

  // 1. Handle Registration
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          password,
          confirmPassword,
          phone,
          clientType,
          termsAccepted
        })
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Registration failed');
      }

      setSuccessMessage(data.message || 'Account created! Verification link sent to your email.');
      if (data.emailLog?.token) {
        setVerifyToken(data.emailLog.token);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  // 2. Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          twoFactorCode: useRecoveryCode ? undefined : twoFactorCode,
          recoveryCode: useRecoveryCode ? recoveryCode : undefined
        })
      });

      const data = await res.json();
      if (!data.success) {
        if (data.requiresTwoFactor) {
          setPreAuthToken(data.preAuthToken);
          setTab('2fa');
          return;
        }
        if (data.setupRequired) {
          setTab('admin_setup');
          setError('Super Admin master password has not been created yet. Please use the Admin Setup flow.');
          return;
        }
        throw new Error(data.error || 'Login failed');
      }

      if (data.user) {
        setCurrentUser(data.user);
        await refreshData();
        onClose();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  // 3. Handle 2FA Verification
  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preAuthToken,
          code: useRecoveryCode ? recoveryCode : twoFactorCode
        })
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Invalid 2FA code');
      }

      if (data.user) {
        setCurrentUser(data.user);
        await refreshData();
        onClose();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '2FA verification failed');
    } finally {
      setLoading(false);
    }
  };

  // 4. Handle Email Verification
  const handleVerifyEmail = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: verifyToken })
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Verification failed');
      }

      setSuccessMessage('Email verified successfully! Your account is now ACTIVE. You can sign in.');
      if (data.user) {
        setCurrentUser(data.user);
        await refreshData();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  // 5. Handle Forgot Password
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await res.json();
      setSuccessMessage(data.message || 'If that account exists, a secure password reset link has been dispatched.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to request password reset');
    } finally {
      setLoading(false);
    }
  };

  // 6. Handle Super Admin Initial Password Setup
  const handleAdminSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/admin/setup-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: adminToken,
          newPassword: password,
          confirmPassword
        })
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Admin setup failed');
      }

      setSuccessMessage('Super Admin master password configured! You may now log in.');
      setTimeout(() => {
        setTab('login');
        setEmail('maddyahamco00@gmail.com');
      }, 1500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Admin setup failed');
    } finally {
      setLoading(false);
    }
  };

  // Request Super Admin Setup Email Dispatch
  const handleRequestAdminSetupEmail = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/admin/init-setup', { method: 'POST' });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setSuccessMessage(data.message);
      if (data.emailLog?.token) {
        setAdminToken(data.emailLog.token);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to dispatch setup link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-slate-200">
        
        {/* Header with Brand & Close */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-black text-sm shadow-md shadow-emerald-500/20">
              B⚡
            </div>
            <div>
              <div className="font-extrabold text-sm tracking-tight text-white flex items-center gap-1.5">
                BOOST MARKET
                <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-400 px-1.5 py-0.2 rounded bg-emerald-500/10 border border-emerald-500/20">
                  Auth Engine
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Strict Dual-Role Security Architecture</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation (Sign In / Register / Admin / Verify) */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 p-1">
          <button
            type="button"
            onClick={() => { setTab('login'); resetForm(); }}
            className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all ${
              tab === 'login' 
                ? 'bg-slate-800 text-emerald-400 shadow-sm' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setTab('register'); resetForm(); }}
            className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all ${
              tab === 'register' 
                ? 'bg-slate-800 text-emerald-400 shadow-sm' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Register Client
          </button>
          <button
            type="button"
            onClick={() => { setTab('admin_setup'); resetForm(); }}
            className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${
              tab === 'admin_setup' 
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                : 'text-amber-400/80 hover:text-amber-300'
            }`}
          >
            <Crown className="w-3.5 h-3.5" />
            CEO Setup
          </button>
        </div>

        <div className="p-6 max-h-[80vh] overflow-y-auto">
          {/* Feedback messages */}
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-start gap-2.5 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1">
                <div>{successMessage}</div>
                {verifyToken && tab === 'register' && (
                  <button
                    type="button"
                    onClick={() => { setTab('verify'); }}
                    className="mt-2 text-xs font-bold text-emerald-300 underline flex items-center gap-1"
                  >
                    Quick-Verify Token Now <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* TAB 1: SIGN IN */}
          {tab === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. maddyahamco00@gmail.com or client@business.ng"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-300">Password</label>
                  <button
                    type="button"
                    onClick={() => { setTab('forgot'); resetForm(); }}
                    className="text-xs text-emerald-400 hover:underline"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter account password"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Quick Demo Credentials Help */}
              <div className="p-3 bg-slate-950/40 border border-slate-800 rounded-xl text-[11px] text-slate-400 space-y-1.5">
                <div className="font-semibold text-slate-300 flex items-center justify-between">
                  <span>Quick Test Personas:</span>
                  <span className="text-[10px] text-emerald-400">Click to fill</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => { setEmail('maddyahamco00@gmail.com'); setPassword('Admin2026!'); }}
                    className="text-left p-1.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700/60 transition-colors"
                  >
                    <div className="font-bold text-amber-300 text-[10px]">👑 Super Admin (CEO)</div>
                    <div className="truncate text-slate-400 text-[9px]">maddyahamco00@...</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setEmail('farouk@kadunacode.com'); setPassword('Client123!'); }}
                    className="text-left p-1.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700/60 transition-colors"
                  >
                    <div className="font-bold text-emerald-300 text-[10px]">💼 Client (Business)</div>
                    <div className="truncate text-slate-400 text-[9px]">farouk@kadunacode...</div>
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Secure Sign In'}
              </button>
            </form>
          )}

          {/* TAB 2: CLIENT REGISTRATION */}
          {tab === 'register' && (
            <form onSubmit={handleRegister} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="john@example.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min. 8 characters"
                      className="w-full pl-3 pr-10 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-1"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Confirm Password</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat password"
                      className="w-full pl-3 pr-10 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-1"
                    >
                      {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Password strength meter */}
              {password && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>Password Strength:</span>
                    <span className="font-bold text-slate-200">{passStrength.label}</span>
                  </div>
                  <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden flex">
                    <div className={`h-full transition-all duration-300 ${passStrength.color}`} style={{ width: `${(passStrength.score / 5) * 100}%` }} />
                  </div>
                </div>
              )}

              <div className="flex items-start gap-2 pt-1">
                <input
                  type="checkbox"
                  id="terms"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-0.5 rounded bg-slate-950 border-slate-800 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                />
                <label htmlFor="terms" className="text-[11px] text-slate-400 leading-snug cursor-pointer">
                  I agree to the <span className="text-emerald-400">Terms of Service</span> and <span className="text-emerald-400">Privacy Policy</span>.
                </label>
              </div>

              <button
                type="submit"
                disabled={loading || !termsAccepted}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Create Account'}
              </button>
            </form>
          )}

          {/* TAB 3: 2FA STEP */}
          {tab === '2fa' && (
            <form onSubmit={handleVerify2FA} className="space-y-4">
              <div className="text-center py-2">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 mx-auto flex items-center justify-center mb-2">
                  <Smartphone className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-white">Two-Factor Authentication</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Enter the 6-digit TOTP code from your authenticator app or backup recovery code.
                </p>
              </div>

              {!useRecoveryCode ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 text-center">
                    6-Digit Security Code
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    required
                    value={twoFactorCode}
                    onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    className="w-full text-center tracking-[0.5em] font-mono text-xl py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 text-center">
                    Backup Recovery Code
                  </label>
                  <input
                    type="text"
                    required
                    value={recoveryCode}
                    onChange={(e) => setRecoveryCode(e.target.value.toUpperCase())}
                    placeholder="e.g. REC-A1B2-C3D4"
                    className="w-full text-center font-mono text-sm py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              )}

              <div className="flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => setUseRecoveryCode(!useRecoveryCode)}
                  className="text-emerald-400 hover:underline"
                >
                  {useRecoveryCode ? 'Use 6-digit TOTP app code' : 'Lost phone? Use recovery code'}
                </button>
                <button
                  type="button"
                  onClick={() => { setTab('login'); resetForm(); }}
                  className="text-slate-400 hover:text-white"
                >
                  Back to Sign In
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-lg flex items-center justify-center gap-2"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Confirm & Authenticate'}
              </button>
            </form>
          )}

          {/* TAB 4: SUPER ADMIN SETUP */}
          {tab === 'admin_setup' && (
            <div className="space-y-4">
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300 flex items-start gap-2.5">
                <Crown className="w-5 h-5 shrink-0 text-amber-400" />
                <div>
                  <div className="font-bold">Super Admin Invariant Authority</div>
                  <div className="text-amber-200/80 text-[11px] mt-0.5">
                    Designated Owner / CEO: <code className="text-white font-mono">maddyahamco00@gmail.com</code>.
                    Admin setup tokens are single-use and sent via secure email channel.
                  </div>
                </div>
              </div>

              <form onSubmit={handleAdminSetup} className="space-y-3.5">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-300">Admin Setup Token</label>
                    <button
                      type="button"
                      onClick={handleRequestAdminSetupEmail}
                      className="text-[10px] text-amber-400 font-bold hover:underline flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" /> Dispatch Token to Email
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    value={adminToken}
                    onChange={(e) => setAdminToken(e.target.value)}
                    placeholder="Paste single-use token from email"
                    className="w-full px-3.5 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">New Super Admin Password</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 8 characters with numbers & letters"
                    className="w-full px-3.5 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Confirm Super Admin Password</label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat master password"
                    className="w-full px-3.5 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Set Master Super Admin Password'}
                </button>
              </form>
            </div>
          )}

          {/* TAB 5: EMAIL VERIFICATION */}
          {tab === 'verify' && (
            <form onSubmit={handleVerifyEmail} className="space-y-4">
              <div className="text-center py-2">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 mx-auto flex items-center justify-center mb-2">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-white">Activate Client Account</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Enter the single-use verification token sent to your email address.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Verification Token</label>
                <input
                  type="text"
                  required
                  value={verifyToken}
                  onChange={(e) => setVerifyToken(e.target.value)}
                  placeholder="Paste verification token"
                  className="w-full px-3.5 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => { setTab('login'); resetForm(); }}
                  className="text-slate-400 hover:text-white"
                >
                  Back to Sign In
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg flex items-center justify-center gap-2"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Verify & Activate Account'}
              </button>
            </form>
          )}

          {/* TAB 6: FORGOT PASSWORD */}
          {tab === 'forgot' && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="text-center py-2">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-500/30 text-blue-400 mx-auto flex items-center justify-center mb-2">
                  <Key className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-white">Reset Account Password</h3>
                <p className="text-xs text-slate-400 mt-1">
                  We will send a cryptographically secure, single-use reset link to your email.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Registered Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@domain.ng"
                  className="w-full px-3.5 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => { setTab('login'); resetForm(); }}
                  className="text-emerald-400 hover:underline"
                >
                  Return to Sign In
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-400 hover:to-indigo-400 text-white font-bold text-xs shadow-lg flex items-center justify-center gap-2"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Send Password Reset Link'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
