import React, { useState } from 'react';
import { X, Link2, Copy, CheckCircle2, ArrowRight } from 'lucide-react';
import { SupportedCurrency } from '../types';

interface CreateInvoiceModalProps {
  onClose: () => void;
  onCreated: (invoice: { amountNGN: number; link: string; reference: string }) => void;
}

export const CreateInvoiceModal: React.FC<CreateInvoiceModalProps> = ({ onClose, onCreated }) => {
  const [amountNGN, setAmountNGN] = useState<number>(150000);
  const [customerEmail, setCustomerEmail] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [description, setDescription] = useState<string>('Software Consulting & Services');
  const [targetCurrency] = useState<SupportedCurrency>('USD');
  const [loading, setLoading] = useState<boolean>(false);
  const [createdResult, setCreatedResult] = useState<{ link: string; reference: string } | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/merchant/invoices/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountNGN,
          customerEmail: customerEmail || 'client@global.com',
          customerName: customerName || 'International Client',
          description,
          targetCurrency
        })
      });

      const data = await res.json();
      if (data.success && data.payment) {
        const link = `${window.location.origin}/checkout?ref=${data.payment.reference}`;
        setCreatedResult({
          link,
          reference: data.payment.reference
        });
        onCreated({
          amountNGN,
          link,
          reference: data.payment.reference
        });
      }
    } catch (err) {
      console.error('Invoice creation error:', err);
    } finally {
      setLoading(false);
    }
  };

  const copyLink = () => {
    if (createdResult) {
      navigator.clipboard.writeText(createdResult.link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white border border-gray-200 rounded-xl max-w-md w-full p-5 sm:p-6 shadow-xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-400 hover:text-gray-700 flex items-center justify-center transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <Link2 className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-gray-900">Create Payment Link</h2>
            <p className="text-xs text-gray-500">Generate a customer checkout link</p>
          </div>
        </div>

        {createdResult ? (
          <div className="space-y-4 text-xs">
            <div className="p-3.5 rounded-lg bg-green-50 border border-green-200 text-center space-y-1">
              <CheckCircle2 className="w-6 h-6 text-green-600 mx-auto" />
              <h4 className="text-xs font-bold text-green-900">Payment Link Created</h4>
              <p className="text-xs text-green-700">
                Settling as <strong>₦{amountNGN.toLocaleString('en-NG')}</strong>
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Checkout URL</label>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  readOnly
                  value={createdResult.link}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-700 font-mono focus:outline-none"
                />
                <button
                  type="button"
                  onClick={copyLink}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3 text-xs">
            <div>
              <label className="block text-gray-700 font-medium mb-1">
                Amount (NGN)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-gray-500 font-bold">
                  ₦
                </div>
                <input
                  type="number"
                  required
                  min="1000"
                  step="1000"
                  value={amountNGN}
                  onChange={(e) => setAmountNGN(Number(e.target.value))}
                  className="w-full bg-white border border-gray-200 rounded-lg pl-7 pr-3 py-2 text-xs font-semibold text-gray-900 focus:outline-none focus:border-blue-600"
                  placeholder="150,000"
                />
              </div>
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-1">Customer Email</label>
              <input
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-600"
                placeholder="client@example.com"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-1">Customer Name</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-600"
                placeholder="Acme Inc."
              />
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-1">Description</label>
              <input
                type="text"
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-600"
                placeholder="Services rendered"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Generate Link</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
