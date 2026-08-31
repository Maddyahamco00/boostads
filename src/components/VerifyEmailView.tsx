import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  ShieldCheck, 
  ShieldAlert, 
  Sparkles, 
  ArrowRight, 
  RefreshCw, 
  LogIn, 
  Compass, 
  Lock,
  MailCheck,
  Mail,
  Send,
  Check
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AuthModal } from './AuthModal';

export const VerifyEmailView: React.FC = () => {
  const { setActiveView } = useApp();
  const [status, setStatus] = useState<'loading' | 'success' | 'already_verified' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [errorCode, setErrorCode] = useState<string>('');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [userEmail, setUserEmail] = useState<string>('');

  // Resend Form State
  const [resendEmail, setResendEmail] = useState<string>('');
  const [isResending, setIsResending] = useState<boolean>(false);
  const [resendStatus, setResendStatus] = useState<'idle' | 'sent' | 'error'>('idle');
  const [resendFeedback, setResendFeedback] = useState<string | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState<number>(0);

  // Cooldown countdown timer
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
      // Extract token from URL query parameters
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token') || urlParams.get('verifyToken');

      if (!token || !token.trim()) {
        if (isMounted) {
          setStatus('error');
          setErrorMessage('This verification link is invalid.');
          setErrorCode('MISSING_TOKEN');
        }
        return;
      }

      try {
        if (isMounted) setStatus('loading');

        const response = await fetch(`/api/auth/verify-email?token=${encodeURIComponent(token.trim())}`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json'
          }
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

          // Redact / clean token from URL without triggering a reload
          if (typeof window !== 'undefined' && window.history && window.history.replaceState) {
            window.history.replaceState({}, document.title, '/verify-email');
          }
        } else {
          setStatus('error');
          const rawMsg = data.error || 'We couldn\'t verify your email right now. Please try again.';
          setErrorCode(data.code || 'VERIFICATION_FAILED');

          if (rawMsg.toLowerCase().includes('expired')) {
            setErrorMessage('This verification link has expired. Please request a new verification email.');
          } else if (rawMsg.toLowerCase().includes('already been used') || rawMsg.toLowerCase().includes('already used')) {
            setErrorMessage('This verification link has already been used.');
          } else if (rawMsg.toLowerCase().includes('already verified')) {
            setStatus('already_verified');
          } else if (rawMsg.toLowerCase().includes('suspended') || rawMsg.toLowerCase().includes('restricted')) {
            setErrorMessage('Account is suspended or restricted. Email verification cannot bypass administrative restrictions.');
          } else if (rawMsg.toLowerCase().includes('invalid')) {
            setErrorMessage('This verification link is invalid.');
          } else {
            setErrorMessage('We couldn\'t verify your email right now. Please try again.');
          }
        }
      } catch (err: unknown) {
        if (isMounted) {
          setStatus('error');
          setErrorCode('NETWORK_ERROR');
          setErrorMessage('We couldn\'t verify your email right now. Please try again.');
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
        setResendFeedback('Too many requests. Please wait before requesting another verification email.');
        return;
      }

      if (!response.ok || !data.success) {
        setResendStatus('error');
        setResendFeedback(data.error || 'Unable to send the verification email right now. Please try again later.');
        return;
      }

      setResendStatus('sent');
      setResendFeedback(data.message || 'Verification email sent. Please check your inbox.');
      setCooldownSeconds(60);
    } catch {
      setResendStatus('error');
      setResendFeedback('Unable to send the verification email right now. Please try again later.');
    } finally {
      setIsResending(false);
    }
  };

  const handleOpenSignIn = () => {
    if (userEmail) {
      if (typeof window !== 'undefined') {
        window.history.replaceState({}, '', `/login?verified=true&email=${encodeURIComponent(userEmail)}`);
      }
    }
    setActiveView('login');
  };

  const handleExplore = () => {
    setActiveView('discover');
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
      <div className="w-full max-w-lg">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-slate-950 font-black text-2xl shadow-xl shadow-emerald-500/20 mb-4 ring-4 ring-emerald-500/10">
            B⚡
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            BOOST MARKET
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Real Boosters Business Advertising & Marketplace Platform
          </p>
        </div>

        {/* Verification Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl backdrop-blur-xl relative overflow-hidden">
          {/* Subtle Background Glow */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* 1. LOADING STATE */}
          {status === 'loading' && (
            <div id="verify-email-loading" className="text-center py-6">
              <div className="relative w-16 h-16 mx-auto mb-6 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-4 border-slate-800 border-t-emerald-400 animate-spin" />
                <MailCheck className="w-7 h-7 text-emerald-400 animate-pulse" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">
                Verifying your email...
              </h2>
              <p className="text-sm text-slate-400 max-w-sm mx-auto leading-relaxed">
                Please wait a moment while we validate your verification token and activate your client account.
              </p>
            </div>
          )}

          {/* 2. SUCCESS STATE */}
          {status === 'success' && (
            <div id="verify-email-success" className="text-center py-4">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-6 text-emerald-400 ring-8 ring-emerald-500/5">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-3">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Account Activated</span>
              </div>

              <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">
                Email verified successfully!
              </h2>

              <p className="text-sm text-slate-300 mb-6 leading-relaxed">
                Your Boost Market account is now active. You can sign in to explore businesses, run campaigns, and connect with clients across Nigeria.
              </p>

              {userEmail && (
                <div className="mb-6 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs text-slate-400 flex items-center justify-center gap-2">
                  <span className="text-slate-500">Verified Email:</span>
                  <span className="font-semibold text-white">{userEmail}</span>
                </div>
              )}

              <div className="space-y-3 pt-2">
                <button
                  id="btn-continue-signin"
                  onClick={handleOpenSignIn}
                  className="w-full py-3 px-6 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition-all duration-200 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 flex items-center justify-center gap-2"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Continue to Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  id="btn-explore-marketplace"
                  onClick={handleExplore}
                  className="w-full py-3 px-6 rounded-xl bg-slate-800 hover:bg-slate-700/80 text-slate-300 hover:text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
                >
                  <Compass className="w-4 h-4" />
                  <span>Explore Marketplace</span>
                </button>
              </div>
            </div>
          )}

          {/* 3. ALREADY VERIFIED STATE */}
          {status === 'already_verified' && (
            <div id="verify-email-already-verified" className="text-center py-4">
              <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center mx-auto mb-6 text-indigo-400 ring-8 ring-indigo-500/5">
                <ShieldCheck className="w-9 h-9" />
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-3">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Already Verified</span>
              </div>

              <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">
                Your email has already been verified.
              </h2>

              <p className="text-sm text-slate-300 mb-6 leading-relaxed">
                This account is active and in good standing. You can proceed directly to sign in.
              </p>

              <div className="space-y-3 pt-2">
                <button
                  id="btn-already-verified-signin"
                  onClick={handleOpenSignIn}
                  className="w-full py-3 px-6 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition-all duration-200 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 flex items-center justify-center gap-2"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Continue to Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  onClick={handleExplore}
                  className="w-full py-3 px-6 rounded-xl bg-slate-800 hover:bg-slate-700/80 text-slate-300 hover:text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
                >
                  <Compass className="w-4 h-4" />
                  <span>Explore Marketplace</span>
                </button>
              </div>
            </div>
          )}

          {/* 4. ERROR STATE */}
          {status === 'error' && (
            <div id="verify-email-error" className="text-center py-4">
              <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto mb-6 text-rose-400 ring-8 ring-rose-500/5">
                <AlertCircle className="w-9 h-9" />
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold mb-3">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Verification Issue</span>
              </div>

              <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">
                Verification Failed
              </h2>

              <p className="text-sm text-slate-300 mb-6 leading-relaxed">
                {errorMessage || 'This verification link is invalid.'}
              </p>

              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs text-slate-400 mb-6 text-left space-y-1.5">
                <div className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-slate-500" />
                  <span>Security Guidance</span>
                </div>
                <p>
                  • Verification links expire after 24 hours for account security.
                </p>
                <p>
                  • Each verification link can only be used once.
                </p>
              </div>

              {/* Resend Verification Form */}
              <div id="resend-verification-section" className="mb-6 p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-left">
                <div className="flex items-center gap-2 mb-2 text-slate-200 font-semibold text-xs">
                  <Mail className="w-4 h-4 text-emerald-400" />
                  <span>Request a New Verification Link</span>
                </div>
                <p className="text-[11px] text-slate-400 mb-3">
                  Enter your email address to receive a fresh verification link.
                </p>

                <form onSubmit={handleResend} className="space-y-3">
                  <div className="relative">
                    <input
                      id="resend-email-input"
                      type="email"
                      required
                      placeholder="name@example.com"
                      value={resendEmail}
                      onChange={(e) => setResendEmail(e.target.value)}
                      disabled={isResending || cooldownSeconds > 0}
                      className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 disabled:opacity-60"
                    />
                    <Mail className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  </div>

                  <button
                    id="btn-resend-verification"
                    type="submit"
                    disabled={isResending || !resendEmail.trim() || cooldownSeconds > 0}
                    className="w-full py-2.5 px-4 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isResending ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Sending...</span>
                      </>
                    ) : cooldownSeconds > 0 ? (
                      <>
                        <Clock className="w-3.5 h-3.5 text-slate-950/70" />
                        <span>Resend available in {cooldownSeconds}s</span>
                      </>
                    ) : resendStatus === 'sent' ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Verification Email Sent</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Resend verification email</span>
                      </>
                    )}
                  </button>

                  {resendFeedback && (
                    <div 
                      id="resend-feedback-msg"
                      className={`text-[11px] p-2 rounded-lg border ${
                        resendStatus === 'sent' 
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                          : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                      }`}
                    >
                      {resendFeedback}
                    </div>
                  )}
                </form>
              </div>

              <div className="space-y-3 pt-2">
                <button
                  id="btn-error-signin"
                  onClick={handleOpenSignIn}
                  className="w-full py-3 px-6 rounded-xl bg-slate-800 hover:bg-slate-700/80 text-slate-200 hover:text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Go to Sign In</span>
                </button>

                <button
                  id="btn-error-explore"
                  onClick={handleExplore}
                  className="w-full py-3 px-6 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-300 font-medium text-sm transition-colors flex items-center justify-center gap-2"
                >
                  <Compass className="w-4 h-4" />
                  <span>Explore Marketplace</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Security Footer Note */}
        <div className="mt-8 text-center text-xs text-slate-500 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-500/60" />
          <span>256-bit Cryptographic Email Verification Protocol</span>
        </div>
      </div>

      {/* Auth Modal for Sign In */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialTab="login"
      />
    </div>
  );
};
