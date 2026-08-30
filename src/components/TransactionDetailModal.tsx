import React, { useState } from 'react';
import { 
  X, 
  ArrowRightLeft, 
  Building2, 
  ShieldCheck, 
  CreditCard, 
  Clock, 
  RefreshCw, 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle,
  Copy
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
  const [refundReason, setRefundReason] = useState('Client requested refund for service adjustments');
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
          requestedBy: 'merchant_finance_officer'
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative my-8">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center">
            <ArrowRightLeft className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-white">Transaction Inspector</h3>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                payment.status === 'successful'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                  : payment.status === 'refunded'
                  ? 'bg-purple-500/10 text-purple-400 border border-purple-500/30'
                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
              }`}>
                {payment.status}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">{payment.reference}</p>
          </div>
        </div>

        {/* Financial Flow Highlight */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
            <span className="text-[11px] text-slate-400 uppercase font-semibold">Customer Paid</span>
            <div className="text-2xl font-extrabold text-white mt-1">
              {payment.customerCurrency} {payment.customerAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              via {payment.paymentMethod.replace('_', ' ')} ({payment.paymentProvider})
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-800/40">
            <span className="text-[11px] text-emerald-400 uppercase font-semibold">Net NGN Credited to Merchant</span>
            <div className="text-2xl font-extrabold text-emerald-300 mt-1">
              ₦{payment.netSettlementNGN.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[11px] text-emerald-400/80 mt-1 block">
              Settlement Status: <strong className="uppercase">{payment.settlementStatus}</strong>
            </span>
          </div>
        </div>

        {/* Breakdown Details */}
        <div className="space-y-2.5 bg-slate-950/60 border border-slate-800 rounded-2xl p-4 text-xs mb-6">
          <div className="flex justify-between text-slate-400">
            <span>Customer Name & Email:</span>
            <span className="text-slate-200">{payment.customerName} ({payment.customerEmail})</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Locked FX Conversion Rate:</span>
            <span className="text-emerald-300 font-mono font-semibold">1 {payment.customerCurrency} = ₦{payment.exchangeRate} NGN</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>FX Rate Source & Timestamp:</span>
            <span className="text-slate-300 capitalize">{payment.rateSource.replace(/_/g, ' ')} ({new Date(payment.exchangeRateTimestamp).toLocaleTimeString()})</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Platform Fee (1.5%):</span>
            <span className="text-slate-300">{payment.customerCurrency} {payment.fees.platformFee.toFixed(2)} (₦{(payment.fees.platformFee * payment.exchangeRate).toFixed(2)})</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Provider Transaction ID:</span>
            <span className="font-mono text-slate-300">{payment.providerTransactionId || 'N/A'}</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Quote ID Token:</span>
            <span className="font-mono text-slate-300">{payment.quoteId}</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Created Timestamp:</span>
            <span className="font-mono text-slate-300">{new Date(payment.createdAt).toLocaleString()}</span>
          </div>
        </div>

        {/* Refund Trigger Section */}
        {payment.status === 'successful' && !showRefundForm && (
          <div className="flex justify-end">
            <button
              onClick={() => setShowRefundForm(true)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-300 text-xs font-semibold flex items-center gap-1.5 transition border border-rose-900/30"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Issue Full or Partial Refund</span>
            </button>
          </div>
        )}

        {showRefundForm && (
          <form onSubmit={handleRefund} className="p-4 rounded-2xl bg-rose-950/20 border border-rose-800/40 space-y-3 mb-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                <RotateCcw className="w-4 h-4" /> Issue Refund with FX Reversal
              </span>
              <button
                type="button"
                onClick={() => setShowRefundForm(false)}
                className="text-[11px] text-slate-400 hover:text-white"
              >
                Cancel
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  Refund Amount ({payment.customerCurrency})
                </label>
                <input
                  type="number"
                  step="0.01"
                  max={payment.customerAmount}
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  NGN Settlement Impact
                </label>
                <div className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-emerald-400">
                  ₦{(refundAmount * payment.exchangeRate).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-300 mb-1">Reason for Refund</label>
              <input
                type="text"
                required
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
              />
            </div>

            {refundError && (
              <div className="text-rose-400 text-xs flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{refundError}</span>
              </div>
            )}

            {refundSuccessMsg && (
              <div className="text-emerald-400 text-xs flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{refundSuccessMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={refunding}
              className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-600/30 transition flex items-center justify-center gap-2"
            >
              {refunding ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Processing Refund with Provider...</span>
                </>
              ) : (
                <span>Confirm & Dispatch Refund</span>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
