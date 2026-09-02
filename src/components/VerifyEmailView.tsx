import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  RefreshCw, 
  Mail,
  Send,
  Check
} from 'lucide-react';
import { useApp } from '../context/AppContext';

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

        const response = await fetch(`/api/auth/verify-email?token=${encodeURIComponent(token.trim())}`, {
          method: 'GET',
          headers: { 'Accept': 'application/json' }
        });

        const data = await response.json();

        if (!isMounted) return;

        if (response.ok && data.success) {
          if (data.user?.email) {
            setUserEmail(data.user.email);
            setResendEmail(data.user.email);
          }
          if (data.alreadyVerified) {
            setStatus('already_verified');
          } else {
            setStatus('success');
          }

          if (typeof window !== 'undefined' && window.history && window.history.replaceState) {
            window.history.replaceState({}, document.title, '/verify-email');
          }
        } else {
          setStatus('error');
          const rawMsg = data.error || 'Could not verify your email.';
          if (rawMsg.toLowerCase().includes('expired')) {
            setErrorMessage('This link has expired. Please request a new one.');
          } else if (rawMsg.toLowerCase().includes('already')) {
            setStatus('already_verified');
          } else {
            setErrorMessage(rawMsg);
          }
        }
      } catch {
        if (isMounted) {
          setStatus('error');
          setErrorMessage('Could not connect to the verification server.');
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
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resendEmail.trim() })
      });

      const data = await response.json();

      if (response.status === 429 || data.code === 'RATE_LIMITED') {
        setCooldownSeconds(data.remainingSeconds || 60);
        setResendStatus('error');
        setResendFeedback('Too many requests. Please wait a moment.');
        return;
      }

      if (!response.ok || !data.success) {
        setResendStatus('error');
        setResendFeedback(data.error || 'Failed to send verification email.');
        return;
      }

      setResendStatus('sent');
      setResendFeedback('Verification email sent! Check your inbox.');
      setCooldownSeconds(60);
    } catch {
      setResendStatus('error');
      setResendFeedback('Failed to send verification email.');
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
    <div className="w-full min-h-[calc(100vh-140px)] py-12 px-4 sm:px-6 lg:px-8 flex flex-col justify-center items-center bg-[#F9FAFB] text-[#111827]">
      
      {/* Brand Header */}
      <div className="text-center mb-6">
        <button 
          onClick={() => setActiveView('discover')}
          className="inline-flex items-center gap-2 cursor-pointer focus:outline-none"
        >
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
            B
          </div>
          <span className="text-xl font-bold text-gray-900 tracking-tight">
            Boost Market
          </span>
        </button>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-md bg-white border border-gray-200 rounded-xl shadow-sm p-6 sm:p-8 text-gray-900">
        
        {/* 1. LOADING */}
        {status === 'loading' && (
          <div className="text-center py-6">
            <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
            <h2 className="text-lg font-bold text-gray-900 mb-1">
              Verifying email...
            </h2>
            <p className="text-xs text-gray-500">
              Validating your token and activating your account.
            </p>
          </div>
        )}

        {/* 2. SUCCESS */}
        {status === 'success' && (
          <div className="text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-green-50 text-green-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Email verified!
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                Your account is now active and ready to use.
              </p>
            </div>

            {userEmail && (
              <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-100 text-xs text-gray-600">
                {userEmail}
              </div>
            )}

            <button
              onClick={handleOpenSignIn}
              className="w-full py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-colors cursor-pointer"
            >
              Sign In
            </button>
          </div>
        )}

        {/* 3. ALREADY VERIFIED */}
        {status === 'already_verified' && (
          <div className="text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Already verified
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                This account has already been verified.
              </p>
            </div>

            <button
              onClick={handleOpenSignIn}
              className="w-full py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-colors cursor-pointer"
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
              <h2 className="text-xl font-bold text-gray-900">
                Verification failed
              </h2>
              <p className="text-xs text-red-600 mt-1">
                {errorMessage}
              </p>
            </div>

            {/* Resend Form */}
            <div className="pt-2 text-left space-y-2">
              <label className="block text-xs font-medium text-gray-700">
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
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                />

                <button
                  type="submit"
                  disabled={isResending || !resendEmail.trim() || cooldownSeconds > 0}
                  className="w-full py-2 px-3 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
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
                  <p className={`text-xs ${resendStatus === 'sent' ? 'text-green-600' : 'text-red-600'}`}>
                    {resendFeedback}
                  </p>
                )}
              </form>
            </div>

            <div className="pt-2 border-t border-gray-100">
              <button
                onClick={handleOpenSignIn}
                className="w-full py-2 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs transition-colors cursor-pointer"
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
