import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { authApi, formatAuthError } from '../lib/api';
import { ShieldCheck, Lock, Mail, KeyRound, AlertCircle, CheckCircle2, ArrowRight, Sparkles, RefreshCw } from 'lucide-react';
import { Logo } from './Logo';

export const AdminLoginView: React.FC = () => {
  const { setActiveView, setCurrentUser } = useApp();

  const [email, setEmail] = useState('maddyahamco00@gmail.com');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [requires2FA, setRequires2FA] = useState(false);
  const [preAuthToken, setPreAuthToken] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // First-time setup / reset link modal state
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);
  const [setupLoading, setSetupLoading] = useState(false);
  const [setupSuccessMessage, setSetupSuccessMessage] = useState<string | null>(null);
  const [setupTokenInput, setSetupTokenInput] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [confirmAdminPassword, setConfirmAdminPassword] = useState('');
  const [setupError, setSetupError] = useState<string | null>(null);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      if (requires2FA) {
        if (!totpCode.trim()) {
          setErrorMessage('Please enter the 6-digit TOTP verification code.');
          setIsLoading(false);
          return;
        }

        const res = await authApi.verifyTwoFactor(preAuthToken, totpCode.trim());
        if (res.success && res.user) {
          setCurrentUser(res.user);
          setSuccessMessage('Super Admin authentication verified.');
          setTimeout(() => {
            setActiveView('admin_panel');
          }, 600);
        }
      } else {
        const res = await authApi.adminLogin({
          email: email.trim(),
          password,
          totpCode: totpCode ? totpCode.trim() : undefined
        });

        if (res.requires2FA && res.preAuthToken) {
          setRequires2FA(true);
          setPreAuthToken(res.preAuthToken);
          setSuccessMessage('Credentials verified. Please provide your 2FA security code.');
        } else if (res.success && res.user) {
          setCurrentUser(res.user);
          setSuccessMessage('Welcome back, Super Admin.');
          setTimeout(() => {
            setActiveView('admin_panel');
          }, 600);
        }
      }
    } catch (err: unknown) {
      const formatted = formatAuthError(err);
      setErrorMessage(formatted.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendSetupLink = async () => {
    setSetupLoading(true);
    setSetupError(null);
    setSetupSuccessMessage(null);

    try {
      const res = await authApi.initAdminSetup();
      if (res.success) {
        setSetupSuccessMessage(
          res.setupToken
            ? `Setup token dispatched to ${res.adminEmail || 'maddyahamco00@gmail.com'}. For local preview testing, token is auto-filled below.`
            : res.message
        );
        if (res.setupToken) {
          setSetupTokenInput(res.setupToken);
        }
      }
    } catch (err: unknown) {
      const formatted = formatAuthError(err);
      setSetupError(formatted.message);
    } finally {
      setSetupLoading(false);
    }
  };

  const handleCompletePasswordSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSetupError(null);

    if (!setupTokenInput.trim()) {
      setSetupError('Setup token is required.');
      return;
    }
    if (newAdminPassword.length < 12) {
      setSetupError('Super Admin password must be at least 12 characters.');
      return;
    }
    if (newAdminPassword !== confirmAdminPassword) {
      setSetupError('Passwords do not match.');
      return;
    }

    setSetupLoading(true);
    try {
      const res = await authApi.setupAdminPassword({
        token: setupTokenInput.trim(),
        newPassword: newAdminPassword
      });

      if (res.success) {
        setSuccessMessage('Super Admin password configured successfully. You may now log in.');
        setIsSetupModalOpen(false);
        setPassword(newAdminPassword);
      }
    } catch (err: unknown) {
      const formatted = formatAuthError(err);
      setSetupError(formatted.message);
    } finally {
      setSetupLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-[#F8FAFC]">
      <div className="w-full max-w-md space-y-6">
        {/* Brand & Badge Header */}
        <div className="text-center space-y-3">
          <Logo 
            variant="badge" 
            size="sm" 
            showTagline={false} 
            onClick={() => setActiveView('discover')} 
          />
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#071A17] text-[#16C784] border border-[#16C784]/30 text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Super Admin Portal</span>
          </div>
          <p className="text-xs text-slate-500">
            Restricted access for platform governance & system administration
          </p>
        </div>

        {/* Feedback Messages */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <div className="leading-relaxed">{errorMessage}</div>
          </div>
        )}

        {successMessage && (
          <div className="p-3.5 rounded-xl bg-[#16C784]/10 border border-[#16C784]/30 text-[#16C784] text-xs flex items-start gap-2.5 font-medium">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="leading-relaxed">{successMessage}</div>
          </div>
        )}

        {/* Form Card */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-sm p-6 sm:p-8 space-y-5">
          <form onSubmit={handleAdminLogin} className="space-y-4">
            {/* Super Admin Email */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Admin Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={requires2FA || isLoading}
                  placeholder="maddyahamco00@gmail.com"
                  className="w-full pl-9 pr-3.5 py-2.5 text-sm border border-[#E2E8F0] rounded-lg focus:ring-1 focus:ring-[#16C784] focus:border-[#16C784] outline-none disabled:bg-slate-50 disabled:text-slate-500 transition-colors"
                />
              </div>
            </div>

            {/* Password */}
            {!requires2FA && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Master Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsSetupModalOpen(true)}
                    className="text-xs text-[#16C784] hover:underline font-semibold cursor-pointer"
                  >
                    Setup / Reset Password
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    placeholder="••••••••••••"
                    className="w-full pl-9 pr-3.5 py-2.5 text-sm border border-[#E2E8F0] rounded-lg focus:ring-1 focus:ring-[#16C784] focus:border-[#16C784] outline-none transition-colors"
                  />
                </div>
              </div>
            )}

            {/* 2FA Code if required */}
            {requires2FA && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Two-Factor Authentication Code
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    autoFocus
                    maxLength={8}
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value.replace(/\s+/g, ''))}
                    disabled={isLoading}
                    placeholder="6-digit TOTP code"
                    className="w-full pl-9 pr-3.5 py-2.5 text-sm font-mono tracking-widest border border-[#E2E8F0] rounded-lg focus:ring-1 focus:ring-[#16C784] focus:border-[#16C784] outline-none"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Enter the code from your authenticator app (Google Authenticator, Authy).
                </p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 rounded-lg bg-[#071A17] hover:bg-[#071A17]/90 text-[#16C784] border border-[#16C784]/40 text-sm font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-[#16C784]" />
                  <span>Verifying...</span>
                </>
              ) : requires2FA ? (
                <>
                  <span>Verify Two-Factor Code</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  <span>Authenticate Super Admin</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Boundaries Notice */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <button
              onClick={() => setActiveView('login')}
              className="text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
            >
              ← Client Login
            </button>
            <span className="text-[11px] text-slate-400">Strict Identity Boundary</span>
          </div>
        </div>

        {/* Setup Password Modal */}
        {isSetupModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 border border-[#E2E8F0]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-[#16C784]" />
                  <h3 className="text-base font-bold text-slate-900">Admin Setup / Password Reset</h3>
                </div>
                <button
                  onClick={() => setIsSetupModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 text-sm font-medium cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Dispatch a cryptographically signed setup link to the designated Super Admin email (<strong>maddyahamco00@gmail.com</strong>).
              </p>

              {setupError && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <div>{setupError}</div>
                </div>
              )}

              {setupSuccessMessage && (
                <div className="p-3 rounded-lg bg-[#16C784]/10 border border-[#16C784]/30 text-[#16C784] text-xs flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>{setupSuccessMessage}</div>
                </div>
              )}

              <button
                type="button"
                onClick={handleSendSetupLink}
                disabled={setupLoading}
                className="w-full py-2 px-3 rounded-lg bg-[#16C784]/10 text-[#16C784] border border-[#16C784]/30 hover:bg-[#16C784]/20 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                {setupLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                <span>Dispatch Setup Token to Designated Email</span>
              </button>

              <form onSubmit={handleCompletePasswordSetup} className="space-y-3 pt-3 border-t border-slate-100">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Setup / Reset Token
                  </label>
                  <input
                    type="text"
                    required
                    value={setupTokenInput}
                    onChange={(e) => setSetupTokenInput(e.target.value)}
                    placeholder="Paste secure token received in email"
                    className="w-full px-3 py-1.5 text-xs font-mono border border-[#E2E8F0] rounded-lg focus:ring-1 focus:ring-[#16C784] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    New Master Password (Min. 12 characters)
                  </label>
                  <input
                    type="password"
                    required
                    minLength={12}
                    value={newAdminPassword}
                    onChange={(e) => setNewAdminPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full px-3 py-1.5 text-xs border border-[#E2E8F0] rounded-lg focus:ring-1 focus:ring-[#16C784] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Confirm Master Password
                  </label>
                  <input
                    type="password"
                    required
                    minLength={12}
                    value={confirmAdminPassword}
                    onChange={(e) => setConfirmAdminPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full px-3 py-1.5 text-xs border border-[#E2E8F0] rounded-lg focus:ring-1 focus:ring-[#16C784] outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsSetupModalOpen(false)}
                    className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800 font-medium cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={setupLoading}
                    className="px-4 py-1.5 text-xs font-semibold bg-[#16C784] hover:bg-[#14B8A6] text-white rounded-lg disabled:opacity-50 cursor-pointer shadow-xs"
                  >
                    {setupLoading ? 'Saving...' : 'Set Password'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
