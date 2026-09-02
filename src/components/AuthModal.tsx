import React, { useState } from 'react';
import { 
  X, 
  Mail, 
  Lock, 
  User, 
  AlertCircle, 
  CheckCircle2, 
  RefreshCw, 
  Eye,
  EyeOff
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

      setSuccessMessage(data.message || 'Account created! Verification link sent.');
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
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        credentials: 'include',
        body: JSON.stringify({
          email,
          password,
          twoFactorCode: useRecoveryCode ? undefined : twoFactorCode,
          recoveryCode: useRecoveryCode ? recoveryCode : undefined
        })
      });

      const data = await res.json();
      if (!data.success) {
        if (data.twoFactorRequired || data.requiresTwoFactor) {
          setPreAuthToken(data.preAuthToken);
          setTab('2fa');
          return;
        }
        if (data.setupRequired) {
          setTab('admin_setup');
          setError('Admin setup required. Please use the Admin Setup flow.');
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
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        credentials: 'include',
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

      setSuccessMessage('Email verified successfully!');
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
      setSuccessMessage(data.message || 'Password reset link sent if account exists.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send reset link');
    } finally {
      setLoading(false);
    }
  };

  // 6. Handle Admin Setup
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

      setSuccessMessage('Admin password configured. You can now log in.');
      setTimeout(() => {
        setTab('login');
      }, 1200);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Admin setup failed');
    } finally {
      setLoading(false);
    }
  };

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden text-gray-900">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              {tab === 'login' && 'Sign In'}
              {tab === 'register' && 'Create Account'}
              {tab === 'forgot' && 'Reset Password'}
              {tab === 'admin_setup' && 'Admin Setup'}
              {tab === 'verify' && 'Verify Email'}
              {tab === '2fa' && 'Two-Factor Authentication'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        {['login', 'register', 'admin_setup'].includes(tab) && (
          <div className="flex border-b border-gray-100 bg-gray-50/50 p-1">
            <button
              type="button"
              onClick={() => { setTab('login'); resetForm(); }}
              className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                tab === 'login' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setTab('register'); resetForm(); }}
              className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                tab === 'register' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Register
            </button>
            <button
              type="button"
              onClick={() => { setTab('admin_setup'); resetForm(); }}
              className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                tab === 'admin_setup' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Admin Setup
            </button>
          </div>
        )}

        <div className="p-6 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-xs flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* TAB 1: SIGN IN */}
          {tab === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-xs text-gray-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-gray-700">Password</label>
                  <button
                    type="button"
                    onClick={() => { setTab('forgot'); resetForm(); }}
                    className="text-xs text-blue-600 hover:underline cursor-pointer"
                  >
                    Forgot?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-9 py-2 bg-white border border-gray-200 rounded-lg text-xs text-gray-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs transition-colors disabled:opacity-50 cursor-pointer"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          )}

          {/* TAB 2: REGISTER */}
          {tab === 'register' && (
            <form onSubmit={handleRegister} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jane Doe"
                    className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-xs text-gray-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="jane@example.com"
                    className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-xs text-gray-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Password</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 8 chars"
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs text-gray-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Confirm</label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs text-gray-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="modal-terms"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor="modal-terms" className="text-xs text-gray-600 cursor-pointer">
                  I agree to the Terms and Privacy Policy.
                </label>
              </div>

              <button
                type="submit"
                disabled={loading || !termsAccepted}
                className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs transition-colors disabled:opacity-50 cursor-pointer"
              >
                {loading ? 'Creating...' : 'Create Account'}
              </button>
            </form>
          )}

          {/* TAB 3: 2FA */}
          {tab === '2fa' && (
            <form onSubmit={handleVerify2FA} className="space-y-4">
              <div className="text-center text-xs text-gray-600">
                Enter your 6-digit authentication code
              </div>

              <div>
                <input
                  type="text"
                  maxLength={6}
                  required
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  className="w-full text-center tracking-widest font-mono text-lg py-2 bg-white border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs transition-colors cursor-pointer"
              >
                {loading ? 'Verifying...' : 'Verify'}
              </button>
            </form>
          )}

          {/* TAB 4: ADMIN SETUP */}
          {tab === 'admin_setup' && (
            <form onSubmit={handleAdminSetup} className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-gray-700">Setup Token</label>
                <button
                  type="button"
                  onClick={handleRequestAdminSetupEmail}
                  className="text-[11px] text-blue-600 hover:underline cursor-pointer"
                >
                  Send Token to Email
                </button>
              </div>
              <input
                type="text"
                required
                value={adminToken}
                onChange={(e) => setAdminToken(e.target.value)}
                placeholder="Paste token from email"
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-mono text-gray-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
              />

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">New Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs text-gray-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Confirm Password</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs text-gray-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs transition-colors cursor-pointer"
              >
                {loading ? 'Saving...' : 'Set Admin Password'}
              </button>
            </form>
          )}

          {/* TAB 5: VERIFY EMAIL */}
          {tab === 'verify' && (
            <form onSubmit={handleVerifyEmail} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Verification Token</label>
                <input
                  type="text"
                  required
                  value={verifyToken}
                  onChange={(e) => setVerifyToken(e.target.value)}
                  placeholder="Paste token"
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-mono text-gray-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs transition-colors cursor-pointer"
              >
                {loading ? 'Verifying...' : 'Verify Token'}
              </button>
            </form>
          )}

          {/* TAB 6: FORGOT PASSWORD */}
          {tab === 'forgot' && (
            <form onSubmit={handleForgotPassword} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs text-gray-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs transition-colors cursor-pointer"
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
