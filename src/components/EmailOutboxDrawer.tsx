'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Mail, 
  Trash2, 
  RefreshCw, 
  ExternalLink, 
  Copy, 
  Check
} from 'lucide-react';
import { EmailLog } from '../types';

interface EmailOutboxDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyToken?: (type: string, token: string) => void;
}

export const EmailOutboxDrawer: React.FC<EmailOutboxDrawerProps> = ({
  isOpen,
  onClose,
  onApplyToken
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
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-white border-l border-gray-200 h-full flex flex-col shadow-xl text-gray-900">
        
        {/* Drawer Header */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-blue-600" />
            <div>
              <h2 className="text-sm font-semibold text-gray-900">
                Email Outbox ({emails.length})
              </h2>
              <p className="text-xs text-gray-500">
                Inspect simulated tokens and verification emails
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={fetchOutbox}
              title="Refresh"
              className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={clearOutbox}
              title="Clear Outbox"
              className="p-1.5 rounded-lg text-gray-500 hover:text-red-600 hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Email List */}
          <div className="w-1/2 border-r border-gray-100 overflow-y-auto divide-y divide-gray-100 bg-gray-50/50">
            {emails.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-xs">
                No emails sent yet.
              </div>
            ) : (
              emails.map((email) => {
                const isSelected = selectedEmail?.id === email.id;
                return (
                  <button
                    key={email.id}
                    onClick={() => setSelectedEmail(email)}
                    className={`w-full text-left p-3 flex flex-col gap-1 transition-colors cursor-pointer ${
                      isSelected ? 'bg-white font-medium border-l-2 border-blue-600' : 'hover:bg-gray-100/60'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="capitalize font-semibold text-gray-700">
                        {email.template.replace('_', ' ')}
                      </span>
                      <span className="text-gray-400">
                        {new Date(email.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="text-xs text-gray-900 truncate">{email.subject}</div>
                    <div className="text-[11px] text-gray-500 truncate">To: {email.to}</div>
                  </button>
                );
              })
            )}
          </div>

          {/* Email Detail View */}
          <div className="w-1/2 p-4 overflow-y-auto flex flex-col bg-white">
            {selectedEmail ? (
              <div className="space-y-4">
                <div className="pb-3 border-b border-gray-100 space-y-1 text-xs">
                  <div>
                    <span className="text-gray-500">To:</span> <span className="text-gray-900">{selectedEmail.to}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Subject:</span> <span className="text-gray-900">{selectedEmail.subject}</span>
                  </div>
                </div>

                {/* Token Actions */}
                {selectedEmail.token && (
                  <div className="p-3 bg-gray-50 border border-gray-100 rounded-lg space-y-2">
                    <div className="text-xs font-medium text-gray-700 flex items-center justify-between">
                      <span>Verification Token:</span>
                      <button
                        onClick={() => copyToClipboard(selectedEmail.token!, selectedEmail.id)}
                        className="text-blue-600 hover:underline flex items-center gap-1 cursor-pointer text-xs"
                      >
                        {copiedId === selectedEmail.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedId === selectedEmail.id ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                    <code className="block p-2 rounded bg-white border border-gray-200 text-xs font-mono break-all text-gray-900">
                      {selectedEmail.token}
                    </code>

                    {onApplyToken && (
                      <button
                        onClick={() => {
                          onApplyToken(selectedEmail.template, selectedEmail.token!);
                        }}
                        className="w-full py-1.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Apply Token
                      </button>
                    )}
                  </div>
                )}

                {/* Email HTML Body */}
                <div 
                  className="p-3 bg-gray-50 border border-gray-100 rounded-lg text-xs overflow-x-auto text-gray-800"
                  dangerouslySetInnerHTML={{ __html: selectedEmail.htmlContent }}
                />
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-400 text-xs">
                Select an email to view details
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
