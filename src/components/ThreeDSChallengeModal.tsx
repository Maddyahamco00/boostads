import React, { useState } from 'react';
import { ShieldCheck, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
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
      setError('Please enter the 6-digit OTP code.');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white border border-gray-200 rounded-xl max-w-sm w-full p-5 shadow-xl text-gray-900">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-gray-900">3D-Secure Verification</h3>
              <p className="text-[10px] text-gray-500">Card Issuer Authentication</p>
            </div>
          </div>
        </div>

        {/* Transaction Summary */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4 space-y-1.5 text-xs">
          <div className="flex justify-between text-gray-600">
            <span>Merchant:</span>
            <span className="text-gray-900 font-medium">{payment.merchantName}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Amount:</span>
            <span className="text-gray-900 font-bold">
              {payment.customerCurrency} {payment.customerAmount.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>NGN Equivalent:</span>
            <span className="text-gray-900 font-mono">₦{payment.baseAmount.toLocaleString('en-NG')}</span>
          </div>
        </div>

        {/* Challenge Input */}
        <div className="space-y-2 mb-4">
          <label className="block text-xs font-medium text-gray-700">
            Enter 6-Digit OTP
          </label>
          <input
            type="text"
            maxLength={6}
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            placeholder="123456"
            className="w-full bg-white border border-gray-200 focus:border-blue-600 rounded-lg px-3 py-2 text-center text-lg tracking-[0.3em] font-mono text-gray-900 focus:outline-none"
          />

          {error && (
            <div className="flex items-center gap-1.5 text-rose-600 text-xs bg-rose-50 p-2 rounded-lg border border-rose-200">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={verifying}
            className="flex-1 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-medium transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleVerify}
            disabled={verifying}
            className="flex-1 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {verifying ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Verifying...</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Submit</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
