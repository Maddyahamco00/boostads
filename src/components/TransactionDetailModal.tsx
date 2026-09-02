import React, { useState } from 'react';
import { 
  X, 
  ArrowRightLeft, 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle,
  RefreshCw 
} from 'lucide-react';
import { Payment } from '../types';

interface TransactionDetailModalProps {
  payment: Payment;
  onClose: () => void;
  onRefundSuccess: () => void;
}

export const TransactionDetailModal: React.FC<TransactionDetailModalProps> = ({
  payment,
  onClose,
  onRefundSuccess
}) => {
  const [showRefundForm, setShowRefundForm] = useState(false);
  const [refundAmount, setRefundAmount] = useState(payment.customerAmount);
  const [refundReason, setRefundReason] = useState('Client requested refund');
  const [refunding, setRefunding] = useState(false);
  const [refundError, setRefundError] = useState('');
  const [refundSuccessMsg, setRefundSuccessMsg] = useState('');

  const handleRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    setRefunding(true);
    setRefundError('');
    setRefundSuccessMsg('');

    try {
      const res = await fetch('/api/refunds/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentReference: payment.reference,
          amount: refundAmount,
          reason: refundReason,
          requestedBy: 'merchant'
        })
      });

      const data = await res.json();
      if (data.success) {
        setRefundSuccessMsg(data.message);
        onRefundSuccess();
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setRefundError(data.message || 'Refund failed');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setRefundError(message);
    } finally {
      setRefunding(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white border border-gray-200 rounded-xl max-w-lg w-full p-5 sm:p-6 shadow-xl relative my-8 text-gray-900">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-400 hover:text-gray-700 flex items-center justify-center transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <ArrowRightLeft className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-gray-900">Transaction Details</h3>
              <span className={`px-2 py-0.2 rounded text-[10px] font-semibold uppercase ${
                payment.status === 'successful'
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : payment.status === 'refunded'
                  ? 'bg-purple-50 text-purple-700 border border-purple-200'
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}>
                {payment.status}
              </span>
            </div>
            <p className="text-[11px] text-gray-500 font-mono">{payment.reference}</p>
          </div>
        </div>

        {/* Amount Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
            <span className="text-[10px] text-gray-500 uppercase font-medium">Customer Paid</span>
            <div className="text-lg font-bold text-gray-900 mt-0.5">
              {payment.customerCurrency} {payment.customerAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[10px] text-gray-500">
              {payment.paymentMethod.replace('_', ' ')} ({payment.paymentProvider})
            </span>
          </div>

          <div className="p-3 rounded-lg bg-green-50 border border-green-200">
            <span className="text-[10px] text-green-700 uppercase font-medium">Settled Amount</span>
            <div className="text-lg font-bold text-green-900 mt-0.5">
              ₦{payment.netSettlementNGN.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[10px] text-green-700">
              Status: <strong className="uppercase">{payment.settlementStatus}</strong>
            </span>
          </div>
        </div>

        {/* Breakdown Details */}
        <div className="space-y-2 bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs mb-4">
          <div className="flex justify-between text-gray-600">
            <span>Customer:</span>
            <span className="text-gray-900 font-medium">{payment.customerName} ({payment.customerEmail})</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Rate:</span>
            <span className="text-gray-900 font-mono">1 {payment.customerCurrency} = ₦{payment.exchangeRate}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Fee:</span>
            <span className="text-gray-900">{payment.customerCurrency} {payment.fees.platformFee.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Date:</span>
            <span className="text-gray-900">{new Date(payment.createdAt).toLocaleString()}</span>
          </div>
        </div>

        {/* Refund Trigger Section */}
        {payment.status === 'successful' && !showRefundForm && (
          <div className="flex justify-end">
            <button
              onClick={() => setShowRefundForm(true)}
              className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Issue Refund</span>
            </button>
          </div>
        )}

        {showRefundForm && (
          <form onSubmit={handleRefund} className="p-3 rounded-lg bg-rose-50 border border-rose-200 space-y-2.5 mb-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-rose-900 flex items-center gap-1">
                <RotateCcw className="w-3.5 h-3.5" /> Issue Refund
              </span>
              <button
                type="button"
                onClick={() => setShowRefundForm(false)}
                className="text-[11px] text-gray-500 hover:text-gray-700 cursor-pointer"
              >
                Cancel
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-medium text-gray-700 mb-0.5">
                  Amount ({payment.customerCurrency})
                </label>
                <input
                  type="number"
                  step="0.01"
                  max={payment.customerAmount}
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(Number(e.target.value))}
                  className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-900 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-gray-700 mb-0.5">
                  NGN Impact
                </label>
                <div className="bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs font-mono text-gray-900">
                  ₦{(refundAmount * payment.exchangeRate).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-gray-700 mb-0.5">Reason</label>
              <input
                type="text"
                required
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-900 focus:outline-none focus:border-rose-500"
              />
            </div>

            {refundError && (
              <div className="text-rose-600 text-xs flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{refundError}</span>
              </div>
            )}

            {refundSuccessMsg && (
              <div className="text-green-600 text-xs flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{refundSuccessMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={refunding}
              className="w-full py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-medium text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {refunding ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <span>Confirm Refund</span>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
