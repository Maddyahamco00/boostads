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
  MailCheck
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

  const handleOpenSignIn = () => {
    setIsAuthModalOpen(true);
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

              <div className="space-y-3 pt-2">
                <button
                  onClick={handleOpenSignIn}
                  className="w-full py-3 px-6 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition-all duration-200 shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Go to Sign In</span>
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
