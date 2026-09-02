import React, { useState, useEffect } from 'react';
import { 
  X, 
  Trash2, 
  RefreshCw, 
  Check, 
  Copy, 
  AlertCircle, 
  CheckCircle2, 
  LogOut
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

  // Feedback
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
        setSuccessMessage('Session revoked successfully.');
      }
    } catch {
      setError('Failed to revoke session.');
    }
  };

  const handleRevokeAllOther = async () => {
    try {
      const res = await fetch('/api/auth/sessions/all-other', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        fetchSessions();
        setSuccessMessage('Other sessions revoked.');
      }
    } catch {
      setError('Failed to revoke sessions.');
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
      setError(err instanceof Error ? err.message : '2FA setup failed');
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

      setSuccessMessage('Two-Factor Authentication is enabled.');
      setTwoFactorData(null);
      setVerificationCode('');
      await refreshData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid code.');
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const handleDisable2FA = async () => {
    const code = prompt('Enter a 6-digit code or recovery code to disable 2FA:');
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
      setSuccessMessage('2FA disabled.');
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

      setSuccessMessage('Password changed successfully.');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="relative w-full max-w-lg bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden text-gray-900">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Security Settings</h2>
            <p className="text-xs text-gray-500">{currentUser.email}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 bg-gray-50/50 p-1">
          <button
            onClick={() => { setActiveTab('sessions'); setError(null); setSuccessMessage(null); }}
            className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
              activeTab === 'sessions' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Sessions ({sessions.length})
          </button>
          <button
            onClick={() => { setActiveTab('2fa'); setError(null); setSuccessMessage(null); }}
            className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
              activeTab === '2fa' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            2FA Security
          </button>
          <button
            onClick={() => { setActiveTab('password'); setError(null); setSuccessMessage(null); }}
            className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
              activeTab === 'password' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Password
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-xs flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* TAB 1: SESSIONS */}
          {activeTab === 'sessions' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Currently active sessions</span>
                {sessions.length > 1 && (
                  <button
                    onClick={handleRevokeAllOther}
                    className="text-red-600 hover:underline flex items-center gap-1 cursor-pointer font-medium"
                  >
                    <LogOut className="w-3 h-3" /> Revoke other sessions
                  </button>
                )}
              </div>

              {loadingSessions ? (
                <div className="py-6 text-center text-gray-400 text-xs">Loading sessions...</div>
              ) : sessions.length === 0 ? (
                <div className="py-6 text-center text-gray-400 text-xs">No active sessions.</div>
              ) : (
                <div className="space-y-2">
                  {sessions.map((sess) => (
                    <div
                      key={sess.id}
                      className="p-3 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-medium text-gray-900">IP: {sess.ipAddress}</div>
                        <div className="text-gray-500 truncate max-w-xs text-[11px]">{sess.userAgent}</div>
                      </div>
                      <button
                        onClick={() => handleRevokeSession(sess.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded transition-colors cursor-pointer"
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
                <div className="p-4 bg-gray-50 border border-gray-100 rounded-lg space-y-3">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">Authenticator App (TOTP)</h3>
                    <p className="text-xs text-gray-500 mt-1">
                      Protect your account with Google Authenticator, Authy, or 1Password.
                    </p>
                  </div>

                  <div className="pt-2 flex items-center gap-2">
                    <button
                      onClick={handleStart2FASetup}
                      disabled={twoFactorLoading}
                      className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs transition-colors cursor-pointer"
                    >
                      {twoFactorLoading ? 'Loading...' : 'Set Up 2FA'}
                    </button>
                    <button
                      onClick={handleDisable2FA}
                      className="px-3 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-medium transition-colors cursor-pointer"
                    >
                      Disable 2FA
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleEnable2FA} className="space-y-4">
                  <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-100">
                    <img
                      src={twoFactorData.qrCodeDataUrl}
                      alt="2FA QR Code"
                      className="w-36 h-36 mx-auto rounded bg-white p-1 border border-gray-200"
                    />
                    <div className="mt-2 text-xs text-gray-500">
                      Secret Key:
                    </div>
                    <code className="block mt-1 p-1 bg-white border border-gray-200 text-gray-900 text-xs font-mono rounded select-all">
                      {twoFactorData.secret}
                    </code>
                  </div>

                  {/* Recovery Codes */}
                  <div className="p-3 bg-gray-50 border border-gray-100 rounded-lg space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-medium text-gray-700">
                      <span>Backup Recovery Codes:</span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(twoFactorData.recoveryCodes.join('\n'));
                          setCopiedCodes(true);
                          setTimeout(() => setCopiedCodes(false), 2000);
                        }}
                        className="text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        {copiedCodes ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedCodes ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-1 pt-1">
                      {twoFactorData.recoveryCodes.map((code, idx) => (
                        <div key={idx} className="p-1 bg-white border border-gray-200 text-center font-mono text-[11px] text-gray-700 rounded">
                          {code}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Verification Code
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      required
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="123456"
                      className="w-full text-center tracking-widest font-mono text-lg py-2 bg-white border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="submit"
                      disabled={twoFactorLoading}
                      className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs transition-colors cursor-pointer"
                    >
                      {twoFactorLoading ? 'Enabling...' : 'Confirm 2FA'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setTwoFactorData(null)}
                      className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* TAB 3: PASSWORD */}
          {activeTab === 'password' && (
            <form onSubmit={handleChangePassword} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Current Password</label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs text-gray-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">New Password</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs text-gray-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs text-gray-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <button
                type="submit"
                disabled={passwordLoading}
                className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs transition-colors cursor-pointer"
              >
                {passwordLoading ? (
                  <span className="flex items-center justify-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Updating...
                  </span>
                ) : (
                  'Update Password'
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
