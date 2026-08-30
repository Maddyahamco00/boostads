import React, { useState } from 'react';
import { X, Link2, Copy, CheckCircle2, ArrowRight, DollarSign, Building2 } from 'lucide-react';
import { SupportedCurrency } from '../types';

interface CreateInvoiceModalProps {
  onClose: () => void;
  onCreated: (invoice: { amountNGN: number; link: string; reference: string }) => void;
}

export const CreateInvoiceModal: React.FC<CreateInvoiceModalProps> = ({ onClose, onCreated }) => {
  const [amountNGN, setAmountNGN] = useState<number>(150000);
  const [customerEmail, setCustomerEmail] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [description, setDescription] = useState<string>('Software Engineering Retainer & Consulting');
  const [targetCurrency, setTargetCurrency] = useState<SupportedCurrency>('USD');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center">
            <Link2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Create Multi-Currency Payment Link</h3>
            <p className="text-xs text-slate-400">Generate a customer checkout link with locked NGN settlement</p>
          </div>
        </div>

        {createdResult ? (
          <div className="space-y-5">
            <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-800/50 text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-white">Payment Link Ready</h4>
              <p className="text-xs text-slate-400">
                Settling to merchant as <strong>₦{amountNGN.toLocaleString('en-NG')} NGN</strong>
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-medium text-slate-300">Sharable Checkout URL</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={createdResult.link}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-300 font-mono focus:outline-none"
                />
                <button
                  type="button"
                  onClick={copyLink}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition flex items-center gap-1.5 shrink-0"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copied ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Invoice Amount (Nigerian Naira Settlement)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-emerald-400 font-bold">
                  ₦
                </div>
                <input
                  type="number"
                  required
                  min="1000"
                  step="1000"
                  value={amountNGN}
                  onChange={(e) => setAmountNGN(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded-xl pl-8 pr-3.5 py-2.5 text-sm font-bold text-white focus:outline-none"
                  placeholder="150,000"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Customer / Client Email</label>
              <input
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none"
                placeholder="client@internationalcorp.com"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Customer Name / Company</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none"
                placeholder="Acme Global Solutions LLC"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Invoice Description / Memo</label>
              <input
                type="text"
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none"
                placeholder="Services rendered"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2"
              >
                <span>Generate Payment Link</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
