import React, { useState } from 'react';
import { ShieldCheck, Lock, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { Payment } from '../types';

interface ThreeDSChallengeModalProps {
  payment: Payment;
  onComplete: (success: boolean) => void;
  onClose: () => void;
}

export const ThreeDSChallengeModal: React.FC<ThreeDSChallengeModalProps> = ({
  payment,
  onComplete,
  onClose
}) => {
  const [otp, setOtp] = useState('123456');
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');

  const handleVerify = () => {
    if (otp.length < 4) {
      setError('Please enter the 6-digit OTP code sent to your phone/banking app.');
      return;
    }

    setVerifying(true);
    setError('');

    setTimeout(() => {
      setVerifying(false);
      onComplete(true);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-indigo-500/40 rounded-2xl max-w-md w-full p-6 shadow-2xl relative overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">3D-Secure 2.0 Authentication</h3>
              <p className="text-[11px] text-slate-400">Card Issuer Verified by Visa / Mastercard ID</p>
            </div>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Encrypted
          </span>
        </div>

        {/* Transaction Summary */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5 mb-5 space-y-2 text-xs">
          <div className="flex justify-between text-slate-400">
            <span>Merchant:</span>
            <span className="text-slate-200 font-medium">{payment.merchantName}</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Amount to Authorize:</span>
            <span className="text-emerald-400 font-bold text-sm">
              {payment.customerCurrency} {payment.customerAmount.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>NGN Settlement Equivalent:</span>
            <span className="text-slate-300 font-mono">₦{payment.baseAmount.toLocaleString('en-NG')}</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Card Number:</span>
            <span className="text-slate-300 font-mono">•••• •••• •••• 4242</span>
          </div>
        </div>

        {/* Challenge Input */}
        <div className="space-y-3 mb-6">
          <label className="block text-xs font-medium text-slate-300">
            Enter 6-Digit One-Time Password (OTP)
          </label>
          <div className="relative">
            <input
              type="text"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="123456"
              className="w-full bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-center text-xl tracking-[0.5em] font-mono text-white placeholder-slate-600 focus:outline-none"
            />
          </div>
          <p className="text-[11px] text-slate-500 text-center">
            (Sandbox simulation: Pre-filled with code <strong>123456</strong>)
          </p>

          {error && (
            <div className="flex items-center gap-2 text-rose-400 text-xs bg-rose-950/40 p-2.5 rounded-lg border border-rose-800/40">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={verifying}
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleVerify}
            disabled={verifying}
            className="flex-1 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2"
          >
            {verifying ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Authorizing...</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                <span>Submit & Pay</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
