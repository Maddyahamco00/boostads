import React from 'react';
import { 
  CheckCircle2, 
  Printer, 
  X,
  Copy
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Payment } from '../types';

interface ReceiptModalProps {
  payment: Payment;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ payment, onClose }) => {
  React.useEffect(() => {
    try {
      confetti({
        particleCount: 50,
        spread: 60,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white border border-gray-200 rounded-xl max-w-md w-full p-5 sm:p-6 shadow-xl relative my-8 text-gray-900">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-400 hover:text-gray-700 flex items-center justify-center transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Success Icon */}
        <div className="text-center mb-4">
          <div className="w-12 h-12 rounded-full bg-green-50 border border-green-200 text-green-600 flex items-center justify-center mx-auto mb-2">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-gray-900">Payment Successful</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Settlement processed to merchant
          </p>
        </div>

        {/* Amount Badge */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4 text-center">
          <span className="text-[10px] uppercase tracking-wider text-gray-500 font-medium">Amount Paid</span>
          <div className="text-2xl font-bold text-gray-900 mt-0.5">
            {payment.customerCurrency} {payment.customerAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="mt-1 text-xs text-gray-600">
            <span>₦{payment.baseAmount.toLocaleString('en-NG')} NGN</span>
          </div>
        </div>

        {/* Detailed Breakdown */}
        <div className="space-y-2 bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs mb-4">
          <div className="flex justify-between items-center text-gray-600">
            <span>Reference:</span>
            <button
              onClick={copyRef}
              className="flex items-center gap-1 font-mono text-gray-900 hover:text-blue-600 transition-colors cursor-pointer"
            >
              <span>{payment.reference}</span>
              <Copy className="w-3 h-3 text-gray-400" />
              {copied && <span className="text-[10px] text-green-600">Copied</span>}
            </button>
          </div>

          <div className="flex justify-between items-center text-gray-600">
            <span>Merchant:</span>
            <span className="font-semibold text-gray-900">{payment.merchantName}</span>
          </div>

          <div className="flex justify-between items-center text-gray-600">
            <span>Customer:</span>
            <span className="text-gray-900">{payment.customerName}</span>
          </div>

          <div className="flex justify-between items-center text-gray-600">
            <span>Provider:</span>
            <span className="uppercase text-gray-900 font-semibold">{payment.paymentProvider}</span>
          </div>

          <div className="flex justify-between items-center text-gray-600">
            <span>Date:</span>
            <span className="text-gray-900">
              {new Date(payment.paidAt || payment.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="flex-1 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <span>Close</span>
          </button>
        </div>
      </div>
    </div>
  );
};
