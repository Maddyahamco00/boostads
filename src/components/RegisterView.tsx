import React, { useState, useEffect } from 'react';
import { 
  User, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  ArrowRight, 
  ShieldCheck, 
  Sparkles,
  Building2,
  Check,
  Send,
  Clock
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { UserProfile } from '../types';

interface RegisterViewProps {
  onNavigateToLogin?: () => void;
}

export const RegisterView: React.FC<RegisterViewProps> = ({ onNavigateToLogin }) => {
  const { setActiveView } = useApp();

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);

  // UI States
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    terms?: string;
  }>({});

  // Success States
  const [registeredUser, setRegisteredUser] = useState<UserProfile | null>(null);
  const [resendStatus, setResendStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle');
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState<number>(0);

  // Sync URL to /register on mount
  useEffect(() => {
    if (window.location.pathname !== '/register') {
      window.history.replaceState({}, '', '/register');
    }
  }, []);

  // Resend cooldown timer
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = setInterval(() => {
      setCooldownSeconds(prev => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  // Password strength calculation
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: 'Empty', color: 'bg-slate-800' };
    let score = 0;
    if (pass.length >= 8) score++;
    if (pass.length >= 12) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;

    if (score <= 2) return { score, label: 'Weak', color: 'bg-rose-500' };
    if (score <= 4) return { score, label: 'Fair', color: 'bg-amber-500' };
    return { score, label: 'Strong', color: 'bg-emerald-500' };
  };

  const passStrength = getPasswordStrength(password);

  // Client-side Validation
  const validateForm = () => {
    const errors: {
      name?: string;
      email?: string;
      password?: string;
      confirmPassword?: string;
      terms?: string;
    } = {};

    const trimmedName = name.trim();
    if (!trimmedName) {
      errors.name = 'Full name is required';
    } else if (trimmedName.length < 2) {
      errors.name = 'Name must be at least 2 characters';
    } else if (trimmedName.length > 100) {
      errors.name = 'Name must be at most 100 characters';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      errors.email = 'Email address is required';
    } else if (!emailRegex.test(trimmedEmail)) {
      errors.email = 'Please enter a valid email address';
    }

    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    } else if (!/[A-Za-z]/.test(password)) {
      errors.password = 'Password must contain at least one letter';
    } else if (!/[0-9]/.test(password)) {
      errors.password = 'Password must contain at least one number';
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    if (!termsAccepted) {
      errors.terms = 'You must agree to the Terms of Service and Privacy Policy';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // NOTE: Strictly send sanitized payload. NEVER send role or isAdmin.
      const payload = {
        name: name.trim(),
        email: email.trim(),
        password: password,
        confirmPassword: confirmPassword,
        termsAccepted: termsAccepted
      };

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        if (data.errors && typeof data.errors === 'object') {
          setFieldErrors(data.errors);
        } else if (data.details && Array.isArray(data.details)) {
          const newErrors: Record<string, string> = {};
          data.details.forEach((d: { path?: string; message?: string }) => {
            if (d.path) newErrors[d.path] = d.message || 'Invalid input';
          });
          setFieldErrors(newErrors);
        }
        throw new Error(data.error || 'Registration could not be completed. Please try again.');
      }

      // Success
      setRegisteredUser(data.user);
      // Clear sensitive password inputs
      setPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      if (err instanceof TypeError && err.message.includes('fetch')) {
        setError('Unable to connect to Boost Market. Please check your internet connection and try again.');
      } else {
        setError(err instanceof Error ? err.message : 'Something went wrong. Please try again later.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Resend Verification Email
  const handleResendVerification = async () => {
    if (!registeredUser?.email || isSubmitting || resendStatus === 'loading' || cooldownSeconds > 0) return;

    setResendStatus('loading');
    setResendMessage(null);

    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: registeredUser.email })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        if (res.status === 429 || data.code === 'RATE_LIMITED') {
          setCooldownSeconds(data.remainingSeconds || 60);
          throw new Error('Too many requests. Please wait before requesting another verification email.');
        }
        throw new Error(data.error || 'Unable to send the verification email right now. Please try again later.');
      }

      setResendStatus('sent');
      setResendMessage('Verification email sent. Please check your inbox.');
      setCooldownSeconds(60);
    } catch (err: unknown) {
      setResendStatus('error');
      setResendMessage(err instanceof Error ? err.message : 'Unable to send the verification email right now. Please try again later.');
    }
  };

  const handleSignInClick = () => {
    if (onNavigateToLogin) {
      onNavigateToLogin();
    } else {
      setActiveView('discover');
    }
  };

  return (
    <div className="w-full min-h-[calc(100vh-80px)] py-12 px-4 sm:px-6 lg:px-8 flex flex-col justify-center items-center bg-slate-950">
      
      {/* Brand Header */}
      <div className="text-center mb-8 max-w-md">
        <div className="inline-flex items-center gap-2 mb-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500 flex items-center justify-center text-slate-950 font-black text-base shadow-lg shadow-emerald-500/20">
            B⚡
          </div>
          <span className="text-2xl font-black tracking-tight text-white">BOOST MARKET</span>
        </div>
        <p className="text-sm font-medium text-slate-400">
          Business growth platform & marketplace
        </p>
      </div>

      {/* Registration Card */}
      <div className="w-full max-w-md bg-slate-900 border border-slate-800/90 rounded-2xl shadow-2xl p-6 sm:p-8 text-slate-200 backdrop-blur-sm">
        
        {registeredUser ? (
          /* SUCCESS STATE */
          <div id="registration-success-card" className="space-y-6 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold text-white tracking-tight">Registration successful!</h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                We've sent a verification link to <strong className="text-emerald-400 font-semibold">{registeredUser.email}</strong>.
              </p>
              <p className="text-xs text-slate-400">
                Please check your inbox to verify your email and activate your account.
              </p>
            </div>

            {/* Account Summary Badge */}
            <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl text-left space-y-2 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-slate-800/80">
                <span className="text-slate-400">Full Name:</span>
                <span className="font-semibold text-white">{registeredUser.name}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-800/80">
                <span className="text-slate-400">Account Role:</span>
                <span className="font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 text-[10px]">
                  {registeredUser.role}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Initial Status:</span>
                <span className="font-semibold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 text-[10px]">
                  {registeredUser.status}
                </span>
              </div>
            </div>

            {/* Resend Verification Section */}
            <div className="pt-2 border-t border-slate-800/80 space-y-3">
              <div className="text-xs text-slate-400">
                Didn't receive the email?
              </div>
              
              <button
                id="resend-verification-btn"
                type="button"
                onClick={handleResendVerification}
                disabled={resendStatus === 'loading' || cooldownSeconds > 0}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {resendStatus === 'loading' ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : cooldownSeconds > 0 ? (
                  <>
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-slate-400">Resend available in {cooldownSeconds}s</span>
                  </>
                ) : resendStatus === 'sent' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Verification email sent</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Resend verification email</span>
                  </>
                )}
              </button>

              {resendMessage && (
                <p className={`text-xs ${resendStatus === 'sent' ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {resendMessage}
                </p>
              )}
            </div>

            {/* Sign In CTA */}
            <div className="pt-4 border-t border-slate-800">
              <button
                id="go-to-signin-btn"
                type="button"
                onClick={handleSignInClick}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
              >
                <span>Proceed to Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

          </div>
        ) : (
          /* REGISTRATION FORM */
          <div>
            <div className="mb-6">
              <h1 className="text-xl font-bold text-white tracking-tight">Create your account</h1>
              <p className="text-xs text-slate-400 mt-1">
                Join Boost Market to explore, advertise, and grow your business
              </p>
            </div>

            {/* Global Error Banner */}
            {error && (
              <div 
                id="register-error-banner"
                role="alert"
                className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-start gap-2.5 animate-in fade-in"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-medium">{error}</div>
                  {(error.toLowerCase().includes('already exists') || error.toLowerCase().includes('already registered')) && (
                    <div className="mt-2 pt-2 border-t border-rose-500/20 flex items-center gap-2">
                      <span className="text-slate-300">Already have an account?</span>
                      <button
                        type="button"
                        id="error-signin-cta"
                        onClick={handleSignInClick}
                        className="font-bold text-emerald-400 hover:text-emerald-300 underline cursor-pointer"
                      >
                        Sign in now
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            <form id="client-registration-form" onSubmit={handleSubmit} noValidate className="space-y-4">
              
              {/* Full Name */}
              <div>
                <label 
                  htmlFor="register-fullname" 
                  className="block text-xs font-semibold text-slate-300 mb-1.5"
                >
                  Full Name <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                  <input
                    id="register-fullname"
                    name="name"
                    type="text"
                    autoComplete="name"
                    required
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (fieldErrors.name) setFieldErrors(prev => ({ ...prev, name: undefined }));
                    }}
                    placeholder="e.g. John Doe"
                    aria-invalid={!!fieldErrors.name}
                    aria-describedby={fieldErrors.name ? 'name-error' : undefined}
                    className={`w-full min-h-[44px] pl-10 pr-4 py-2.5 bg-slate-950/60 border ${
                      fieldErrors.name ? 'border-rose-500 focus:border-rose-500' : 'border-slate-800 focus:border-emerald-500'
                    } rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors`}
                  />
                </div>
                {fieldErrors.name && (
                  <p id="name-error" className="mt-1 text-xs text-rose-400">
                    {fieldErrors.name}
                  </p>
                )}
              </div>

              {/* Email Address */}
              <div>
                <label 
                  htmlFor="register-email" 
                  className="block text-xs font-semibold text-slate-300 mb-1.5"
                >
                  Email Address <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                  <input
                    id="register-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (fieldErrors.email) setFieldErrors(prev => ({ ...prev, email: undefined }));
                    }}
                    placeholder="john@example.com"
                    aria-invalid={!!fieldErrors.email}
                    aria-describedby={fieldErrors.email ? 'email-error' : undefined}
                    className={`w-full min-h-[44px] pl-10 pr-4 py-2.5 bg-slate-950/60 border ${
                      fieldErrors.email ? 'border-rose-500 focus:border-rose-500' : 'border-slate-800 focus:border-emerald-500'
                    } rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors`}
                  />
                </div>
                {fieldErrors.email && (
                  <p id="email-error" className="mt-1 text-xs text-rose-400">
                    {fieldErrors.email}
                  </p>
                )}
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label 
                    htmlFor="register-password" 
                    className="text-xs font-semibold text-slate-300"
                  >
                    Password <span className="text-rose-400">*</span>
                  </label>
                  {password && (
                    <span className="text-[11px] text-slate-400">
                      Strength: <strong className="text-slate-200">{passStrength.label}</strong>
                    </span>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                  <input
                    id="register-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (fieldErrors.password) setFieldErrors(prev => ({ ...prev, password: undefined }));
                    }}
                    placeholder="At least 8 characters"
                    aria-invalid={!!fieldErrors.password}
                    aria-describedby={fieldErrors.password ? 'password-error' : undefined}
                    className={`w-full min-h-[44px] pl-10 pr-11 py-2.5 bg-slate-950/60 border ${
                      fieldErrors.password ? 'border-rose-500 focus:border-rose-500' : 'border-slate-800 focus:border-emerald-500'
                    } rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors`}
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-1"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Password Strength Meter Bar */}
                {password && (
                  <div className="mt-2 space-y-1">
                    <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden flex">
                      <div 
                        className={`h-full transition-all duration-300 ${passStrength.color}`} 
                        style={{ width: `${(passStrength.score / 5) * 100}%` }} 
                      />
                    </div>
                  </div>
                )}

                {fieldErrors.password && (
                  <p id="password-error" className="mt-1 text-xs text-rose-400">
                    {fieldErrors.password}
                  </p>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label 
                  htmlFor="register-confirm-password" 
                  className="block text-xs font-semibold text-slate-300 mb-1.5"
                >
                  Confirm Password <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                  <input
                    id="register-confirm-password"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (fieldErrors.confirmPassword) setFieldErrors(prev => ({ ...prev, confirmPassword: undefined }));
                    }}
                    placeholder="Repeat your password"
                    aria-invalid={!!fieldErrors.confirmPassword}
                    aria-describedby={fieldErrors.confirmPassword ? 'confirm-password-error' : undefined}
                    className={`w-full min-h-[44px] pl-10 pr-11 py-2.5 bg-slate-950/60 border ${
                      fieldErrors.confirmPassword ? 'border-rose-500 focus:border-rose-500' : 'border-slate-800 focus:border-emerald-500'
                    } rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors`}
                  />
                  <button
                    type="button"
                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-1"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {fieldErrors.confirmPassword && (
                  <p id="confirm-password-error" className="mt-1 text-xs text-rose-400">
                    {fieldErrors.confirmPassword}
                  </p>
                )}
              </div>

              {/* Terms of Service Checkbox */}
              <div className="pt-1">
                <div className="flex items-start gap-2.5">
                  <input
                    id="terms-checkbox"
                    name="termsAccepted"
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => {
                      setTermsAccepted(e.target.checked);
                      if (fieldErrors.terms) setFieldErrors(prev => ({ ...prev, terms: undefined }));
                    }}
                    className="mt-0.5 h-4 w-4 rounded bg-slate-950 border-slate-800 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-slate-900 cursor-pointer"
                  />
                  <label htmlFor="terms-checkbox" className="text-xs text-slate-400 leading-snug cursor-pointer select-none">
                    I agree to the <span className="text-emerald-400 hover:underline">Terms of Service</span> and <span className="text-emerald-400 hover:underline">Privacy Policy</span>.
                  </label>
                </div>
                {fieldErrors.terms && (
                  <p id="terms-error" className="mt-1.5 text-xs text-rose-400">
                    {fieldErrors.terms}
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <button
                id="create-account-submit-btn"
                type="submit"
                disabled={isSubmitting}
                className="w-full min-h-[44px] py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer mt-2"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Creating account...</span>
                  </>
                ) : (
                  <span>Create Account</span>
                )}
              </button>

            </form>

            {/* Login Navigation Link */}
            <div className="mt-6 pt-5 border-t border-slate-800/80 text-center text-xs text-slate-400">
              Already have an account?{' '}
              <button
                id="signin-switch-btn"
                type="button"
                onClick={handleSignInClick}
                className="font-bold text-emerald-400 hover:text-emerald-300 hover:underline transition-colors ml-1"
              >
                Sign in
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Security Assurance Footer */}
      <div className="mt-8 text-center text-xs text-slate-500 flex items-center gap-2 justify-center">
        <ShieldCheck className="w-4 h-4 text-emerald-400/80" />
        <span>End-to-End Encrypted Registration & Anti-Fraud Protection</span>
      </div>

    </div>
  );
};
