import React, { useState, useEffect } from 'react';
import { 
  Mail, 
  ArrowLeft, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Clock, 
  Send 
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { authApi, formatAuthError } from '../lib/api';
import { Logo } from './Logo';

export const ForgotPasswordView: React.FC = () => {
  const { setActiveView } = useApp();

  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState<number>(0);

  // Sync with URL or prefilled email if provided
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const emailParam = params.get('email');
      if (emailParam) {
        setEmail(emailParam);
      }

      if (window.location.pathname !== '/forgot-password') {
        window.history.replaceState({}, '', '/forgot-password' + (window.location.search || ''));
      }
    }
  }, []);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const interval = setInterval(() => {
      setCooldownSeconds(prev => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldownSeconds]);

  const validate = (): boolean => {
    const trimmed = email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!trimmed) {
      setFieldError('Email address is required');
      return false;
    }
    if (!emailRegex.test(trimmed)) {
      setFieldError('Please enter a valid email address');
      return false;
    }

    setFieldError(null);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldError(null);

    if (!validate()) return;
    if (cooldownSeconds > 0) return;

    setIsSubmitting(true);
    const targetEmail = email.trim();

    try {
      const response = await authApi.forgotPassword(targetEmail);
      if (response && response.success) {
        setSubmitted(true);
        setSubmittedEmail(targetEmail);
        setCooldownSeconds(60);
      } else {
        // Fallback for unexpected response structure
        setSubmitted(true);
        setSubmittedEmail(targetEmail);
      }
    } catch (err: unknown) {
      const formatted = formatAuthError(err);
      if (formatted.isRateLimited) {
        const remaining = formatted.retryAfterSeconds || 60;
        setCooldownSeconds(remaining);
        setError(`Too many requests. Please wait ${remaining} seconds before trying again.`);
      } else {
        setError(formatted.message || 'Unable to process your request. Please try again.');
      }
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
        
        {/* Header Titles */}
        <div className="mb-6 text-center">
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Forgot your password?</h1>
          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
            Enter your email and we'll send you instructions to reset your password.
          </p>
        </div>

        {/* Global Error Notice */}
        {error && (
          <div className="mb-5 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1">{error}</div>
          </div>
        )}

        {!submitted ? (
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            
            {/* Email Field */}
            <div>
              <label htmlFor="forgot-email" className="block text-xs font-semibold text-slate-700 mb-1">
                Email
              </label>
              <div className="relative">
                <input
                  id="forgot-email"
                  type="email"
                  required
                  autoFocus
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (fieldError) setFieldError(null);
                  }}
                  placeholder="name@example.com"
                  className={`w-full px-3.5 py-2.5 bg-white border ${
                    fieldError ? 'border-red-500' : 'border-[#E2E8F0]'
                  } rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#16C784] focus:ring-1 focus:ring-[#16C784] transition-colors`}
                />
              </div>
              {fieldError && (
                <p className="mt-1 text-xs text-red-600">{fieldError}</p>
              )}
            </div>

            {/* Submit Button */}
            <button
              id="forgot-submit-btn"
              type="submit"
              disabled={isSubmitting || cooldownSeconds > 0}
              className="w-full py-2.5 px-4 rounded-lg bg-[#16C784] hover:bg-[#14B8A6] text-white font-semibold text-sm transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Sending instructions...
                </span>
              ) : cooldownSeconds > 0 ? (
                <span className="flex items-center justify-center gap-2">
                  <Clock className="w-4 h-4" />
                  Wait {cooldownSeconds}s
                </span>
              ) : (
                'Send Reset Link'
              )}
            </button>

            {/* Link back to Login */}
            <div className="pt-2 text-center">
              <button
                id="back-to-login-btn"
                type="button"
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    window.history.replaceState({}, '', '/login');
                  }
                  setActiveView('login');
                }}
                className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:underline transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Login</span>
              </button>
            </div>
          </form>
        ) : (
          /* Submission Success State */
          <div className="space-y-5 text-center">
            
            <div className="p-4 rounded-xl bg-[#16C784]/10 border border-[#16C784]/25 text-left flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-[#16C784] shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs text-slate-700">
                <div className="font-semibold text-slate-900">Check your inbox</div>
                <p className="text-slate-600 leading-relaxed">
                  If an account exists for this email, you'll receive a reset link shortly.
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Didn't receive an email? Check your spam or junk folder, or wait a minute before requesting another link.
            </p>

            <div className="space-y-2.5 pt-2">
              <button
                id="forgot-success-back-btn"
                type="button"
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    window.history.replaceState({}, '', '/login');
                  }
                  setActiveView('login');
                }}
                className="w-full py-2.5 px-4 rounded-lg bg-[#16C784] hover:bg-[#14B8A6] text-white font-semibold text-sm transition-colors cursor-pointer shadow-xs"
              >
                Back to Login
              </button>

              <button
                id="forgot-resend-btn"
                type="button"
                disabled={cooldownSeconds > 0 || isSubmitting}
                onClick={() => {
                  setSubmitted(false);
                }}
                className="w-full py-2 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
              >
                {cooldownSeconds > 0 ? `Resend available in ${cooldownSeconds}s` : 'Try another email address'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
