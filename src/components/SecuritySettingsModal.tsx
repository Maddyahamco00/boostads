import React, { useState, useEffect } from 'react';
import { 
  X, 
  ShieldCheck, 
  Key, 
  Smartphone, 
  Globe, 
  Trash2, 
  RefreshCw, 
  Check, 
  Copy, 
  AlertCircle, 
  CheckCircle2, 
  LogOut,
  Lock
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SessionEntity } from '../types';

interface SecuritySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SecuritySettingsModal: React.FC<SecuritySettingsModalProps> = ({
  isOpen,
  onClose
}) => {
  const { currentUser, refreshData } = useApp();
  const [activeTab, setActiveTab] = useState<'sessions' | '2fa' | 'password'>('sessions');

  // Sessions state
  const [sessions, setSessions] = useState<SessionEntity[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  // 2FA Setup state
  const [twoFactorData, setTwoFactorData] = useState<{
    secret: string;
    otpauthUrl: string;
    qrCodeDataUrl: string;
    recoveryCodes: string[];
  } | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);
  const [copiedCodes, setCopiedCodes] = useState(false);

  // Common feedback
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchSessions = async () => {
    setLoadingSessions(true);
    try {
      const res = await fetch('/api/auth/sessions');
      const data = await res.json();
      if (data.success) {
        setSessions(data.sessions);
      }
    } catch (err) {
      console.error('Failed to load sessions', err);
    } finally {
      setLoadingSessions(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setSuccessMessage(null);
      fetchSessions();
    }
  }, [isOpen]);

  const handleRevokeSession = async (sessionId: string) => {
    try {
      const res = await fetch(`/api/auth/sessions/${sessionId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setSessions(sessions.filter(s => s.id !== sessionId));
        setSuccessMessage('Session revoked successfully');
      }
    } catch (err) {
      setError('Failed to revoke session');
    }
  };

  const handleRevokeAllOther = async () => {
    try {
      const res = await fetch('/api/auth/sessions/all-other', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        fetchSessions();
        setSuccessMessage('All other active sessions have been terminated');
      }
    } catch (err) {
      setError('Failed to revoke sessions');
    }
  };

  const handleStart2FASetup = async () => {
    setTwoFactorLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/2fa/setup', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setTwoFactorData(data);
      } else {
        throw new Error(data.error || 'Failed to initialize 2FA');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '2FA Setup failed');
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const handleEnable2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!twoFactorData) return;
    setTwoFactorLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/2fa/enable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret: twoFactorData.secret,
          code: verificationCode,
          recoveryCodes: twoFactorData.recoveryCodes
        })
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to enable 2FA');
      }

      setSuccessMessage('Two-Factor Authentication is now ENABLED on your account!');
      setTwoFactorData(null);
      setVerificationCode('');
      await refreshData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid 2FA confirmation code');
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const handleDisable2FA = async () => {
    const code = prompt('Enter a 6-digit 2FA code or recovery code to confirm disabling:');
    if (!code) return;

    setTwoFactorLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/2fa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to disable 2FA');
      setSuccessMessage('2FA has been disabled.');
      await refreshData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to disable 2FA');
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    setPasswordLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword
        })
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to change password');
      }

      setSuccessMessage('Password changed successfully! Previous credentials invalidated.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Password update failed');
    } finally {
      setPasswordLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-slate-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="font-extrabold text-sm text-white">Security & Access Management</div>
              <p className="text-[11px] text-slate-400">
                User: <span className="text-emerald-300 font-semibold">{currentUser.email}</span> ({currentUser.role})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 p-1">
          <button
            onClick={() => { setActiveTab('sessions'); setError(null); setSuccessMessage(null); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'sessions' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            Active Sessions ({sessions.length})
          </button>
          <button
            onClick={() => { setActiveTab('2fa'); setError(null); setSuccessMessage(null); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              activeTab === '2fa' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            2FA Security
          </button>
          <button
            onClick={() => { setActiveTab('password'); setError(null); setSuccessMessage(null); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'password' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            Password
          </button>
        </div>

        <div className="p-6 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* TAB 1: ACTIVE SESSIONS */}
          {activeTab === 'sessions' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-xs text-slate-400">
                  Track devices and browsers currently authenticated to your account.
                </div>
                {sessions.length > 1 && (
                  <button
                    onClick={handleRevokeAllOther}
                    className="text-[11px] font-bold text-rose-400 hover:underline flex items-center gap-1"
                  >
                    <LogOut className="w-3 h-3" /> Terminate All Other Sessions
                  </button>
                )}
              </div>

              {loadingSessions ? (
                <div className="py-8 text-center text-slate-500 text-xs">Loading active sessions...</div>
              ) : sessions.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-xs">No active sessions found.</div>
              ) : (
                <div className="space-y-2.5">
                  {sessions.map((sess) => (
                    <div
                      key={sess.id}
                      className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-white">IP: {sess.ipAddress}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                            {sess.userAgent.includes('Mobile') ? '📱 Mobile' : '💻 Desktop Browser'}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 truncate max-w-xs">
                          {sess.userAgent}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          Last active: {new Date(sess.lastActiveAt).toLocaleString()}
                        </div>
                      </div>

                      <button
                        onClick={() => handleRevokeSession(sess.id)}
                        className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                        title="Revoke session"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: 2FA */}
          {activeTab === '2fa' && (
            <div className="space-y-4">
              {!twoFactorData ? (
                <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Smartphone className="w-5 h-5 text-emerald-400" />
                      <div className="font-bold text-xs text-white">Authenticator App (TOTP)</div>
                    </div>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                      RFC 6238 Standard
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed">
                    Protect your Boost Market account with Google Authenticator, Authy, or 1Password. Every login will require a 6-digit TOTP security code or backup recovery code.
                  </p>

                  <div className="pt-2 flex items-center gap-2">
                    <button
                      onClick={handleStart2FASetup}
                      disabled={twoFactorLoading}
                      className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors"
                    >
                      {twoFactorLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Configure 2FA Setup'}
                    </button>
                    <button
                      onClick={handleDisable2FA}
                      className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                    >
                      Disable 2FA
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleEnable2FA} className="space-y-4">
                  <div className="text-center p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <img
                      src={twoFactorData.qrCodeDataUrl}
                      alt="2FA QR Code"
                      className="w-40 h-40 mx-auto rounded-lg bg-white p-2"
                    />
                    <div className="mt-2 text-[11px] text-slate-400">
                      Scan QR code or manually enter TOTP Secret Key:
                    </div>
                    <code className="block mt-1 p-1 bg-slate-900 text-emerald-300 text-xs font-mono rounded">
                      {twoFactorData.secret}
                    </code>
                  </div>

                  {/* 8 Recovery Codes */}
                  <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
                      <span>Emergency Backup Recovery Codes (Keep Safe):</span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(twoFactorData.recoveryCodes.join('\n'));
                          setCopiedCodes(true);
                          setTimeout(() => setCopiedCodes(false), 2000);
                        }}
                        className="text-emerald-400 hover:underline flex items-center gap-1"
                      >
                        {copiedCodes ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        {copiedCodes ? 'Copied' : 'Copy All'}
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 pt-1">
                      {twoFactorData.recoveryCodes.map((code, idx) => (
                        <div key={idx} className="p-1 rounded bg-slate-900 text-center font-mono text-[11px] text-slate-300">
                          {code}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Verify 6-Digit Code from Authenticator:
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      required
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="123456"
                      className="w-full text-center tracking-[0.4em] font-mono text-lg py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="submit"
                      disabled={twoFactorLoading}
                      className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg flex items-center justify-center gap-1.5"
                    >
                      {twoFactorLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Confirm & Enable 2FA'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setTwoFactorData(null)}
                      className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* TAB 3: PASSWORD CHANGE */}
          {activeTab === 'password' && (
            <form onSubmit={handleChangePassword} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Current Password</label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">New Password</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min. 8 characters with numbers & letters"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <button
                type="submit"
                disabled={passwordLoading}
                className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg flex items-center justify-center gap-1.5"
              >
                {passwordLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Update Password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
