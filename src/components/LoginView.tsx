import React, { useState, useEffect } from 'react';
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  ArrowRight, 
  ShieldCheck, 
  Smartphone,
  Key,
  Clock,
  Send,
  Check,
  Compass,
  ArrowLeft
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { authApi, sanitizeRedirectUrl, formatAuthError } from '../lib/api';

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

  // UI Flow & Mode: 'login' | '2fa' | 'forgot_password'
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

  // Resend verification email state (when user attempts to log in with unverified email)
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

  // Initialize query parameters on mount
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
        setSuccessNotice('Email verified successfully! You can now sign in to your account.');
      } else if (reasonParam === 'expired' || expiredParam === 'true') {
        setError('Your session has expired. Please sign in again.');
      }

      if (redirectParam) {
        setRedirectPath(sanitizeRedirectUrl(redirectParam));
      }

      // Ensure URL displays /login
      if (window.location.pathname !== '/login') {
        window.history.replaceState({}, '', '/login' + (window.location.search || ''));
      }
    }
  }, []);

  // Cooldown countdown timer for rate limits & email resends
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const interval = setInterval(() => {
      setCooldownSeconds(prev => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldownSeconds]);

  // Client-side Validation
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

  // 1. Handle Primary Login Submit
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setErrorCode(null);
    setUnverifiedEmail(null);
    setFieldErrors({});

    if (!validateLoginForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const trimmedEmail = email.trim();
      const response = await authApi.login({
        email: trimmedEmail,
        password: password
      });

      if (!response.success) {
        throw new Error(response.message || 'Login failed. Please check your credentials.');
      }

      // Check if Two-Factor Authentication is required
      if (response.twoFactorRequired && response.preAuthToken) {
        setPreAuthToken(response.preAuthToken);
        setAuthMode('2fa');
        setPassword(''); // Clear sensitive password from memory
        return;
      }

      // Success: User is authenticated
      if (response.user) {
        setCurrentUser(response.user);
        await refreshData();

        // Clear password
        setPassword('');

        if (onSuccess) {
          onSuccess();
        } else {
          // Navigate to destination or default to discover
          if (redirectPath === '/merchant-dashboard' || redirectPath === '/merchant_dashboard') {
            setActiveView('merchant_dashboard');
          } else if (redirectPath === '/invoices') {
            setActiveView('invoices');
          } else if (redirectPath === '/campaigns') {
            setActiveView('campaigns');
          } else if (redirectPath === '/ai-marketing' || redirectPath === '/ai_marketing') {
            setActiveView('ai_marketing');
          } else {
            setActiveView('discover');
          }
        }
      }
    } catch (err: unknown) {
      const formatted = formatAuthError(err);
      setErrorCode(formatted.code);

      if (formatted.code === 'EMAIL_NOT_VERIFIED' || formatted.message.toLowerCase().includes('verify your email')) {
        setUnverifiedEmail(email.trim());
        setError('Your email address has not been verified yet. Please check your inbox or request a new verification link.');
      } else if (formatted.isRateLimited) {
        const remaining = formatted.retryAfterSeconds || 60;
        setCooldownSeconds(remaining);
        setError(`Too many failed login attempts. Please wait ${remaining} seconds before trying again.`);
      } else if (formatted.code === 'ACCOUNT_SUSPENDED') {
        setError('This account has been suspended or restricted. Please contact support.');
      } else if (formatted.status === 401 && (formatted.code === 'INVALID_CREDENTIALS' || formatted.message.toLowerCase().includes('credential') || formatted.message.toLowerCase().includes('invalid email or password'))) {
        setError('Invalid email or password. Please verify your credentials and try again.');
      } else {
        setError(formatted.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. Handle Two-Factor Code Verification
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
      setError(formatted.message || 'Two-factor verification failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. Handle Resend Verification Email
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
        if (res.status === 429 || data.code === 'RATE_LIMITED') {
          setCooldownSeconds(data.remainingSeconds || 60);
          throw new Error('Too many requests. Please wait before requesting another email.');
        }
        throw new Error(data.error || 'Unable to dispatch verification email.');
      }

      setResendStatus('sent');
      setResendMessage('Verification email sent! Please check your inbox.');
      setCooldownSeconds(60);
    } catch (err: unknown) {
      setResendStatus('error');
      setResendMessage(err instanceof Error ? err.message : 'Unable to send verification email right now.');
    } finally {
      setIsResendingVerification(false);
    }
  };

  // 4. Handle Forgot Password Request
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
      setSuccessNotice(data.message || 'If an account exists with this email, a secure password reset link has been dispatched.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to request password reset.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Navigation handlers
  const handleRegisterClick = () => {
    if (onNavigateToRegister) {
      onNavigateToRegister();
    } else {
      setActiveView('register');
    }
  };

  const handleDiscoverClick = () => {
    if (onNavigateToDiscover) {
      onNavigateToDiscover();
    } else {
      setActiveView('discover');
    }
  };

  return (
    <div className="w-full min-h-[calc(100vh-80px)] py-12 px-4 sm:px-6 lg:px-8 flex flex-col justify-center items-center bg-slate-950">
      
      {/* Brand Header */}
      <div className="text-center mb-8 max-w-md">
        <button 
          onClick={handleDiscoverClick}
          className="inline-flex items-center gap-2.5 mb-3 group cursor-pointer focus:outline-none"
        >
          <div className="w-10 h-10 rounded-2xl bg-emerald-500 flex items-center justify-center text-slate-950 font-black text-base shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
            B⚡
          </div>
          <span className="text-2xl font-black tracking-tight text-white group-hover:text-emerald-400 transition-colors">
            BOOST MARKET
          </span>
        </button>
        <p className="text-sm font-medium text-slate-400">
          Business growth platform & marketplace
        </p>
      </div>

      {/* Main Login Card */}
      <div className="w-full max-w-md bg-slate-900 border border-slate-800/90 rounded-2xl shadow-2xl p-6 sm:p-8 text-slate-200 backdrop-blur-sm relative overflow-hidden">
        
        {/* Subtle Background Glow */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-36 h-36 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-36 h-36 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Informational / Success Notice Banner */}
        {successNotice && authMode === 'login' && (
          <div 
            id="login-success-notice"
            role="status"
            className="mb-5 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-start gap-2.5 animate-in fade-in"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1 leading-relaxed">
              {successNotice}
            </div>
          </div>
        )}

        {/* Global Error Banner */}
        {error && (
          <div 
            id="login-error-banner"
            role="alert"
            className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-start gap-2.5 animate-in fade-in"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-medium leading-relaxed">{error}</div>

              {/* Actionable guidance for unverified emails */}
              {(errorCode === 'EMAIL_NOT_VERIFIED' || unverifiedEmail) && (
                <div className="mt-3 pt-2.5 border-t border-rose-500/20 space-y-2">
                  <div className="text-slate-300 text-[11px]">
                    Need a new verification link?
                  </div>
                  <button
                    id="unverified-resend-btn"
                    type="button"
                    onClick={handleResendVerification}
                    disabled={isResendingVerification || cooldownSeconds > 0}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-semibold text-xs transition-colors disabled:opacity-50"
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
                        <span>Resend Verification Email</span>
                      </>
                    )}
                  </button>

                  {resendMessage && (
                    <p className={`text-[11px] ${resendStatus === 'sent' ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {resendMessage}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* MODE 1: STANDARD CLIENT LOGIN */}
        {authMode === 'login' && (
          <div>
            <div className="mb-6">
              <h1 className="text-xl font-bold text-white tracking-tight">Sign in to your account</h1>
              <p className="text-xs text-slate-400 mt-1">
                Enter your credentials to access your dashboard and business tools
              </p>
            </div>

            <form id="client-login-form" onSubmit={handleLoginSubmit} noValidate className="space-y-4">
              
              {/* Email Address */}
              <div>
                <label 
                  htmlFor="login-email" 
                  className="block text-xs font-semibold text-slate-300 mb-1.5"
                >
                  Email Address <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                  <input
                    id="login-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (fieldErrors.email) setFieldErrors(prev => ({ ...prev, email: undefined }));
                    }}
                    placeholder="e.g. client@business.ng"
                    aria-invalid={!!fieldErrors.email}
                    aria-describedby={fieldErrors.email ? 'login-email-error' : undefined}
                    className={`w-full min-h-[44px] pl-10 pr-4 py-2.5 bg-slate-950/60 border ${
                      fieldErrors.email ? 'border-rose-500 focus:border-rose-500' : 'border-slate-800 focus:border-emerald-500'
                    } rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors`}
                  />
                </div>
                {fieldErrors.email && (
                  <p id="login-email-error" className="mt-1 text-xs text-rose-400">
                    {fieldErrors.email}
                  </p>
                )}
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label 
                    htmlFor="login-password" 
                    className="text-xs font-semibold text-slate-300"
                  >
                    Password <span className="text-rose-400">*</span>
                  </label>
                  <button
                    id="forgot-password-link"
                    type="button"
                    onClick={() => {
                      setForgotEmail(email);
                      setAuthMode('forgot_password');
                      setError(null);
                    }}
                    className="text-xs text-emerald-400 hover:text-emerald-300 hover:underline cursor-pointer transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                  <input
                    id="login-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (fieldErrors.password) setFieldErrors(prev => ({ ...prev, password: undefined }));
                    }}
                    placeholder="Enter your password"
                    aria-invalid={!!fieldErrors.password}
                    aria-describedby={fieldErrors.password ? 'login-password-error' : undefined}
                    className={`w-full min-h-[44px] pl-10 pr-11 py-2.5 bg-slate-950/60 border ${
                      fieldErrors.password ? 'border-rose-500 focus:border-rose-500' : 'border-slate-800 focus:border-emerald-500'
                    } rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors`}
                  />
                  <button
                    id="toggle-password-visibility-btn"
                    type="button"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-1 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {fieldErrors.password && (
                  <p id="login-password-error" className="mt-1 text-xs text-rose-400">
                    {fieldErrors.password}
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <button
                id="login-submit-btn"
                type="submit"
                disabled={isSubmitting || cooldownSeconds > 0}
                className="w-full min-h-[44px] py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer mt-3"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : cooldownSeconds > 0 ? (
                  <>
                    <Clock className="w-4 h-4" />
                    <span>Wait {cooldownSeconds}s</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

            </form>

            {/* Quick Demo Test Personas Selector */}
            <div className="mt-5 p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl text-[11px] text-slate-400 space-y-1.5">
              <div className="font-semibold text-slate-300 flex items-center justify-between">
                <span>Quick Test Client Accounts:</span>
                <span className="text-[10px] text-emerald-400 font-medium">Click to fill</span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  id="persona-business-btn"
                  onClick={() => { 
                    setEmail('farouk@kadunacode.com'); 
                    setPassword('Client123!'); 
                    setFieldErrors({}); 
                    setError(null);
                  }}
                  className="text-left p-2 rounded-lg bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-emerald-500/40 transition-colors cursor-pointer"
                >
                  <div className="font-bold text-emerald-300 text-[10px]">💼 Business Account</div>
                  <div className="truncate text-slate-400 text-[9px]">farouk@kadunacode...</div>
                </button>
                <button
                  type="button"
                  id="persona-customer-btn"
                  onClick={() => { 
                    setEmail('david.okonjo@gmail.com'); 
                    setPassword('Client123!'); 
                    setFieldErrors({}); 
                    setError(null);
                  }}
                  className="text-left p-2 rounded-lg bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-indigo-500/40 transition-colors cursor-pointer"
                >
                  <div className="font-bold text-indigo-300 text-[10px]">👤 Customer Account</div>
                  <div className="truncate text-slate-400 text-[9px]">david.okonjo@...</div>
                </button>
              </div>
            </div>

            {/* Registration Navigation Link */}
            <div className="mt-6 pt-5 border-t border-slate-800/80 text-center text-xs text-slate-400">
              Don't have an account?{' '}
              <button
                id="create-account-link"
                type="button"
                onClick={handleRegisterClick}
                className="font-bold text-emerald-400 hover:text-emerald-300 hover:underline transition-colors ml-1 cursor-pointer"
              >
                Create an account
              </button>
            </div>
          </div>
        )}

        {/* MODE 2: TWO-FACTOR AUTHENTICATION STEP */}
        {authMode === '2fa' && (
          <div className="space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="text-center py-2">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mx-auto flex items-center justify-center mb-2 shadow-lg shadow-emerald-500/10">
                <Smartphone className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-white">Two-Factor Authentication</h2>
              <p className="text-xs text-slate-400 mt-1">
                Enter the 6-digit TOTP code from your authenticator app or backup recovery code.
              </p>
            </div>

            <form onSubmit={handleTwoFactorSubmit} className="space-y-4">
              {!useRecoveryCode ? (
                <div>
                  <label 
                    htmlFor="two-factor-code-input"
                    className="block text-xs font-semibold text-slate-300 mb-1.5 text-center"
                  >
                    6-Digit Security Code
                  </label>
                  <input
                    id="two-factor-code-input"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    required
                    value={twoFactorCode}
                    onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    className="w-full text-center tracking-[0.5em] font-mono text-2xl py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              ) : (
                <div>
                  <label 
                    htmlFor="two-factor-recovery-input"
                    className="block text-xs font-semibold text-slate-300 mb-1.5 text-center"
                  >
                    Backup Recovery Code
                  </label>
                  <input
                    id="two-factor-recovery-input"
                    type="text"
                    required
                    value={recoveryCode}
                    onChange={(e) => setRecoveryCode(e.target.value.toUpperCase())}
                    placeholder="e.g. REC-A1B2-C3D4"
                    className="w-full text-center font-mono text-sm py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              )}

              <div className="flex items-center justify-between text-xs pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setUseRecoveryCode(!useRecoveryCode);
                    setError(null);
                  }}
                  className="text-emerald-400 hover:underline cursor-pointer"
                >
                  {useRecoveryCode ? 'Use 6-digit TOTP app code' : 'Lost phone? Use recovery code'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    setError(null);
                  }}
                  className="text-slate-400 hover:text-white cursor-pointer"
                >
                  Back to Sign In
                </button>
              </div>

              <button
                id="two-factor-submit-btn"
                type="submit"
                disabled={isSubmitting}
                className="w-full min-h-[44px] py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verifying code...</span>
                  </>
                ) : (
                  <span>Confirm & Authenticate</span>
                )}
              </button>
            </form>
          </div>
        )}

        {/* MODE 3: FORGOT PASSWORD FLOW */}
        {authMode === 'forgot_password' && (
          <div className="space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="text-center py-2">
              <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/30 text-teal-400 mx-auto flex items-center justify-center mb-2 shadow-lg shadow-teal-500/10">
                <Key className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-white">Reset Account Password</h2>
              <p className="text-xs text-slate-400 mt-1">
                Enter your registered email address and we'll send a secure password reset link.
              </p>
            </div>

            {!forgotSubmitted ? (
              <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                <div>
                  <label 
                    htmlFor="forgot-email-input"
                    className="block text-xs font-semibold text-slate-300 mb-1.5"
                  >
                    Registered Email Address <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                    <input
                      id="forgot-email-input"
                      type="email"
                      required
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="name@business.ng"
                      className="w-full min-h-[44px] pl-10 pr-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('login');
                      setError(null);
                    }}
                    className="text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Return to Sign In</span>
                  </button>
                </div>

                <button
                  id="forgot-password-submit-btn"
                  type="submit"
                  disabled={isSubmitting || !forgotEmail.trim()}
                  className="w-full min-h-[44px] py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Sending reset link...</span>
                    </>
                  ) : (
                    <span>Send Password Reset Link</span>
                  )}
                </button>
              </form>
            ) : (
              <div className="space-y-4 text-center">
                <p className="text-xs text-slate-300 leading-relaxed">
                  A reset link has been dispatched to <strong>{forgotEmail}</strong>. Please follow the link in your email to choose a new password.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    setForgotSubmitted(false);
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Back to Sign In
                </button>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Security Assurance Footer */}
      <div className="mt-8 text-center text-xs text-slate-500 flex items-center gap-2 justify-center">
        <ShieldCheck className="w-4 h-4 text-emerald-400/80" />
        <span>256-bit Encrypted Session • Anti-Brute Force Protection</span>
      </div>

    </div>
  );
};
