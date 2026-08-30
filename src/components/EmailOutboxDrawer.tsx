import React, { useState, useEffect } from 'react';
import { 
  X, 
  Mail, 
  Trash2, 
  RefreshCw, 
  ExternalLink, 
  Copy, 
  Check, 
  ShieldCheck, 
  Key, 
  Crown, 
  AlertTriangle 
} from 'lucide-react';
import { EmailLog } from '../types';

interface EmailOutboxDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectToken?: (type: string, token: string) => void;
}

export const EmailOutboxDrawer: React.FC<EmailOutboxDrawerProps> = ({
  isOpen,
  onClose,
  onSelectToken
}) => {
  const [emails, setEmails] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<EmailLog | null>(null);

  const fetchOutbox = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/outbox');
      const data = await res.json();
      if (data.success) {
        setEmails(data.emails);
        if (data.emails.length > 0 && !selectedEmail) {
          setSelectedEmail(data.emails[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load email outbox', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchOutbox();
    }
  }, [isOpen]);

  const clearOutbox = async () => {
    try {
      await fetch('/api/auth/outbox', { method: 'DELETE' });
      setEmails([]);
      setSelectedEmail(null);
    } catch (err) {
      console.error('Failed to clear outbox', err);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-slate-900 border-l border-slate-800 h-full flex flex-col shadow-2xl text-slate-200">
        
        {/* Drawer Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-sm text-white flex items-center gap-2">
                Simulated Email Outbox & Dispatcher
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300">
                  {emails.length} Messages
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Inspect single-use tokens & click verification/reset actions directly in preview
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={fetchOutbox}
              title="Refresh"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={clearOutbox}
              title="Clear Outbox"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body: Split List & Viewer */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Email List Sidebar */}
          <div className="w-1/2 border-r border-slate-800 overflow-y-auto divide-y divide-slate-800/60 bg-slate-950/30">
            {emails.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <Mail className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-xs">No emails dispatched yet.</p>
                <p className="text-[11px] mt-1 text-slate-600">
                  Register an account, request a password reset, or trigger Admin Setup to see emails here.
                </p>
              </div>
            ) : (
              emails.map((email) => {
                const isSelected = selectedEmail?.id === email.id;
                let Icon = Mail;
                let badgeColor = 'bg-slate-800 text-slate-300';
                if (email.template === 'admin_setup') {
                  Icon = Crown;
                  badgeColor = 'bg-amber-500/20 text-amber-300 border border-amber-500/30';
                } else if (email.template === 'verification') {
                  Icon = ShieldCheck;
                  badgeColor = 'bg-emerald-500/20 text-emerald-300';
                } else if (email.template === 'password_reset') {
                  Icon = Key;
                  badgeColor = 'bg-blue-500/20 text-blue-300';
                } else if (email.template === 'security_alert') {
                  Icon = AlertTriangle;
                  badgeColor = 'bg-rose-500/20 text-rose-300';
                }

                return (
                  <button
                    key={email.id}
                    onClick={() => setSelectedEmail(email)}
                    className={`w-full text-left p-3 flex flex-col gap-1 transition-colors ${
                      isSelected ? 'bg-slate-800/90 text-white' : 'hover:bg-slate-900/60 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${badgeColor}`}>
                        {email.template.replace('_', ' ')}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {new Date(email.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="font-semibold text-xs text-white truncate">{email.subject}</div>
                    <div className="text-[11px] text-slate-400 truncate">To: {email.to}</div>

                    {email.token && (
                      <div className="mt-1 flex items-center gap-1 text-[10px] text-emerald-400 font-mono">
                        <span>Token:</span>
                        <code className="bg-slate-950 px-1 py-0.5 rounded truncate max-w-[120px]">
                          {email.token}
                        </code>
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Email Detail View */}
          <div className="w-1/2 p-4 overflow-y-auto flex flex-col bg-slate-900">
            {selectedEmail ? (
              <div className="space-y-4">
                <div className="pb-3 border-b border-slate-800 space-y-1">
                  <div className="text-xs text-slate-400">
                    <strong className="text-slate-300">To:</strong> {selectedEmail.to}
                  </div>
                  <div className="text-xs text-slate-400">
                    <strong className="text-slate-300">Subject:</strong> {selectedEmail.subject}
                  </div>
                  <div className="text-xs text-slate-400">
                    <strong className="text-slate-300">Timestamp:</strong> {new Date(selectedEmail.sentAt).toLocaleString()}
                  </div>
                </div>

                {/* Quick Action Buttons for Single-Use Tokens */}
                {selectedEmail.token && (
                  <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2">
                    <div className="text-[11px] font-bold text-slate-300 flex items-center justify-between">
                      <span>Secure Single-Use Token:</span>
                      <button
                        onClick={() => copyToClipboard(selectedEmail.token!, selectedEmail.id)}
                        className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-normal"
                      >
                        {copiedId === selectedEmail.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        {copiedId === selectedEmail.id ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                    <code className="block p-2 rounded bg-slate-900 text-xs text-emerald-300 font-mono break-all border border-slate-800">
                      {selectedEmail.token}
                    </code>

                    {onSelectToken && (
                      <button
                        onClick={() => {
                          onSelectToken(selectedEmail.template, selectedEmail.token!);
                          onClose();
                        }}
                        className="w-full py-1.5 px-3 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center justify-center gap-1.5 border border-emerald-500/30 transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Apply Token to Auth Modal
                      </button>
                    )}
                  </div>
                )}

                {/* Render HTML content safely inside styled preview container */}
                <div 
                  className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs overflow-x-auto text-slate-300"
                  dangerouslySetInnerHTML={{ __html: selectedEmail.htmlContent }}
                />
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-500 text-xs">
                Select an email to view full content
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
