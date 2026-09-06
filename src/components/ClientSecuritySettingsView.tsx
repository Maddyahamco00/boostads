'use client';

import React, { useState } from 'react';
import { 
  Key, 
  Lock, 
  Eye, 
  EyeOff, 
  Check, 
  CheckCircle, 
  AlertTriangle, 
  ShieldCheck, 
  ArrowLeft,
  UserCheck
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { authApi, formatAuthError } from '../lib/api';

export const ClientSecuritySettingsView: React.FC = () => {
  const { currentUser, isAuthenticated, setActiveView } = useApp();

  // Password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSessionExpired, setIsSessionExpired] = useState(false);
  const [passwordChanged, setPasswordChanged] = useState(false);

  // Policy validation
  const hasMinLength = newPassword.length >= 8;
  const hasLetter = /[A-Za-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const isMatch = newPassword.length > 0 && newPassword === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!isAuthenticated) {
      setIsSessionExpired(true);
      return;
    }

    if (!currentPassword) {
      setError('Current password is required.');
      return;
    }

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long.');
      return;
    }

    if (!/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      setError('New password must contain at least one letter and one number.');
      return;
    }

    if (confirmPassword && newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    if (currentPassword === newPassword) {
      setError('New password cannot be the same as your current password.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await authApi.changePassword(currentPassword, newPassword, confirmPassword);
      if (res.success) {
        setSuccess('Password changed successfully. All active sessions have been revoked for your security.');
        setPasswordChanged(true);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err: unknown) {
      const formatted = formatAuthError(err);
      if (formatted.isSessionExpired || formatted.status === 401) {
        setIsSessionExpired(true);
      } else if (formatted.status === 429) {
        setError(formatted.message || 'Too many attempts. Please wait before trying again.');
      } else {
        setError(formatted.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Session expired or unauthenticated guard
  if (!isAuthenticated || isSessionExpired) {
    return (
      <div className="max-w-md mx-auto my-16 px-4">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Authentication Required</h2>
          <p className="text-sm text-slate-600 mb-6">
            Your session has expired or you are not signed in. Please sign in to manage your security settings.
          </p>
          <button
            id="settings-session-login-btn"
            onClick={() => setActiveView('login')}
            className="w-full py-2.5 px-4 bg-[#16C784] hover:bg-[#14b376] text-white font-medium rounded-xl transition-colors cursor-pointer"
          >
            Sign In to Boost Market
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto space-y-6">
        
        {/* Navigation & Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              id="settings-back-btn"
              onClick={() => setActiveView('profile')}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
              title="Return to Profile"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Security Settings</h1>
              <p className="text-xs text-slate-500">Manage your account authentication credentials</p>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full text-xs text-emerald-800">
            <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span className="font-medium truncate max-w-[150px]">{currentUser?.email}</span>
          </div>
        </div>

        {/* Change Password Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
          <div className="flex items-center gap-3 pb-4 mb-6 border-b border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Change Password</h2>
              <p className="text-xs text-slate-500">Update the password used to access your client account</p>
            </div>
          </div>

          {/* Success Banner */}
          {success && (
            <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs rounded-xl space-y-2">
              <div className="flex items-center gap-2 font-semibold">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                {success}
              </div>
              {passwordChanged && (
                <div className="pt-2 border-t border-emerald-200/60 flex items-center justify-between">
                  <span className="text-emerald-800">You may sign in again to verify your new password.</span>
                  <button
                    id="settings-relogin-btn"
                    onClick={() => setActiveView('login')}
                    className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white font-medium rounded-lg cursor-pointer transition-colors"
                  >
                    Sign In
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-900 text-xs rounded-xl flex items-center justify-between">
              <span className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                {error}
              </span>
              <button 
                onClick={() => setError(null)} 
                className="text-red-700 hover:text-red-900 font-medium cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Current Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Current Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="settings-current-password-input"
                  type={showCurrentPassword ? 'text' : 'password'}
                  required
                  value={currentPassword}
                  onChange={(e) => {
                    setCurrentPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="••••••••••••"
                  className="w-full pr-10 pl-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#16C784] focus:bg-white text-slate-900 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                New Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="settings-new-password-input"
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="Min. 8 characters"
                  className="w-full pr-10 pl-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#16C784] focus:bg-white text-slate-900 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Confirm New Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="settings-confirm-password-input"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="Repeat new password"
                  className="w-full pr-10 pl-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#16C784] focus:bg-white text-slate-900 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Password Policy Helpers */}
            {newPassword.length > 0 && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs">
                <div className="font-medium text-slate-700 mb-1">Password Requirements:</div>
                <div className={`flex items-center gap-1.5 ${hasMinLength ? 'text-emerald-700' : 'text-slate-500'}`}>
                  <Check className={`w-3.5 h-3.5 ${hasMinLength ? 'text-emerald-600' : 'text-slate-400'}`} />
                  At least 8 characters
                </div>
                <div className={`flex items-center gap-1.5 ${hasLetter ? 'text-emerald-700' : 'text-slate-500'}`}>
                  <Check className={`w-3.5 h-3.5 ${hasLetter ? 'text-emerald-600' : 'text-slate-400'}`} />
                  Contains at least one letter
                </div>
                <div className={`flex items-center gap-1.5 ${hasNumber ? 'text-emerald-700' : 'text-slate-500'}`}>
                  <Check className={`w-3.5 h-3.5 ${hasNumber ? 'text-emerald-600' : 'text-slate-400'}`} />
                  Contains at least one number
                </div>
                {confirmPassword.length > 0 && (
                  <div className={`flex items-center gap-1.5 ${isMatch ? 'text-emerald-700' : 'text-red-600'}`}>
                    <Check className={`w-3.5 h-3.5 ${isMatch ? 'text-emerald-600' : 'text-red-400'}`} />
                    Passwords match
                  </div>
                )}
              </div>
            )}

            {/* Security Session Invalidation Notice */}
            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                <strong>Session Security Notice:</strong> For your protection, updating your password will immediately revoke all active sessions across your devices.
              </span>
            </div>

            {/* Submit Action */}
            <div className="pt-2 flex justify-end">
              <button
                id="settings-change-password-btn"
                type="submit"
                disabled={isSubmitting || !currentPassword || !hasMinLength}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm rounded-xl transition-colors cursor-pointer disabled:opacity-50 shadow-sm"
              >
                <Key className="w-4 h-4" />
                {isSubmitting ? 'Changing Password...' : 'Change Password'}
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
};
