import React, { useState, useEffect } from 'react';
import { 
  Lock, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  ArrowLeft,
  KeyRound,
  Check,
  X
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { authApi, formatAuthError } from '../lib/api';
import { Logo } from './Logo';

export const ResetPasswordView: React.FC = () => {
  const { setActiveView } = useApp();

  const [token, setToken] = useState('');
  const [tokenFromUrl, setTokenFromUrl] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Status & Feedback
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTokenInvalid, setIsTokenInvalid] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ token?: string; newPassword?: string; confirmPassword?: string }>({});

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlToken = params.get('token') || params.get('resetToken');

      if (urlToken && urlToken.trim()) {
        setToken(urlToken.trim());
        setTokenFromUrl(true);
      }

      if (window.location.pathname !== '/reset-password') {
        window.history.replaceState({}, '', '/reset-password' + (window.location.search || ''));
      }
    }
  }, []);

  // Validation checks
  const hasMinLength = newPassword.length >= 8;
  const hasLetter = /[A-Za-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  const validateForm = (): boolean => {
    const errors: { token?: string; newPassword?: string; confirmPassword?: string } = {};

    if (!token.trim()) {
      errors.token = 'Reset token is required';
    }

    if (!newPassword) {
      errors.newPassword = 'New password is required';
    } else {
      if (newPassword.length < 8) {
        errors.newPassword = 'Password must be at least 8 characters';
      } else if (!hasLetter) {
        errors.newPassword = 'Password must contain at least one letter';
      } else if (!hasNumber) {
        errors.newPassword = 'Password must contain at least one number';
      } else if (newPassword.length > 128) {
        errors.newPassword = 'Password is too long (maximum 128 characters)';
      }
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Password confirmation is required';
    } else if (newPassword !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsTokenInvalid(false);
    setFieldErrors({});

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const response = await authApi.resetPassword(token.trim(), newPassword);
      if (response && response.success) {
        setIsSuccess(true);
        // Clear sensitive inputs
        setNewPassword('');
        setConfirmPassword('');
      } else {
        throw new Error(response?.message || 'Failed to reset password');
      }
    } catch (err: unknown) {
      const formatted = formatAuthError(err);
      const msg = formatted.message || 'This password reset link is invalid or has expired.';
      setError(msg);

      if (
        msg.toLowerCase().includes('invalid') || 
        msg.toLowerCase().includes('expired') || 
        msg.toLowerCase().includes('already been used') ||
        formatted.status === 400
      ) {
        setIsTokenInvalid(true);
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
        
        {!isSuccess ? (
          <div>
            {/* Header Titles */}
            <div className="mb-6 text-center">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Reset Password</h1>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Enter your new password below to regain access to your account.
              </p>
            </div>

            {/* Error Notice */}
            {error && (
              <div className="mb-5 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div>{error}</div>
                  {isTokenInvalid && (
                    <div className="mt-2 pt-2 border-t border-red-200">
                      <button
                        type="button"
                        onClick={() => {
                          if (typeof window !== 'undefined') {
                            window.history.replaceState({}, '', '/forgot-password');
                          }
                          setActiveView('forgot_password');
                        }}
                        className="text-xs font-semibold text-red-800 hover:underline cursor-pointer"
                      >
                        Request a New Link
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              
              {/* Token field (only if not supplied in URL) */}
              {!tokenFromUrl && (
                <div>
                  <label htmlFor="reset-token" className="block text-xs font-semibold text-slate-700 mb-1">
                    Reset Token
                  </label>
                  <input
                    id="reset-token"
                    type="text"
                    required
                    value={token}
                    onChange={(e) => {
                      setToken(e.target.value);
                      if (fieldErrors.token) setFieldErrors(prev => ({ ...prev, token: undefined }));
                    }}
                    placeholder="Enter reset token from email"
                    className={`w-full px-3.5 py-2.5 bg-white border ${
                      fieldErrors.token ? 'border-red-500' : 'border-[#E2E8F0]'
                    } rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#16C784] focus:ring-1 focus:ring-[#16C784] font-mono`}
                  />
                  {fieldErrors.token && (
                    <p className="mt-1 text-xs text-red-600">{fieldErrors.token}</p>
                  )}
                </div>
              )}

              {/* New Password Field */}
              <div>
                <label htmlFor="reset-new-password" className="block text-xs font-semibold text-slate-700 mb-1">
                  New Password
                </label>
                <div className="relative">
                  <input
                    id="reset-new-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      if (fieldErrors.newPassword) setFieldErrors(prev => ({ ...prev, newPassword: undefined }));
                    }}
                    placeholder="••••••••"
                    className={`w-full px-3.5 pr-10 py-2.5 bg-white border ${
                      fieldErrors.newPassword ? 'border-red-500' : 'border-[#E2E8F0]'
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
                {fieldErrors.newPassword && (
                  <p className="mt-1 text-xs text-red-600">{fieldErrors.newPassword}</p>
                )}

                {/* Password Rules Checklist */}
                {newPassword.length > 0 && (
                  <div className="mt-2 grid grid-cols-3 gap-1.5 text-[11px]">
                    <span className={`flex items-center gap-1 ${hasMinLength ? 'text-[#16C784] font-medium' : 'text-slate-400'}`}>
                      {hasMinLength ? <Check className="w-3 h-3 shrink-0" /> : <span className="w-1.5 h-1.5 rounded-full bg-slate-300 ml-0.5 mr-1" />}
                      8+ characters
                    </span>
                    <span className={`flex items-center gap-1 ${hasLetter ? 'text-[#16C784] font-medium' : 'text-slate-400'}`}>
                      {hasLetter ? <Check className="w-3 h-3 shrink-0" /> : <span className="w-1.5 h-1.5 rounded-full bg-slate-300 ml-0.5 mr-1" />}
                      1+ letter
                    </span>
                    <span className={`flex items-center gap-1 ${hasNumber ? 'text-[#16C784] font-medium' : 'text-slate-400'}`}>
                      {hasNumber ? <Check className="w-3 h-3 shrink-0" /> : <span className="w-1.5 h-1.5 rounded-full bg-slate-300 ml-0.5 mr-1" />}
                      1+ number
                    </span>
                  </div>
                )}
              </div>

              {/* Confirm Password Field */}
              <div>
                <label htmlFor="reset-confirm-password" className="block text-xs font-semibold text-slate-700 mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    id="reset-confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (fieldErrors.confirmPassword) setFieldErrors(prev => ({ ...prev, confirmPassword: undefined }));
                    }}
                    placeholder="••••••••"
                    className={`w-full px-3.5 pr-10 py-2.5 bg-white border ${
                      fieldErrors.confirmPassword ? 'border-red-500' : 'border-[#E2E8F0]'
                    } rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#16C784] focus:ring-1 focus:ring-[#16C784] transition-colors`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {fieldErrors.confirmPassword && (
                  <p className="mt-1 text-xs text-red-600">{fieldErrors.confirmPassword}</p>
                )}
              </div>

              {/* Submit Button */}
              <button
                id="reset-submit-btn"
                type="submit"
                disabled={isSubmitting || !token.trim() || !newPassword || !confirmPassword}
                className="w-full py-2.5 px-4 rounded-lg bg-[#16C784] hover:bg-[#14B8A6] text-white font-semibold text-sm transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Resetting password...
                  </span>
                ) : (
                  'Reset Password'
                )}
              </button>

              {/* Back to Login Link */}
              <div className="pt-2 text-center">
                <button
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
          </div>
        ) : (
          /* Success State */
          <div className="space-y-6 text-center">
            
            <div className="w-12 h-12 rounded-full bg-[#16C784]/15 text-[#16C784] mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-xl font-bold text-slate-900">Password reset successfully.</h2>
              <p className="text-xs text-slate-600 leading-relaxed max-w-xs mx-auto">
                Your password has been updated. Please sign in with your new password to continue.
              </p>
            </div>

            <button
              id="reset-success-login-btn"
              type="button"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.history.replaceState({}, '', '/login');
                }
                setActiveView('login');
              }}
              className="w-full py-2.5 px-4 rounded-lg bg-[#16C784] hover:bg-[#14B8A6] text-white font-semibold text-sm transition-colors cursor-pointer shadow-xs"
            >
              Login
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
