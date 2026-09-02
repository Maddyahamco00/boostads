import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { 
  FileText, 
  CheckCircle2, 
  Clock, 
  CreditCard, 
  ShieldCheck, 
  Lock, 
  RefreshCw 
} from 'lucide-react';
import { Invoice, SupportedCurrency } from '../types';

export const InvoicesView: React.FC = () => {
  const { 
    invoices, 
    activeInvoiceId, 
    refreshData 
  } = useApp();

  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState<SupportedCurrency>('NGN');
  const [exchangeRate, setExchangeRate] = useState<number>(1);
  const [isProcessingPayment, setIsProcessingPayment] = useState<boolean>(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'unpaid' | 'paid'>('all');

  useEffect(() => {
    if (activeInvoiceId) {
      const inv = invoices.find(i => i.id === activeInvoiceId);
      if (inv) setSelectedInvoice(inv);
    } else if (!selectedInvoice && invoices.length > 0) {
      setSelectedInvoice(invoices[0]);
    }
  }, [activeInvoiceId, invoices, selectedInvoice]);

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
          paymentMethod: `${selectedCurrency} Checkout (${selectedCurrency === 'NGN' ? 'Card/Bank' : 'Gateway'})`,
          customerEmail: selectedInvoice.customerEmail,
          provider: 'flutterwave'
        })
      });
      const data = await res.json();
      if (data.success && data.invoice) {
        setSelectedInvoice(data.invoice);
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
    <div id="invoices-view" className="min-h-screen bg-gray-50 text-gray-900 pb-24">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-4 py-6 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              <span>Invoices</span>
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Review and settle merchant invoices in NGN or foreign currencies
            </p>
          </div>

          <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                filterStatus === 'all' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              All ({invoices.length})
            </button>
            <button
              onClick={() => setFilterStatus('unpaid')}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                filterStatus === 'unpaid' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Pending
            </button>
            <button
              onClick={() => setFilterStatus('paid')}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                filterStatus === 'paid' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Paid
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Invoices List */}
          <div className="lg:col-span-4 space-y-2">
            <div className="text-xs font-semibold text-gray-500 uppercase px-1">
              Invoices ({filteredInvoices.length})
            </div>

            {filteredInvoices.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-xl p-6 text-center text-xs text-gray-400">
                No invoices found.
              </div>
            ) : (
              filteredInvoices.map(inv => {
                const isSelected = selectedInvoice?.id === inv.id;
                const isPaid = inv.status === 'paid';
                return (
                  <div
                    key={inv.id}
                    onClick={() => setSelectedInvoice(inv)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-colors shadow-xs ${
                      isSelected
                        ? 'bg-blue-50/60 border-blue-500'
                        : 'bg-white border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-medium text-gray-500">{inv.invoiceNumber}</span>
                      {isPaid ? (
                        <span className="px-2 py-0.2 rounded text-[10px] font-medium bg-green-50 text-green-700 border border-green-200">
                          Paid
                        </span>
                      ) : (
                        <span className="px-2 py-0.2 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                          Pending
                        </span>
                      )}
                    </div>

                    <h2 className="text-xs font-semibold text-gray-900 mt-1">{inv.businessName}</h2>
                    <p className="text-[11px] text-gray-500 truncate">{inv.description}</p>

                    <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
                      <span className="text-[10px] text-gray-400">Due: {inv.dueDate}</span>
                      <span className="font-bold text-gray-900">₦{inv.total.toLocaleString()}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Right Column: Invoice Details */}
          <div className="lg:col-span-8">
            {selectedInvoice ? (
              <div className="bg-white border border-gray-200 rounded-xl p-5 sm:p-6 shadow-xs">
                
                {/* Top Header of Invoice */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h2 className="text-base font-bold text-gray-900">{selectedInvoice.businessName}</h2>
                      <ShieldCheck className="w-4 h-4 text-blue-600" />
                    </div>
                    <p className="text-xs text-gray-400">Verified Merchant</p>
                  </div>

                  <div className="sm:text-right">
                    <div className="text-xs text-gray-400">Invoice Number</div>
                    <div className="text-sm font-mono font-bold text-gray-900">{selectedInvoice.invoiceNumber}</div>
                    <div className="text-[11px] text-gray-400 mt-0.5">Date: {new Date(selectedInvoice.createdAt).toLocaleDateString()}</div>
                  </div>
                </div>

                {/* Bill To Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4 border-b border-gray-100 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-gray-400 block mb-0.5">Billed To</span>
                    <p className="font-semibold text-gray-900">{selectedInvoice.customerName}</p>
                    <p className="text-gray-500">{selectedInvoice.customerEmail}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-gray-400 block mb-0.5">Status</span>
                    {selectedInvoice.status === 'paid' ? (
                      <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Paid</span>
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Unpaid (Due: {selectedInvoice.dueDate})</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Items Table */}
                <div className="py-4 border-b border-gray-100">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-gray-400 border-b border-gray-100 pb-2">
                        <th className="pb-2 font-medium">Description</th>
                        <th className="pb-2 text-center font-medium">Qty</th>
                        <th className="pb-2 text-right font-medium">Price</th>
                        <th className="pb-2 text-right font-medium">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {selectedInvoice.items.map((item, idx) => (
                        <tr key={idx} className="text-gray-700">
                          <td className="py-2.5 pr-2 font-medium text-gray-900">{item.description}</td>
                          <td className="py-2.5 text-center text-gray-500">{item.quantity}</td>
                          <td className="py-2.5 text-right">₦{item.unitPrice.toLocaleString()}</td>
                          <td className="py-2.5 text-right font-semibold text-gray-900">₦{item.amount.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Totals */}
                  <div className="mt-3 flex justify-end">
                    <div className="w-56 space-y-1 text-xs text-gray-600">
                      <div className="flex justify-between">
                        <span>Subtotal:</span>
                        <span className="font-medium text-gray-900">₦{selectedInvoice.subtotal.toLocaleString()}</span>
                      </div>
                      {selectedInvoice.taxAmount > 0 && (
                        <div className="flex justify-between">
                          <span>Tax ({selectedInvoice.taxPercent}%):</span>
                          <span>₦{selectedInvoice.taxAmount.toLocaleString()}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm font-bold text-gray-900 pt-2 border-t border-gray-100">
                        <span>Total:</span>
                        <span>₦{selectedInvoice.total.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Payment Section */}
                {selectedInvoice.status !== 'paid' ? (
                  <div className="mt-5 p-4 rounded-xl bg-gray-50 border border-gray-200">
                    <h3 className="text-xs font-semibold text-gray-900 mb-2 flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4 text-blue-600" />
                      <span>Select Payment Currency</span>
                    </h3>

                    {/* Currency Selector */}
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 mb-3">
                      {(['NGN', 'USD', 'EUR', 'GBP', 'AED', 'CAD'] as SupportedCurrency[]).map((curr) => (
                        <button
                          key={curr}
                          onClick={() => setSelectedCurrency(curr)}
                          className={`py-1.5 px-2 rounded text-xs font-medium border transition-colors cursor-pointer ${
                            selectedCurrency === curr
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                          }`}
                        >
                          {curr}
                        </button>
                      ))}
                    </div>

                    <div className="p-3 rounded-lg bg-white border border-gray-200 mb-4 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-gray-400 block text-[11px]">Total in {selectedCurrency}:</span>
                        <span className="text-base font-bold text-gray-900">
                          {selectedCurrency === 'NGN' ? `₦${selectedInvoice.total.toLocaleString()}` : `${selectedCurrency} $${calculateForeignAmount(selectedInvoice.total)}`}
                        </span>
                      </div>
                      {selectedCurrency !== 'NGN' && (
                        <div className="text-gray-500 text-[11px] text-right">
                          <span>Rate: </span>
                          <strong className="text-gray-900">1 {selectedCurrency} = ₦{exchangeRate.toFixed(2)}</strong>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={handlePayInvoice}
                      disabled={isProcessingPayment}
                      className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {isProcessingPayment ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Processing...</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-3.5 h-3.5" />
                          <span>Pay {selectedCurrency === 'NGN' ? `₦${selectedInvoice.total.toLocaleString()}` : `${selectedCurrency} $${calculateForeignAmount(selectedInvoice.total)}`}</span>
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="mt-4 p-4 rounded-lg bg-green-50 border border-green-200 text-center">
                    <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto mb-1" />
                    <h3 className="text-xs font-bold text-green-900">Payment Settled</h3>
                    <p className="text-[11px] text-green-700 mt-0.5">
                      Ref: <span className="font-mono">{selectedInvoice.transactionRef || 'FLW_SETTLED'}</span>
                    </p>
                  </div>
                )}

              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-xl p-10 text-center text-xs text-gray-400">
                Select an invoice to view details.
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};
