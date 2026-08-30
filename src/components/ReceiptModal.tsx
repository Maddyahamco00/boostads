import React, { useEffect } from 'react';
import { 
  CheckCircle2, 
  Download, 
  Printer, 
  ArrowRightLeft, 
  Building2, 
  ShieldCheck, 
  ExternalLink, 
  X,
  FileText,
  Copy
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Payment } from '../types';

interface ReceiptModalProps {
  payment: Payment;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ payment, onClose }) => {
  useEffect(() => {
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch {
      // ignore
    }
  }, []);

  const [copied, setCopied] = React.useState(false);

  const copyRef = () => {
    navigator.clipboard.writeText(payment.reference);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="bg-slate-900 border border-emerald-500/40 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative my-8">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Success Icon */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-emerald-500/20">
            <CheckCircle2 className="w-9 h-9" />
          </div>
          <h2 className="text-xl font-bold text-white">Payment Authorized & Settled</h2>
          <p className="text-xs text-slate-400 mt-1">
            Settlement in Nigerian Naira (NGN) successfully credited to merchant
          </p>
        </div>

        {/* Amount Badge */}
        <div className="bg-gradient-to-br from-slate-950 to-slate-900 border border-slate-800 rounded-2xl p-5 mb-6 text-center">
          <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Amount Paid</span>
          <div className="text-3xl font-extrabold text-white mt-1">
            {payment.customerCurrency} {payment.customerAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-xs font-semibold text-emerald-400">
            <span>₦{payment.baseAmount.toLocaleString('en-NG')} NGN Settled</span>
            <span>•</span>
            <span className="text-[11px] font-mono">1 {payment.customerCurrency} = ₦{payment.exchangeRate}</span>
          </div>
        </div>

        {/* Detailed Breakdown */}
        <div className="space-y-3 bg-slate-950/60 border border-slate-800 rounded-2xl p-4 text-xs mb-6">
          <div className="flex justify-between items-center text-slate-400">
            <span>Transaction Ref:</span>
            <button
              onClick={copyRef}
              className="flex items-center gap-1 font-mono text-slate-200 hover:text-indigo-400 transition"
            >
              <span>{payment.reference}</span>
              <Copy className="w-3 h-3 text-slate-500" />
              {copied && <span className="text-[10px] text-emerald-400">Copied!</span>}
            </button>
          </div>

          <div className="flex justify-between items-center text-slate-400">
            <span>Beneficiary Merchant:</span>
            <span className="font-semibold text-slate-200">{payment.merchantName}</span>
          </div>

          <div className="flex justify-between items-center text-slate-400">
            <span>Settlement Destination:</span>
            <span className="font-semibold text-emerald-400">Zenith Bank (NGN 1018928472)</span>
          </div>

          <div className="flex justify-between items-center text-slate-400">
            <span>Customer Name:</span>
            <span className="text-slate-200">{payment.customerName}</span>
          </div>

          <div className="flex justify-between items-center text-slate-400">
            <span>Customer Email:</span>
            <span className="text-slate-200">{payment.customerEmail}</span>
          </div>

          <div className="flex justify-between items-center text-slate-400">
            <span>Payment Provider:</span>
            <span className="uppercase text-indigo-400 font-semibold">{payment.paymentProvider}</span>
          </div>

          <div className="flex justify-between items-center text-slate-400">
            <span>Provider Transaction ID:</span>
            <span className="font-mono text-slate-300">{payment.providerTransactionId || 'FLW_TRX_9918274'}</span>
          </div>

          <div className="flex justify-between items-center text-slate-400">
            <span>Payment Method:</span>
            <span className="capitalize text-slate-300">{payment.paymentMethod.replace('_', ' ')}</span>
          </div>

          <div className="flex justify-between items-center text-slate-400 border-t border-slate-800/80 pt-2">
            <span>Platform Fee:</span>
            <span className="text-slate-300">
              {payment.customerCurrency} {payment.fees.platformFee.toFixed(2)}
            </span>
          </div>

          <div className="flex justify-between items-center text-slate-400">
            <span>Date & Time:</span>
            <span className="text-slate-300 font-mono">
              {new Date(payment.paidAt || payment.createdAt).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Regulatory & Compliance Stamp */}
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 mb-6">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <p>
            This transaction was processed in accordance with Central Bank of Nigeria (CBN) regulatory guidelines for cross-border merchant trade settlements. Funds are settled directly in NGN.
          </p>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrint}
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-semibold flex items-center justify-center gap-2 transition"
          >
            <Printer className="w-4 h-4" />
            <span>Print Receipt</span>
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Done</span>
          </button>
        </div>
      </div>
    </div>
  );
};
