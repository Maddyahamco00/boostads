import React, { useState, useEffect, useRef } from 'react';
import { 
  CreditCard, 
  ArrowRight, 
  ShieldCheck, 
  Clock, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Info, 
  Lock, 
  ChevronDown,
  Sparkles,
  Zap,
  Building2,
  HelpCircle,
  Globe
} from 'lucide-react';
import { 
  CurrencyConfig, 
  PaymentQuote, 
  Payment, 
  SupportedCurrency, 
  PaymentMethodType 
} from '../types';
import { ThreeDSChallengeModal } from './ThreeDSChallengeModal';
import { ReceiptModal } from './ReceiptModal';

interface CheckoutViewProps {
  currencies: CurrencyConfig[];
  onPaymentSuccess?: (payment: Payment) => void;
}

export const CheckoutView: React.FC<CheckoutViewProps> = ({ currencies, onPaymentSuccess }) => {
  // Financial parameters
  const [baseAmountNGN, setBaseAmountNGN] = useState<number>(100000);
  const [selectedCurrency, setSelectedCurrency] = useState<SupportedCurrency>('USD');
  const [quote, setQuote] = useState<PaymentQuote | null>(null);
  const [loadingQuote, setLoadingQuote] = useState<boolean>(false);
  const [quoteError, setQuoteError] = useState<string>('');
  const [timeLeft, setTimeLeft] = useState<number>(600);

  // Customer information
  const [customerEmail, setCustomerEmail] = useState<string>('david.smith@globalenterprise.com');
  const [customerName, setCustomerName] = useState<string>('David Smith');
  const [customerCountry, setCustomerCountry] = useState<string>('United States');
  const [description, setDescription] = useState<string>('B2B Software Development & Engineering Retainer');

  // Payment method & card details
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('card');
  const [cardNumber, setCardNumber] = useState<string>('4000 0000 0000 4242');
  const [cardExpiry, setCardExpiry] = useState<string>('12/28');
  const [cardCvv, setCardCvv] = useState<string>('888');
  const [cardHolder, setCardHolder] = useState<string>('DAVID SMITH');

  // Processing states
  const [processing, setProcessing] = useState<boolean>(false);
  const [paymentError, setPaymentError] = useState<string>('');
  const [currentPayment, setCurrentPayment] = useState<Payment | null>(null);
  const [show3DSModal, setShow3DSModal] = useState<boolean>(false);
  const [showReceiptModal, setShowReceiptModal] = useState<boolean>(false);

  // Fetch / Refresh Quote
  const fetchQuote = async (targetCurr: SupportedCurrency, amountNGN: number) => {
    setLoadingQuote(true);
    setQuoteError('');
    try {
      const res = await fetch('/api/payments/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseAmountNGN: amountNGN,
          customerCurrency: targetCurr
        })
      });
      const data = await res.json();
      if (data.success && data.quote) {
        setQuote(data.quote);
        setTimeLeft(600); // 10 minutes lock
      } else {
        setQuoteError(data.error || 'Failed to retrieve live FX quote');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setQuoteError(`Network error getting FX rate: ${message}`);
    } finally {
      setLoadingQuote(false);
    }
  };

  useEffect(() => {
    fetchQuote(selectedCurrency, baseAmountNGN);
  }, [selectedCurrency]);

  // Quote Countdown Timer
  useEffect(() => {
    if (!quote) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [quote]);

  // Quick Amount preset buttons
  const setAmountPreset = (amt: number) => {
    setBaseAmountNGN(amt);
    fetchQuote(selectedCurrency, amt);
  };

  // Card Autofill Presets
  const autofillCard = (type: 'success' | 'decline' | '3ds') => {
    if (type === 'success') {
      setCardNumber('4000 0000 0000 4242');
      setCardExpiry('12/28');
      setCardCvv('888');
      setCardHolder('DAVID SMITH');
    } else if (type === 'decline') {
      setCardNumber('4000 0000 0000 0002');
      setCardExpiry('08/27');
      setCardCvv('111');
      setCardHolder('TEST DECLINE');
    } else if (type === '3ds') {
      setCardNumber('4000 0000 0000 0003');
      setCardExpiry('11/29');
      setCardCvv('333');
      setCardHolder('SECURE 3DS USER');
    }
  };

  // Execute Payment
  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quote) return;
    if (timeLeft === 0) {
      setPaymentError('The FX quote has expired. Please click "Refresh Quote" to lock the newest rate.');
      return;
    }

    setProcessing(true);
    setPaymentError('');

    try {
      // 1. Create Payment Intent
      const createRes = await fetch('/api/payments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quoteId: quote.quoteId,
          customerEmail,
          customerName,
          customerCountry,
          paymentMethod,
          description
        })
      });

      const createData = await createRes.json();
      if (!createData.success || !createData.payment) {
        throw new Error(createData.error || 'Failed to create payment intent');
      }

      const payment = createData.payment as Payment;
      setCurrentPayment(payment);

      // 2. Process payment attempt with provider
      const attemptRes = await fetch('/api/payments/process-attempt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reference: payment.reference,
          paymentDetails: {
            cardNumber: cardNumber.replace(/\s+/g, ''),
            expiryMonth: cardExpiry.split('/')[0],
            expiryYear: cardExpiry.split('/')[1],
            cvv: cardCvv
          }
        })
      });

      const attemptData = await attemptRes.json();

      if (attemptData.requires3DS) {
        setProcessing(false);
        setShow3DSModal(true);
        return;
      }

      if (attemptData.success) {
        setProcessing(false);
        const updatedPayment = attemptData.payment || payment;
        setCurrentPayment(updatedPayment);
        setShowReceiptModal(true);
        if (onPaymentSuccess) onPaymentSuccess(updatedPayment);
      } else {
        throw new Error(attemptData.message || 'Payment attempt declined by provider');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setPaymentError(message);
      setProcessing(false);
    }
  };

  // 3DS Callback
  const handle3DSComplete = (success: boolean) => {
    setShow3DSModal(false);
    if (success && currentPayment) {
      currentPayment.status = 'successful';
      currentPayment.paidAt = new Date().toISOString();
      setShowReceiptModal(true);
      if (onPaymentSuccess) onPaymentSuccess(currentPayment);
    } else {
      setPaymentError('3D-Secure authentication was not approved.');
    }
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const currentCurrencyConfig = currencies.find((c) => c.code === selectedCurrency);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Top Banner explaining the product model */}
      <div className="mb-8 p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">Cross-Border Merchant Checkout & NGN Corporate Settlement</h2>
            <p className="text-xs text-slate-400">
              International customers pay in foreign currency ({selectedCurrency}); Nigerian merchant receives exact settled Naira (₦{baseAmountNGN.toLocaleString('en-NG')} NGN).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-mono">
            Provider: Flutterwave / Paystack
          </span>
          <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
            CBN Compliant
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Checkout Inputs & Payment Form (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Step 1: Base Amount in NGN */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[11px] font-bold">1</span>
                Invoice Amount (Nigerian Naira Base)
              </span>
              <span className="text-[11px] text-slate-400">Target Merchant Settlement</span>
            </div>

            <div className="space-y-3">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-xl font-bold text-emerald-400">
                  ₦
                </div>
                <input
                  id="base-amount-input"
                  type="number"
                  min="1000"
                  max="10000000"
                  step="1000"
                  value={baseAmountNGN}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setBaseAmountNGN(val);
                    fetchQuote(selectedCurrency, val);
                  }}
                  className="w-full bg-slate-950 border border-slate-700/80 focus:border-emerald-500 rounded-2xl pl-10 pr-4 py-3.5 text-2xl font-extrabold text-white tracking-tight focus:outline-none transition"
                  placeholder="100,000"
                />
              </div>

              {/* Quick Presets */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-[11px] text-slate-400">Quick presets:</span>
                {[50000, 100000, 250000, 500000, 1000000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setAmountPreset(amt)}
                    className={`px-2.5 py-1 text-xs rounded-lg transition font-medium ${
                      baseAmountNGN === amt
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    }`}
                  >
                    ₦{amt.toLocaleString('en-NG')}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Step 2: Customer Preferred Foreign Currency */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[11px] font-bold">2</span>
                Customer Payment Currency
              </span>
              <span className="text-[11px] text-slate-400">Select preferred currency</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {currencies.filter(c => c.enabled).map((curr) => {
                const isSelected = selectedCurrency === curr.code;
                return (
                  <button
                    key={curr.code}
                    type="button"
                    onClick={() => setSelectedCurrency(curr.code)}
                    className={`p-3 rounded-2xl border text-left transition relative flex flex-col justify-between ${
                      isSelected
                        ? 'bg-gradient-to-b from-indigo-950/80 to-slate-900 border-indigo-500 ring-2 ring-indigo-500/30'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xl">{curr.flag}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        isSelected ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {curr.code}
                      </span>
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-200">{curr.name.split(' ')[0]}</div>
                      <div className="text-[10px] text-slate-400">{curr.symbol}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 3: Payment Details & Card Form */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[11px] font-bold">3</span>
                Billing & Payment Method
              </span>

              {/* Sandbox Card Autofill Selector */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-amber-400 font-semibold flex items-center gap-1">
                  <Zap className="w-3 h-3" /> Test Cards:
                </span>
                <button
                  type="button"
                  onClick={() => autofillCard('success')}
                  className="px-2 py-0.5 text-[10px] bg-emerald-950/80 border border-emerald-700/50 text-emerald-300 rounded hover:bg-emerald-900 transition"
                  title="Card ending in 4242 (Successful Authorization)"
                >
                  4242 (Success)
                </button>
                <button
                  type="button"
                  onClick={() => autofillCard('3ds')}
                  className="px-2 py-0.5 text-[10px] bg-indigo-950/80 border border-indigo-700/50 text-indigo-300 rounded hover:bg-indigo-900 transition"
                  title="Card ending in 0003 (3DS OTP Challenge)"
                >
                  0003 (3DS)
                </button>
                <button
                  type="button"
                  onClick={() => autofillCard('decline')}
                  className="px-2 py-0.5 text-[10px] bg-rose-950/80 border border-rose-700/50 text-rose-300 rounded hover:bg-rose-900 transition"
                  title="Card ending in 0002 (Insufficient funds decline)"
                >
                  0002 (Decline)
                </button>
              </div>
            </div>

            <form onSubmit={handlePay} className="space-y-4">
              {/* Customer Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Customer Full Name</label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none"
                    placeholder="Jane Doe"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Customer Email</label>
                  <input
                    type="email"
                    required
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none"
                    placeholder="jane@company.com"
                  />
                </div>
              </div>

              {/* Payment Method Selector */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Payment Method</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('card')}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition ${
                      paymentMethod === 'card'
                        ? 'bg-indigo-600 border-indigo-400 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Credit/Debit Card</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('apple_pay')}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition ${
                      paymentMethod === 'apple_pay'
                        ? 'bg-indigo-600 border-indigo-400 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Apple / Google Pay</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('bank_transfer')}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition ${
                      paymentMethod === 'bank_transfer'
                        ? 'bg-indigo-600 border-indigo-400 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Bank Wire / SEPA</span>
                  </button>
                </div>
              </div>

              {/* Card Inputs */}
              {paymentMethod === 'card' && (
                <div className="bg-slate-950/70 border border-slate-800/90 rounded-2xl p-4 space-y-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">Card Number</label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 font-mono text-sm text-white placeholder-slate-600 focus:outline-none"
                        placeholder="•••• •••• •••• ••••"
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center gap-1.5 pointer-events-none">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-bold">VISA</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-bold">MC</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">Expiration</label>
                      <input
                        type="text"
                        required
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 focus:border-indigo-500 rounded-xl px-3.5 py-2 text-xs font-mono text-white placeholder-slate-600 focus:outline-none"
                        placeholder="MM/YY"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">CVV / CVC</label>
                      <input
                        type="text"
                        required
                        maxLength={4}
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 focus:border-indigo-500 rounded-xl px-3.5 py-2 text-xs font-mono text-white placeholder-slate-600 focus:outline-none"
                        placeholder="•••"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Error Box */}
              {paymentError && (
                <div className="p-3.5 rounded-xl bg-rose-950/50 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{paymentError}</span>
                </div>
              )}

              {/* Submit Pay Button */}
              <button
                id="submit-payment-btn"
                type="submit"
                disabled={processing || loadingQuote || !quote || timeLeft === 0}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-emerald-600/25 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processing ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Authorizing Payment with Gateway...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>
                      Authorize & Pay {quote ? `${quote.customerCurrency} ${quote.customerAmount.toFixed(2)}` : '...'}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-4 text-[11px] text-slate-400 pt-1">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  256-Bit SSL Encrypted
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-indigo-400" />
                  PCI-DSS Level 1 Gateway
                </span>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: Live FX Breakdown & Quote Rate Lock (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Rate Lock Timer & Live Quote Summary */}
          <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
            {/* Background Glow */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                Live Guaranteed FX Quote
              </span>
              <button
                type="button"
                onClick={() => fetchQuote(selectedCurrency, baseAmountNGN)}
                disabled={loadingQuote}
                className="flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 transition"
              >
                <RefreshCw className={`w-3 h-3 ${loadingQuote ? 'animate-spin' : ''}`} />
                <span>Refresh Rate</span>
              </button>
            </div>

            {/* Total Payable Box */}
            <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-5 mb-5 text-center">
              <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                Customer Total Payable
              </span>
              <div className="text-4xl font-extrabold text-white mt-1 tracking-tight">
                {quote ? (
                  <span>
                    <span className="text-emerald-400 mr-1">{currentCurrencyConfig?.symbol || quote.customerCurrency}</span>
                    {quote.customerAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                ) : (
                  <span className="text-slate-600">Calculating...</span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Settling to merchant as exactly <strong className="text-emerald-300 font-mono">₦{baseAmountNGN.toLocaleString('en-NG')} NGN</strong>
              </p>
            </div>

            {/* Quote Lock Countdown Bar */}
            <div className="space-y-1.5 mb-6">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  Rate Lock Guarantee:
                </span>
                <span className={`font-mono font-bold ${timeLeft < 60 ? 'text-rose-400 animate-pulse' : 'text-emerald-400'}`}>
                  {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-1000 ${
                    timeLeft < 60 ? 'bg-rose-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${(timeLeft / 600) * 100}%` }}
                ></div>
              </div>
            </div>

            {/* Comprehensive Financial Transparency Breakdown */}
            <div className="space-y-3 text-xs border-t border-slate-800 pt-4">
              <div className="flex justify-between items-center text-slate-400">
                <span>Base Merchant Settlement:</span>
                <span className="text-slate-200 font-mono font-medium">₦{baseAmountNGN.toLocaleString('en-NG')} NGN</span>
              </div>

              <div className="flex justify-between items-center text-slate-400">
                <span>Locked Exchange Rate:</span>
                <span className="text-emerald-300 font-mono font-semibold">
                  1 {selectedCurrency} = ₦{quote ? quote.exchangeRate.toFixed(2) : '...'} NGN
                </span>
              </div>

              <div className="flex justify-between items-center text-slate-400">
                <span>FX Provider Source:</span>
                <span className="text-slate-300 font-medium capitalize">
                  {quote ? quote.rateSource.replace(/_/g, ' ') : 'Flutterwave FX API'}
                </span>
              </div>

              <div className="flex justify-between items-center text-slate-400">
                <span>Platform Processing Fee (1.5%):</span>
                <span className="text-slate-300 font-mono">
                  {selectedCurrency} {quote ? quote.platformFeeAmount.toFixed(2) : '0.00'}
                </span>
              </div>

              <div className="flex justify-between items-center text-slate-400">
                <span>International Gateway Buffer:</span>
                <span className="text-slate-300 font-mono">
                  {selectedCurrency} {quote ? quote.providerProcessingFee.toFixed(2) : '0.00'}
                </span>
              </div>

              <div className="flex justify-between items-center text-slate-200 font-semibold border-t border-slate-800 pt-2.5">
                <span>Net Credited to Nigerian Bank:</span>
                <span className="text-emerald-400 font-mono text-sm">
                  ₦{baseAmountNGN.toLocaleString('en-NG')} NGN
                </span>
              </div>
            </div>

            {/* Quote Cryptographic Token */}
            {quote && (
              <div className="mt-5 pt-4 border-t border-slate-800/80 text-[10px] text-slate-400 font-mono break-all bg-slate-950/60 p-3 rounded-xl">
                <div className="text-slate-400 font-bold mb-1 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-emerald-400" />
                  Cryptographic Quote Hash (HMAC-SHA256):
                </div>
                <div className="text-slate-400 leading-relaxed">{quote.signature.substring(0, 32)}...</div>
              </div>
            )}
          </div>

          {/* Compliance & Regulatory Clarification Card */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-5 text-xs text-slate-400 space-y-2.5">
            <div className="flex items-center gap-2 text-slate-200 font-bold text-xs">
              <Building2 className="w-4 h-4 text-emerald-400" />
              <span>Merchant Settlement Model</span>
            </div>
            <p className="leading-relaxed">
              This platform operates strictly as a commercial merchant acquiring and payment processor for goods and services rendered by Nigerian enterprises. Settlements are disbursed directly into the merchant’s corporate bank account in Nigerian Naira.
            </p>
          </div>
        </div>
      </div>

      {/* 3DS Modal */}
      {show3DSModal && currentPayment && (
        <ThreeDSChallengeModal
          payment={currentPayment}
          onComplete={handle3DSComplete}
          onClose={() => setShow3DSModal(false)}
        />
      )}

      {/* Receipt Modal */}
      {showReceiptModal && currentPayment && (
        <ReceiptModal
          payment={currentPayment}
          onClose={() => setShowReceiptModal(false)}
        />
      )}
    </div>
  );
};
