import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { 
  FileText, 
  CheckCircle2, 
  Clock, 
  CreditCard, 
  DollarSign, 
  ShieldCheck, 
  Download, 
  ExternalLink, 
  ArrowRight, 
  Lock, 
  RefreshCw,
  Layers,
  Sparkles,
  Building2
} from 'lucide-react';
import { Invoice, SupportedCurrency } from '../types';

export const InvoicesView: React.FC = () => {
  const { 
    invoices, 
    activeInvoiceId, 
    currentUser, 
    refreshData 
  } = useApp();

  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState<SupportedCurrency>('NGN');
  const [exchangeRate, setExchangeRate] = useState<number>(1);
  const [isProcessingPayment, setIsProcessingPayment] = useState<boolean>(false);
  const [paymentSuccessData, setPaymentSuccessData] = useState<{ txRef: string; date: string } | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'unpaid' | 'paid'>('all');

  useEffect(() => {
    if (activeInvoiceId) {
      const inv = invoices.find(i => i.id === activeInvoiceId);
      if (inv) setSelectedInvoice(inv);
    } else if (!selectedInvoice && invoices.length > 0) {
      setSelectedInvoice(invoices[0]);
    }
  }, [activeInvoiceId, invoices, selectedInvoice]);

  // Fetch FX Rate when currency changes
  useEffect(() => {
    if (selectedCurrency === 'NGN') {
      setExchangeRate(1);
      return;
    }
    fetch('/api/fx/rates')
      .then(r => r.json())
      .then(data => {
        if (data.success && data.rates) {
          const rateObj = data.rates.find((r: any) => r.baseCurrency === selectedCurrency);
          if (rateObj) {
            setExchangeRate(rateObj.effectiveRate || rateObj.rate);
          }
        }
      })
      .catch(() => setExchangeRate(1520));
  }, [selectedCurrency]);

  const filteredInvoices = invoices.filter(inv => {
    if (filterStatus === 'unpaid') return inv.status === 'sent' || inv.status === 'viewed';
    if (filterStatus === 'paid') return inv.status === 'paid';
    return true;
  });

  const handlePayInvoice = async () => {
    if (!selectedInvoice) return;
    setIsProcessingPayment(true);

    try {
      const res = await fetch(`/api/invoices/${selectedInvoice.id}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentMethod: `${selectedCurrency} Checkout (${selectedCurrency === 'NGN' ? 'Flutterwave Card/Bank' : 'Multi-Currency Gateway'})`,
          customerEmail: selectedInvoice.customerEmail,
          provider: 'flutterwave'
        })
      });
      const data = await res.json();
      if (data.success && data.invoice) {
        setSelectedInvoice(data.invoice);
        setPaymentSuccessData({
          txRef: data.invoice.transactionRef || 'FLW_MOCK_SUCCESS',
          date: new Date().toLocaleString()
        });
        refreshData();
      }
    } catch (err) {
      console.error('Failed to process payment:', err);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const calculateForeignAmount = (ngnAmount: number) => {
    if (selectedCurrency === 'NGN') return ngnAmount;
    return (ngnAmount / exchangeRate).toFixed(2);
  };

  return (
    <div id="invoices-view" className="min-h-screen bg-slate-950 pb-24">
      
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-900 px-4 py-8 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <FileText className="w-6 h-6 text-emerald-400" />
              <span>Invoices & Secure Multi-Currency Settlement</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Pay verified Nigerian businesses in your local currency (USD, EUR, GBP, AED, CAD, NGN) with automated Flutterwave settlement.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filterStatus === 'all' ? 'bg-emerald-500 text-slate-950 shadow' : 'bg-slate-800 text-slate-400'
              }`}
            >
              All ({invoices.length})
            </button>
            <button
              onClick={() => setFilterStatus('unpaid')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filterStatus === 'unpaid' ? 'bg-emerald-500 text-slate-950 shadow' : 'bg-slate-800 text-slate-400'
              }`}
            >
              Pending Payment
            </button>
            <button
              onClick={() => setFilterStatus('paid')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filterStatus === 'paid' ? 'bg-emerald-500 text-slate-950 shadow' : 'bg-slate-800 text-slate-400'
              }`}
            >
              Paid Receipts
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Invoices List */}
          <div className="lg:col-span-4 space-y-3">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Available Invoices ({filteredInvoices.length})
            </h2>

            {filteredInvoices.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-xs text-slate-400">
                No invoices found in this view.
              </div>
            ) : (
              filteredInvoices.map(inv => {
                const isSelected = selectedInvoice?.id === inv.id;
                const isPaid = inv.status === 'paid';
                return (
                  <div
                    key={inv.id}
                    onClick={() => {
                      setSelectedInvoice(inv);
                      setPaymentSuccessData(null);
                    }}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all shadow-md ${
                      isSelected
                        ? 'bg-slate-900 border-emerald-500 shadow-emerald-500/10'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-400">{inv.invoiceNumber}</span>
                      {isPaid ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold flex items-center gap-1 border border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Paid
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold flex items-center gap-1 border border-amber-500/30">
                          <Clock className="w-3 h-3 text-amber-400" /> Pending
                        </span>
                      )}
                    </div>

                    <h4 className="text-sm font-bold text-white mt-1.5">{inv.businessName}</h4>
                    <p className="text-xs text-slate-400 truncate mt-0.5">{inv.description}</p>

                    <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between">
                      <span className="text-xs text-slate-500">Due: {inv.dueDate}</span>
                      <span className="text-sm font-black text-white">₦{inv.total.toLocaleString()}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Right Column: Invoice Details & Interactive Checkout */}
          <div className="lg:col-span-8">
            {selectedInvoice ? (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
                
                {/* Top Header of Invoice */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-black text-white">{selectedInvoice.businessName}</span>
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">Verified Merchant on Boost Market</p>
                  </div>

                  <div className="text-left sm:text-right">
                    <div className="text-xs font-bold text-slate-400">INVOICE NUMBER</div>
                    <div className="text-base font-black text-emerald-400">{selectedInvoice.invoiceNumber}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">Created: {new Date(selectedInvoice.createdAt).toLocaleDateString()}</div>
                  </div>
                </div>

                {/* Bill To Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-6 border-b border-slate-800 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Billed To Customer</span>
                    <p className="font-bold text-white text-sm">{selectedInvoice.customerName}</p>
                    <p className="text-slate-400">{selectedInvoice.customerEmail}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Payment Status</span>
                    {selectedInvoice.status === 'paid' ? (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>PAID IN FULL via {selectedInvoice.paymentMethod || 'Flutterwave'}</span>
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                        <Clock className="w-4 h-4 text-amber-400" />
                        <span>UNPAID • Due by {selectedInvoice.dueDate}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Items Table */}
                <div className="py-6 border-b border-slate-800">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-slate-400 border-b border-slate-800 pb-2">
                        <th className="pb-2 font-semibold">Item & Service Description</th>
                        <th className="pb-2 text-center font-semibold">Qty</th>
                        <th className="pb-2 text-right font-semibold">Unit Price</th>
                        <th className="pb-2 text-right font-semibold">Total Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {selectedInvoice.items.map((item, idx) => (
                        <tr key={idx} className="text-slate-200">
                          <td className="py-3 pr-2 font-medium">{item.description}</td>
                          <td className="py-3 text-center text-slate-400">{item.quantity}</td>
                          <td className="py-3 text-right">₦{item.unitPrice.toLocaleString()}</td>
                          <td className="py-3 text-right font-bold text-white">₦{item.amount.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Totals */}
                  <div className="mt-4 flex justify-end">
                    <div className="w-64 space-y-1.5 text-xs text-slate-300">
                      <div className="flex justify-between">
                        <span>Subtotal:</span>
                        <span className="font-semibold text-white">₦{selectedInvoice.subtotal.toLocaleString()}</span>
                      </div>
                      {selectedInvoice.taxAmount > 0 && (
                        <div className="flex justify-between">
                          <span>Tax ({selectedInvoice.taxPercent}%):</span>
                          <span>₦{selectedInvoice.taxAmount.toLocaleString()}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm font-black text-emerald-400 pt-2 border-t border-slate-800">
                        <span>Total Payable (NGN):</span>
                        <span>₦{selectedInvoice.total.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Multi-Currency Checkout Section */}
                {selectedInvoice.status !== 'paid' ? (
                  <div className="mt-6 p-6 rounded-2xl bg-slate-950 border border-slate-800">
                    <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-emerald-400" />
                      <span>Select Preferred Payment Currency</span>
                    </h3>
                    <p className="text-xs text-slate-400 mb-4">
                      Pay in USD, EUR, GBP, AED, or NGN. Settlement is instantly converted and credited to the merchant in Nigerian Naira.
                    </p>

                    {/* Currency Selector */}
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-4">
                      {(['NGN', 'USD', 'EUR', 'GBP', 'AED', 'CAD'] as SupportedCurrency[]).map((curr) => (
                        <button
                          key={curr}
                          onClick={() => setSelectedCurrency(curr)}
                          className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                            selectedCurrency === curr
                              ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow'
                              : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
                          }`}
                        >
                          {curr}
                        </button>
                      ))}
                    </div>

                    {/* Live FX Calculation Card */}
                    <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                      <div>
                        <span className="text-slate-400 block">Total Payable in {selectedCurrency}:</span>
                        <span className="text-xl font-black text-white">
                          {selectedCurrency === 'NGN' ? `₦${selectedInvoice.total.toLocaleString()}` : `${selectedCurrency} $${calculateForeignAmount(selectedInvoice.total)}`}
                        </span>
                      </div>
                      {selectedCurrency !== 'NGN' && (
                        <div className="text-slate-400 text-[11px] sm:text-right">
                          <span>Live Guaranteed Rate: </span>
                          <strong className="text-emerald-400">1 {selectedCurrency} = ₦{exchangeRate.toFixed(2)}</strong>
                        </div>
                      )}
                    </div>

                    {/* Pay Button */}
                    <button
                      onClick={handlePayInvoice}
                      disabled={isProcessingPayment}
                      className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-600 hover:from-emerald-400 hover:to-indigo-500 text-slate-950 font-black text-sm shadow-xl shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 hover:scale-101"
                    >
                      {isProcessingPayment ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Processing via Flutterwave Gateway...</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-4 h-4" />
                          <span>Pay {selectedCurrency === 'NGN' ? `₦${selectedInvoice.total.toLocaleString()}` : `${selectedCurrency} $${calculateForeignAmount(selectedInvoice.total)}`} Securely</span>
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  /* Paid Confirmation Receipt */
                  <div className="mt-6 p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center">
                    <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-2" />
                    <h3 className="text-base font-bold text-white">Payment Confirmed & Verified</h3>
                    <p className="text-xs text-slate-300 mt-1">
                      Transaction Ref: <span className="font-mono text-emerald-400 font-bold">{selectedInvoice.transactionRef || 'FLW_SETTLED_001'}</span>
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Paid on {selectedInvoice.paidAt ? new Date(selectedInvoice.paidAt).toLocaleString() : new Date().toLocaleString()}
                    </p>
                  </div>
                )}

              </div>
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center text-slate-400">
                Select an invoice to inspect details or complete checkout.
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};
