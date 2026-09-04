import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw 
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { authApi, formatAuthError, ApiError } from '../lib/api';
import { Logo } from './Logo';

export const VerifyEmailView: React.FC = () => {
  const { setActiveView } = useApp();
  const [status, setStatus] = useState<'loading' | 'success' | 'already_verified' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [userEmail, setUserEmail] = useState<string>('');

  // Resend Form State
  const [resendEmail, setResendEmail] = useState<string>('');
  const [isResending, setIsResending] = useState<boolean>(false);
  const [resendStatus, setResendStatus] = useState<'idle' | 'sent' | 'error'>('idle');
  const [resendFeedback, setResendFeedback] = useState<string | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState<number>(0);

  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const interval = setInterval(() => {
      setCooldownSeconds(prev => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldownSeconds]);

  useEffect(() => {
    let isMounted = true;

    async function executeVerification() {
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token') || urlParams.get('verifyToken');

      if (!token || !token.trim()) {
        if (isMounted) {
          setStatus('error');
          setErrorMessage('This verification link is invalid.');
        }
        return;
      }

      try {
        if (isMounted) setStatus('loading');

        const data = await authApi.verifyEmail(token.trim());

        if (!isMounted) return;

        if (data.success) {
          if (data.user?.email) {
            setUserEmail(data.user.email);
            setResendEmail(data.user.email);
          }
          if ((data as any).alreadyVerified) {
            setStatus('already_verified');
          } else {
            setStatus('success');
          }

          if (typeof window !== 'undefined' && window.history && window.history.replaceState) {
            window.history.replaceState({}, document.title, '/verify-email');
          }
        }
      } catch (err: unknown) {
        if (!isMounted) return;
        setStatus('error');
        const formatted = formatAuthError(err);
        const rawMsg = err instanceof Error ? err.message : formatted.message;
        if (rawMsg.toLowerCase().includes('expired')) {
          setErrorMessage('This link has expired. Please request a new one.');
        } else if (rawMsg.toLowerCase().includes('already')) {
          setStatus('already_verified');
        } else {
          setErrorMessage(formatted.message || 'Could not verify your email.');
        }
      }
    }

    executeVerification();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resendEmail.trim() || isResending || cooldownSeconds > 0) return;

    setIsResending(true);
    setResendFeedback(null);
    setResendStatus('idle');

    try {
      const res = await authApi.resendVerification(resendEmail.trim());

      setResendStatus('sent');
      setResendFeedback(res.message || 'Verification email sent! Check your inbox.');
      setCooldownSeconds(60);
    } catch (err: unknown) {
      setResendStatus('error');
      if (err instanceof ApiError && err.status === 429) {
        setCooldownSeconds((err.details as any)?.remainingSeconds || 60);
        setResendFeedback('Too many requests. Please wait a moment.');
        return;
      }
      const formatted = formatAuthError(err);
      setResendFeedback(formatted.message);
    } finally {
      setIsResending(false);
    }
  };

  const handleOpenSignIn = () => {
    if (userEmail && typeof window !== 'undefined') {
      window.history.replaceState({}, '', `/login?verified=true&email=${encodeURIComponent(userEmail)}`);
    }
    setActiveView('login');
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
        
        {/* 1. LOADING */}
        {status === 'loading' && (
          <div className="text-center py-6">
            <RefreshCw className="w-8 h-8 text-[#16C784] animate-spin mx-auto mb-4" />
            <h2 className="text-lg font-bold text-slate-900 mb-1">
              Verifying email...
            </h2>
            <p className="text-xs text-slate-500">
              Validating your token and activating your account.
            </p>
          </div>
        )}

        {/* 2. SUCCESS */}
        {status === 'success' && (
          <div className="text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-[#16C784]/15 text-[#16C784] flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Email verified!
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Your account is now active and ready to use.
              </p>
            </div>

            {userEmail && (
              <div className="p-2.5 rounded-lg bg-slate-50 border border-[#E2E8F0] text-xs text-slate-600 font-mono">
                {userEmail}
              </div>
            )}

            <button
              onClick={handleOpenSignIn}
              className="w-full py-2.5 px-4 rounded-lg bg-[#16C784] hover:bg-[#14B8A6] text-white font-semibold text-sm transition-colors cursor-pointer shadow-xs"
            >
              Sign In
            </button>
          </div>
        )}

        {/* 3. ALREADY VERIFIED */}
        {status === 'already_verified' && (
          <div className="text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-[#16C784]/15 text-[#16C784] flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Already verified
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                This account has already been verified.
              </p>
            </div>

            <button
              onClick={handleOpenSignIn}
              className="w-full py-2.5 px-4 rounded-lg bg-[#16C784] hover:bg-[#14B8A6] text-white font-semibold text-sm transition-colors cursor-pointer shadow-xs"
            >
              Sign In
            </button>
          </div>
        )}

        {/* 4. ERROR */}
        {status === 'error' && (
          <div className="text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>

            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Verification failed
              </h2>
              <p className="text-xs text-red-600 mt-1">
                {errorMessage}
              </p>
            </div>

            {/* Resend Form */}
            <div className="pt-2 text-left space-y-2">
              <label className="block text-xs font-semibold text-slate-700">
                Request a new link
              </label>
              <form onSubmit={handleResend} className="space-y-2">
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  disabled={isResending || cooldownSeconds > 0}
                  className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#16C784] focus:ring-1 focus:ring-[#16C784]"
                />

                <button
                  type="submit"
                  disabled={isResending || !resendEmail.trim() || cooldownSeconds > 0}
                  className="w-full py-2 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isResending ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : cooldownSeconds > 0 ? (
                    <span>Wait {cooldownSeconds}s</span>
                  ) : resendStatus === 'sent' ? (
                    <span>Sent</span>
                  ) : (
                    <span>Send link</span>
                  )}
                </button>

                {resendFeedback && (
                  <p className={`text-xs ${resendStatus === 'sent' ? 'text-[#16C784]' : 'text-red-600'}`}>
                    {resendFeedback}
                  </p>
                )}
              </form>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <button
                onClick={handleOpenSignIn}
                className="w-full py-2 px-4 rounded-lg bg-[#16C784] hover:bg-[#14B8A6] text-white font-semibold text-xs transition-colors cursor-pointer shadow-xs"
              >
                Go to Sign In
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
