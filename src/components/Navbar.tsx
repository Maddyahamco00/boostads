import React from 'react';
import { 
  CreditCard, 
  Building2, 
  ShieldCheck, 
  TestTube2, 
  ArrowRightLeft, 
  Activity, 
  CheckCircle2,
  Lock,
  Globe
} from 'lucide-react';
import { FXRate, SupportedCurrency } from '../types';

interface NavbarProps {
  activeTab: 'checkout' | 'merchant' | 'admin' | 'tests';
  setActiveTab: (tab: 'checkout' | 'merchant' | 'admin' | 'tests') => void;
  rates: FXRate[];
  primaryProvider: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  rates,
  primaryProvider
}) => {
  const getRateFor = (curr: SupportedCurrency) => {
    const r = rates.find((rate) => rate.baseCurrency === curr);
    return r ? r.effectiveRate.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 2 }) : '...';
  };

  return (
    <header id="app-header" className="border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md sticky top-0 z-50">
      {/* Top FX Ticker & System Status Bar */}
      <div className="border-b border-slate-800/50 px-4 py-1.5 bg-slate-900/60 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4 overflow-x-auto py-0.5 no-scrollbar">
            <span className="flex items-center gap-1.5 text-emerald-400 font-medium shrink-0">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Live FX Feeds (to NGN):
            </span>
            <div className="flex items-center gap-4 shrink-0 font-mono text-[11px]">
              <span className="text-slate-300 flex items-center gap-1">
                <span>🇺🇸 USD:</span> <strong className="text-emerald-300">₦{getRateFor('USD')}</strong>
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-slate-300 flex items-center gap-1">
                <span>🇪🇺 EUR:</span> <strong className="text-emerald-300">₦{getRateFor('EUR')}</strong>
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-slate-300 flex items-center gap-1">
                <span>🇬🇧 GBP:</span> <strong className="text-emerald-300">₦{getRateFor('GBP')}</strong>
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-slate-300 flex items-center gap-1">
                <span>🇦🇪 AED:</span> <strong className="text-emerald-300">₦{getRateFor('AED')}</strong>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-[11px] shrink-0">
            <div className="flex items-center gap-1.5 text-slate-300">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Primary Gateway:</span>
              <span className="px-1.5 py-0.5 rounded bg-indigo-950/80 border border-indigo-700/50 text-indigo-300 uppercase font-semibold text-[10px]">
                {primaryProvider}
              </span>
            </div>
            <span className="text-slate-700">|</span>
            <div className="flex items-center gap-1 text-slate-300">
              <Building2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Settlement:</span>
              <span className="text-emerald-400 font-medium">Zenith Bank (NGN)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Header Nav */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 ring-1 ring-emerald-400/30">
            <ArrowRightLeft className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-white tracking-tight">NairaSettled</h1>
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full">
                NGN Settlement
              </span>
            </div>
            <p className="text-xs text-slate-400">Multi-Currency Global Checkout & NGN Corporate Settlement</p>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <nav className="flex items-center p-1 bg-slate-900/90 border border-slate-800 rounded-xl shadow-inner text-sm font-medium w-full sm:w-auto overflow-x-auto">
          <button
            id="tab-checkout-btn"
            onClick={() => setActiveTab('checkout')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-all duration-150 whitespace-nowrap text-xs font-semibold ${
              activeTab === 'checkout'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 ring-1 ring-emerald-400/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Customer Checkout</span>
          </button>

          <button
            id="tab-merchant-btn"
            onClick={() => setActiveTab('merchant')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-all duration-150 whitespace-nowrap text-xs font-semibold ${
              activeTab === 'merchant'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 ring-1 ring-indigo-400/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Merchant Portal</span>
          </button>

          <button
            id="tab-admin-btn"
            onClick={() => setActiveTab('admin')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-all duration-150 whitespace-nowrap text-xs font-semibold ${
              activeTab === 'admin'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30 ring-1 ring-purple-400/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Admin & Controls</span>
          </button>

          <button
            id="tab-tests-btn"
            onClick={() => setActiveTab('tests')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-all duration-150 whitespace-nowrap text-xs font-semibold ${
              activeTab === 'tests'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30 ring-1 ring-amber-400/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <TestTube2 className="w-4 h-4" />
            <span>17-Scenario Test Runner</span>
          </button>
        </nav>
      </div>
    </header>
  );
};
