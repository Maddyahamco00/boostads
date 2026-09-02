import React, { useState, useEffect } from 'react';
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Smartphone,
  Clock,
  Send,
  ArrowLeft
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { authApi, sanitizeRedirectUrl, formatAuthError } from '../lib/api';
import { Logo } from './Logo';

interface LoginViewProps {
  onSuccess?: () => void;
  onNavigateToRegister?: () => void;
  onNavigateToDiscover?: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ 
  onSuccess, 
  onNavigateToRegister, 
  onNavigateToDiscover 
}) => {
  const { setCurrentUser, refreshData, setActiveView } = useApp();

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Mode: 'login' | '2fa' | 'forgot_password'
  const [authMode, setAuthMode] = useState<'login' | '2fa' | 'forgot_password'>('login');

  // 2FA State
  const [preAuthToken, setPreAuthToken] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [useRecoveryCode, setUseRecoveryCode] = useState(false);

  // Status & Feedback
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Resend verification email
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [isResendingVerification, setIsResendingVerification] = useState(false);
  const [resendStatus, setResendStatus] = useState<'idle' | 'sent' | 'error'>('idle');
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState<number>(0);

  // Forgot Password State
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSubmitted, setForgotSubmitted] = useState(false);

  // Redirect target
  const [redirectPath, setRedirectPath] = useState<string>('/');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      
      const registeredParam = params.get('registered');
      const verifiedParam = params.get('verified');
      const emailParam = params.get('email');
      const redirectParam = params.get('redirect') || params.get('returnUrl');
      const reasonParam = params.get('reason');
      const expiredParam = params.get('expired');

      if (emailParam) {
        setEmail(emailParam);
        setForgotEmail(emailParam);
      }

      if (registeredParam === 'true') {
        setSuccessNotice('Registration successful! Please check your email to verify your account before signing in.');
      } else if (verifiedParam === 'true') {
        setSuccessNotice('Email verified! You can now sign in.');
      } else if (reasonParam === 'expired' || expiredParam === 'true') {
        setError('Your session has expired. Please sign in again.');
      }

      if (redirectParam) {
        setRedirectPath(sanitizeRedirectUrl(redirectParam));
      }

      if (window.location.pathname !== '/login') {
        window.history.replaceState({}, '', '/login' + (window.location.search || ''));
      }
    }
  }, []);

  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const interval = setInterval(() => {
      setCooldownSeconds(prev => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldownSeconds]);

  const validateLoginForm = (): boolean => {
    const errors: { email?: string; password?: string } = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      errors.email = 'Email address is required';
    } else if (!emailRegex.test(trimmedEmail)) {
      errors.email = 'Please enter a valid email address';
    }

    if (!password) {
      errors.password = 'Password is required';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setErrorCode(null);
    setUnverifiedEmail(null);
    setFieldErrors({});

    if (!validateLoginForm()) return;

    setIsSubmitting(true);

    try {
      const response = await authApi.login({
        email: email.trim(),
        password: password
      });

      if (!response.success) {
        throw new Error(response.message || 'Login failed. Please check your credentials.');
      }

      if (response.twoFactorRequired && response.preAuthToken) {
        setPreAuthToken(response.preAuthToken);
        setAuthMode('2fa');
        setPassword('');
        return;
      }

      if (response.user) {
        setCurrentUser(response.user);
        await refreshData();
        setPassword('');

        if (onSuccess) {
          onSuccess();
        } else {
          setActiveView('discover');
        }
      }
    } catch (err: unknown) {
      const formatted = formatAuthError(err);
      setErrorCode(formatted.code);

      if (formatted.code === 'EMAIL_NOT_VERIFIED' || formatted.message.toLowerCase().includes('verify your email')) {
        setUnverifiedEmail(email.trim());
        setError('Your email has not been verified yet.');
      } else if (formatted.isRateLimited) {
        const remaining = formatted.retryAfterSeconds || 60;
        setCooldownSeconds(remaining);
        setError(`Too many failed attempts. Please wait ${remaining}s.`);
      } else if (formatted.status === 401) {
        setError('Invalid email or password.');
      } else {
        setError(formatted.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTwoFactorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const codeToVerify = useRecoveryCode ? recoveryCode.trim() : twoFactorCode.trim();
      const response = await authApi.verifyTwoFactor(preAuthToken, codeToVerify);

      if (!response.success) {
        throw new Error(response.message || 'Invalid security verification code.');
      }

      if (response.user) {
        setCurrentUser(response.user);
        await refreshData();
        setTwoFactorCode('');
        setRecoveryCode('');

        if (onSuccess) {
          onSuccess();
        } else {
          setActiveView('discover');
        }
      }
    } catch (err: unknown) {
      const formatted = formatAuthError(err);
      setError(formatted.message || 'Verification failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendVerification = async () => {
    const targetEmail = unverifiedEmail || email.trim();
    if (!targetEmail || isResendingVerification || cooldownSeconds > 0) return;

    setIsResendingVerification(true);
    setResendStatus('idle');
    setResendMessage(null);

    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Unable to send verification email.');
      }

      setResendStatus('sent');
      setResendMessage('Verification email sent! Check your inbox.');
      setCooldownSeconds(60);
    } catch (err: unknown) {
      setResendStatus('error');
      setResendMessage(err instanceof Error ? err.message : 'Failed to send verification email.');
    } finally {
      setIsResendingVerification(false);
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!forgotEmail.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail.trim() })
      });

      const data = await res.json();
      setForgotSubmitted(true);
      setSuccessNotice(data.message || 'If an account exists, a password reset link has been sent.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to request password reset.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full min-h-[calc(100vh-140px)] py-12 px-4 sm:px-6 lg:px-8 flex flex-col justify-center items-center bg-[#F8FAFC] text-[#111827]">
      
      {/* Brand Header */}
      <div className="text-center mb-8">
        <Logo 
          variant="badge" 
          size="sm" 
          showTagline={true} 
          onClick={() => setActiveView('discover')} 
        />
      </div>

      {/* Main Card */}
      <div className="w-full max-w-md bg-white border border-[#E2E8F0] rounded-2xl shadow-sm p-6 sm:p-8 text-slate-900">
        
        {/* Success Notice */}
        {successNotice && authMode === 'login' && (
          <div className="mb-5 p-3 rounded-lg bg-[#16C784]/10 border border-[#16C784]/30 text-[#16C784] text-xs font-medium flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1">{successNotice}</div>
          </div>
        )}

        {/* Error Notice */}
        {error && (
          <div className="mb-5 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1">
              <div>{error}</div>

              {(errorCode === 'EMAIL_NOT_VERIFIED' || unverifiedEmail) && (
                <div className="mt-2 pt-2 border-t border-red-200">
                  <button
                    type="button"
                    onClick={handleResendVerification}
                    disabled={isResendingVerification || cooldownSeconds > 0}
                    className="text-xs font-semibold text-red-800 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    {isResendingVerification ? (
                      <>
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        <span>Sending...</span>
                      </>
                    ) : cooldownSeconds > 0 ? (
                      <>
                        <Clock className="w-3 h-3" />
                        <span>Resend in {cooldownSeconds}s</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3 h-3" />
                        <span>Resend verification email</span>
                      </>
                    )}
                  </button>
                  {resendMessage && (
                    <p className={`text-xs mt-1 ${resendStatus === 'sent' ? 'text-[#16C784]' : 'text-red-700'}`}>
                      {resendMessage}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* MODE 1: LOGIN */}
        {authMode === 'login' && (
          <div>
            <div className="mb-6 text-center">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Sign in to your account</h1>
              <p className="text-xs text-slate-500 mt-1">Access your business tools and local client services</p>
            </div>

            <form onSubmit={handleLoginSubmit} noValidate className="space-y-4">
              
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email
                </label>
                <input
                  id="login-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (fieldErrors.email) setFieldErrors(prev => ({ ...prev, email: undefined }));
                  }}
                  placeholder="name@example.com"
                  className={`w-full px-3.5 py-2.5 bg-white border ${
                    fieldErrors.email ? 'border-red-500' : 'border-[#E2E8F0]'
                  } rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#16C784] focus:ring-1 focus:ring-[#16C784] transition-colors`}
                />
                {fieldErrors.email && (
                  <p className="mt-1 text-xs text-red-600">{fieldErrors.email}</p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        window.history.pushState({}, '', `/forgot-password${email ? `?email=${encodeURIComponent(email)}` : ''}`);
                      }
                      setActiveView('forgot_password');
                    }}
                    className="text-xs font-medium text-[#16C784] hover:underline cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (fieldErrors.password) setFieldErrors(prev => ({ ...prev, password: undefined }));
                    }}
                    placeholder="••••••••"
                    className={`w-full px-3.5 pr-10 py-2.5 bg-white border ${
                      fieldErrors.password ? 'border-red-500' : 'border-[#E2E8F0]'
                    } rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#16C784] focus:ring-1 focus:ring-[#16C784] transition-colors`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {fieldErrors.password && (
                  <p className="mt-1 text-xs text-red-600">{fieldErrors.password}</p>
                )}
              </div>

              <button
                id="login-submit-btn"
                type="submit"
                disabled={isSubmitting || cooldownSeconds > 0}
                className="w-full py-2.5 px-4 rounded-lg bg-[#16C784] hover:bg-[#14B8A6] text-white font-semibold text-sm transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Signing in...
                  </span>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>

            {/* Quick Test Accounts */}
            <div className="mt-6 pt-4 border-t border-slate-100 text-xs">
              <div className="text-slate-500 mb-2 font-medium">Demo client accounts:</div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => { 
                    setEmail('farouk@kadunacode.com'); 
                    setPassword('Client123!'); 
                    setFieldErrors({}); 
                    setError(null);
                  }}
                  className="p-2 text-left rounded-lg bg-slate-50 hover:bg-[#16C784]/10 border border-[#E2E8F0] hover:border-[#16C784]/40 transition-colors cursor-pointer"
                >
                  <div className="font-semibold text-slate-900">Business</div>
                  <div className="text-slate-500 truncate text-[11px]">farouk@kadunacode...</div>
                </button>
                <button
                  type="button"
                  onClick={() => { 
                    setEmail('david.okonjo@gmail.com'); 
                    setPassword('Client123!'); 
                    setFieldErrors({}); 
                    setError(null);
                  }}
                  className="p-2 text-left rounded-lg bg-slate-50 hover:bg-[#16C784]/10 border border-[#E2E8F0] hover:border-[#16C784]/40 transition-colors cursor-pointer"
                >
                  <div className="font-semibold text-slate-900">Customer</div>
                  <div className="text-slate-500 truncate text-[11px]">david.okonjo@...</div>
                </button>
              </div>
            </div>

            {/* Sign Up Link */}
            <div className="mt-6 text-center text-xs text-slate-500">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => setActiveView('register')}
                className="font-semibold text-[#16C784] hover:underline cursor-pointer"
              >
                Sign up
              </button>
            </div>
          </div>
        )}

        {/* MODE 2: 2FA */}
        {authMode === '2fa' && (
          <div className="space-y-4">
            <div className="text-center">
              <div className="w-10 h-10 rounded-lg bg-[#16C784]/15 text-[#16C784] mx-auto flex items-center justify-center mb-2">
                <Smartphone className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">Two-Factor Authentication</h2>
              <p className="text-xs text-slate-500 mt-1">
                Enter your 6-digit authenticator code or recovery code.
              </p>
            </div>

            <form onSubmit={handleTwoFactorSubmit} className="space-y-4">
              {!useRecoveryCode ? (
                <div>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    required
                    value={twoFactorCode}
                    onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    className="w-full text-center tracking-widest font-mono text-xl py-2.5 bg-white border border-[#E2E8F0] rounded-lg text-slate-900 focus:outline-none focus:border-[#16C784] focus:ring-1 focus:ring-[#16C784]"
                  />
                </div>
              ) : (
                <div>
                  <input
                    type="text"
                    required
                    value={recoveryCode}
                    onChange={(e) => setRecoveryCode(e.target.value.toUpperCase())}
                    placeholder="REC-XXXX-XXXX"
                    className="w-full text-center font-mono text-sm py-2.5 bg-white border border-[#E2E8F0] rounded-lg text-slate-900 focus:outline-none focus:border-[#16C784] focus:ring-1 focus:ring-[#16C784]"
                  />
                </div>
              )}

              <div className="flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setUseRecoveryCode(!useRecoveryCode);
                    setError(null);
                  }}
                  className="text-[#16C784] font-medium hover:underline cursor-pointer"
                >
                  {useRecoveryCode ? 'Use 6-digit code' : 'Use recovery code'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    setError(null);
                  }}
                  className="text-slate-500 hover:text-slate-900 cursor-pointer"
                >
                  Back
                </button>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 rounded-lg bg-[#16C784] hover:bg-[#14B8A6] text-white font-semibold text-sm transition-colors cursor-pointer shadow-xs"
              >
                {isSubmitting ? 'Verifying...' : 'Verify'}
              </button>
            </form>
          </div>
        )}

        {/* MODE 3: FORGOT PASSWORD */}
        {authMode === 'forgot_password' && (
          <div className="space-y-4">
            <div className="text-center">
              <h2 className="text-lg font-bold text-slate-900">Reset password</h2>
              <p className="text-xs text-slate-500 mt-1">
                Enter your email address and we'll send a reset link.
              </p>
            </div>

            {!forgotSubmitted ? (
              <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full px-3.5 py-2.5 bg-white border border-[#E2E8F0] rounded-lg text-sm text-slate-900 focus:outline-none focus:border-[#16C784] focus:ring-1 focus:ring-[#16C784]"
                  />
                </div>

                <div className="flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('login');
                      setError(null);
                    }}
                    className="text-slate-500 hover:text-slate-900 flex items-center gap-1 cursor-pointer font-medium"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Back to Sign In
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || !forgotEmail.trim()}
                  className="w-full py-2.5 rounded-lg bg-[#16C784] hover:bg-[#14B8A6] text-white font-semibold text-sm transition-colors cursor-pointer shadow-xs"
                >
                  {isSubmitting ? 'Sending...' : 'Send reset link'}
                </button>
              </form>
            ) : (
              <div className="space-y-4 text-center">
                <p className="text-xs text-slate-600">
                  If an account exists for {forgotEmail}, instructions will be sent shortly.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    setForgotSubmitted(false);
                  }}
                  className="w-full py-2 px-4 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Back to Sign In
                </button>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
