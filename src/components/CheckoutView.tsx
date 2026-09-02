import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  ArrowRight, 
  ShieldCheck, 
  Clock, 
  RefreshCw, 
  AlertCircle, 
  Lock, 
  Sparkles,
  Zap,
  Building2
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
  const [timeLeft, setTimeLeft] = useState<number>(600);

  // Customer information
  const [customerEmail, setCustomerEmail] = useState<string>('david.smith@example.com');
  const [customerName, setCustomerName] = useState<string>('David Smith');
  const [customerCountry] = useState<string>('United States');
  const [description] = useState<string>('Services Retainer');

  // Payment method & card details
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('card');
  const [cardNumber, setCardNumber] = useState<string>('4000 0000 0000 4242');
  const [cardExpiry, setCardExpiry] = useState<string>('12/28');
  const [cardCvv, setCardCvv] = useState<string>('888');

  // Processing states
  const [processing, setProcessing] = useState<boolean>(false);
  const [paymentError, setPaymentError] = useState<string>('');
  const [currentPayment, setCurrentPayment] = useState<Payment | null>(null);
  const [show3DSModal, setShow3DSModal] = useState<boolean>(false);
  const [showReceiptModal, setShowReceiptModal] = useState<boolean>(false);

  // Fetch / Refresh Quote
  const fetchQuote = async (targetCurr: SupportedCurrency, amountNGN: number) => {
    setLoadingQuote(true);
    setPaymentError('');
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
        setTimeLeft(600);
      }
    } catch (err: unknown) {
      console.error('Error getting quote:', err);
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

  const setAmountPreset = (amt: number) => {
    setBaseAmountNGN(amt);
    fetchQuote(selectedCurrency, amt);
  };

  const autofillCard = (type: 'success' | 'decline' | '3ds') => {
    if (type === 'success') {
      setCardNumber('4000 0000 0000 4242');
      setCardExpiry('12/28');
      setCardCvv('888');
    } else if (type === 'decline') {
      setCardNumber('4000 0000 0000 0002');
      setCardExpiry('08/27');
      setCardCvv('111');
    } else if (type === '3ds') {
      setCardNumber('4000 0000 0000 0003');
      setCardExpiry('11/29');
      setCardCvv('333');
    }
  };

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quote) return;
    if (timeLeft === 0) {
      setPaymentError('The FX quote has expired. Please refresh the rate.');
      return;
    }

    setProcessing(true);
    setPaymentError('');

    try {
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
        throw new Error(createData.error || 'Failed to create payment');
      }

      const payment = createData.payment as Payment;
      setCurrentPayment(payment);

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
        throw new Error(attemptData.message || 'Payment declined');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setPaymentError(message);
      setProcessing(false);
    }
  };

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
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 text-gray-900">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Form (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Step 1: Base Amount */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                1. Invoice Amount (NGN)
              </span>
            </div>

            <div className="space-y-2.5">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-base font-bold text-gray-400">
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
                  className="w-full bg-white border border-gray-200 focus:border-blue-600 rounded-lg pl-8 pr-3 py-2 text-xl font-bold text-gray-900 focus:outline-none"
                  placeholder="100,000"
                />
              </div>

              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {[50000, 100000, 250000, 500000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setAmountPreset(amt)}
                    className={`px-2 py-1 text-xs rounded-md transition-colors font-medium cursor-pointer ${
                      baseAmountNGN === amt
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                    }`}
                  >
                    ₦{amt.toLocaleString('en-NG')}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Step 2: Currency */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                2. Payment Currency
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {currencies.filter(c => c.enabled).map((curr) => {
                const isSelected = selectedCurrency === curr.code;
                return (
                  <button
                    key={curr.code}
                    type="button"
                    onClick={() => setSelectedCurrency(curr.code)}
                    className={`p-2.5 rounded-lg border text-left transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50/60 border-blue-600'
                        : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-base">{curr.flag}</span>
                      <span className={`text-[10px] font-bold px-1 py-0.2 rounded ${
                        isSelected ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {curr.code}
                      </span>
                    </div>
                    <div className="text-xs font-medium text-gray-900">{curr.name.split(' ')[0]}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 3: Payment Details */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                3. Payment Details
              </span>

              <div className="flex items-center gap-1">
                <span className="text-[10px] text-gray-400 font-medium flex items-center gap-0.5">
                  <Zap className="w-3 h-3" /> Test:
                </span>
                <button
                  type="button"
                  onClick={() => autofillCard('success')}
                  className="px-1.5 py-0.5 text-[10px] bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors cursor-pointer"
                >
                  Success
                </button>
                <button
                  type="button"
                  onClick={() => autofillCard('3ds')}
                  className="px-1.5 py-0.5 text-[10px] bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors cursor-pointer"
                >
                  3DS
                </button>
              </div>
            </div>

            <form onSubmit={handlePay} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full bg-white border border-gray-200 focus:border-blue-600 rounded-lg px-2.5 py-1.5 text-xs text-gray-900 focus:outline-none"
                    placeholder="David Smith"
                  />
                </div>
                <div>
                  <label className="block font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="w-full bg-white border border-gray-200 focus:border-blue-600 rounded-lg px-2.5 py-1.5 text-xs text-gray-900 focus:outline-none"
                    placeholder="david@example.com"
                  />
                </div>
              </div>

              {/* Card Inputs */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2.5">
                <div>
                  <label className="block text-[11px] font-medium text-gray-600 mb-1">Card Number</label>
                  <input
                    type="text"
                    required
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    className="w-full bg-white border border-gray-200 focus:border-blue-600 rounded-lg px-2.5 py-1.5 font-mono text-xs text-gray-900 focus:outline-none"
                    placeholder="•••• •••• •••• ••••"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-medium text-gray-600 mb-1">Expiration</label>
                    <input
                      type="text"
                      required
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value)}
                      className="w-full bg-white border border-gray-200 focus:border-blue-600 rounded-lg px-2.5 py-1.5 text-xs font-mono text-gray-900 focus:outline-none"
                      placeholder="MM/YY"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-gray-600 mb-1">CVV</label>
                    <input
                      type="text"
                      required
                      maxLength={4}
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value)}
                      className="w-full bg-white border border-gray-200 focus:border-blue-600 rounded-lg px-2.5 py-1.5 text-xs font-mono text-gray-900 focus:outline-none"
                      placeholder="•••"
                    />
                  </div>
                </div>
              </div>

              {paymentError && (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{paymentError}</span>
                </div>
              )}

              <button
                id="submit-payment-btn"
                type="submit"
                disabled={processing || loadingQuote || !quote || timeLeft === 0}
                className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {processing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    <span>
                      Pay {quote ? `${quote.customerCurrency} ${quote.customerAmount.toFixed(2)}` : '...'}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-3 text-[10px] text-gray-400 pt-1">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-blue-600" />
                  256-Bit SSL Encrypted
                </span>
                <span>•</span>
                <span>PCI-DSS Compliant</span>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: FX Quote (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1">
                Live FX Quote
              </span>
              <button
                type="button"
                onClick={() => fetchQuote(selectedCurrency, baseAmountNGN)}
                disabled={loadingQuote}
                className="flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${loadingQuote ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4 text-center">
              <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">
                Total Payable
              </span>
              <div className="text-2xl font-bold text-gray-900 mt-0.5">
                {quote ? (
                  <span>
                    {currentCurrencyConfig?.symbol || quote.customerCurrency} {quote.customerAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                ) : (
                  <span className="text-gray-400">...</span>
                )}
              </div>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Settles to merchant as <strong>₦{baseAmountNGN.toLocaleString('en-NG')} NGN</strong>
              </p>
            </div>

            <div className="space-y-1 mb-4">
              <div className="flex justify-between text-[11px]">
                <span className="text-gray-500 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Rate Lock:
                </span>
                <span className={`font-mono font-medium ${timeLeft < 60 ? 'text-rose-600' : 'text-gray-900'}`}>
                  {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                </span>
              </div>
              <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-1000 ${
                    timeLeft < 60 ? 'bg-rose-500' : 'bg-blue-600'
                  }`}
                  style={{ width: `${(timeLeft / 600) * 100}%` }}
                />
              </div>
            </div>

            <div className="space-y-2 text-xs border-t border-gray-100 pt-3">
              <div className="flex justify-between text-gray-500">
                <span>Base Settlement:</span>
                <span className="text-gray-900 font-medium">₦{baseAmountNGN.toLocaleString('en-NG')}</span>
              </div>

              <div className="flex justify-between text-gray-500">
                <span>Exchange Rate:</span>
                <span className="text-gray-900 font-medium">
                  1 {selectedCurrency} = ₦{quote ? quote.exchangeRate.toFixed(2) : '...'}
                </span>
              </div>

              <div className="flex justify-between text-gray-500">
                <span>Platform Fee (1.5%):</span>
                <span className="text-gray-900">
                  {selectedCurrency} {quote ? quote.platformFeeAmount.toFixed(2) : '0.00'}
                </span>
              </div>

              <div className="flex justify-between text-gray-900 font-semibold border-t border-gray-100 pt-2">
                <span>Net to Merchant:</span>
                <span className="font-bold">
                  ₦{baseAmountNGN.toLocaleString('en-NG')} NGN
                </span>
              </div>
            </div>
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
