import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Check, 
  Sparkles, 
  Flame, 
  Crown, 
  ShieldCheck, 
  Zap, 
  ArrowRight,
  RefreshCw,
  Building2
} from 'lucide-react';
import { SubscriptionPlan, SubscriptionTier } from '../types';

export const PricingPlansView: React.FC = () => {
  const { 
    subscriptionPlans, 
    currentUser, 
    switchUserRole, 
    setActiveView,
    refreshData 
  } = useApp();

  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [isUpgrading, setIsUpgrading] = useState<string | null>(null);

  const handleUpgrade = async (plan: SubscriptionPlan) => {
    setIsUpgrading(plan.id);
    try {
      const res = await fetch('/api/subscriptions/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          planId: plan.id,
          tier: plan.tier
        })
      });
      const data = await res.json();
      if (data.success) {
        alert(`Congratulations! You have upgraded to the ${plan.name} tier.`);
        refreshData();
      }
    } catch (err) {
      console.error('Upgrade failed:', err);
    } finally {
      setIsUpgrading(null);
    }
  };

  return (
    <div id="pricing-plans-view" className="min-h-screen bg-slate-950 pb-24">
      {/* Hero Header */}
      <div className="border-b border-slate-800 bg-gradient-to-b from-slate-900 via-slate-900/90 to-slate-950 px-4 py-12 text-center">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold mb-3">
            <Crown className="w-3.5 h-3.5" />
            <span>SaaS Subscription & Growth Plans</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            Scale Your Business with <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-200">Real Boosters</span>
          </h1>
          <p className="mt-3 text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
            Free forever for starting businesses. Upgrade for higher ad limits, AI copywriting automation, priority local search ranking, and instant multi-currency invoice checkout.
          </p>

          {/* Billing Cycle Toggle */}
          <div className="mt-6 inline-flex items-center gap-2 p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-4 py-2 rounded-lg transition-all ${
                billingCycle === 'monthly' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Monthly Billing
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-4 py-2 rounded-lg transition-all flex items-center gap-1.5 ${
                billingCycle === 'yearly' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Yearly Billing</span>
              <span className="text-[10px] bg-amber-400 text-slate-950 px-1.5 py-0.5 rounded font-black">SAVE 20%</span>
            </button>
          </div>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {subscriptionPlans.map((plan) => {
            const isCurrent = currentUser.tier === plan.tier;
            const isPopular = plan.isPopular;
            const price = billingCycle === 'yearly' ? plan.priceYearly : plan.priceMonthly;

            return (
              <div
                key={plan.id}
                className={`relative rounded-3xl p-6 sm:p-8 flex flex-col justify-between transition-all ${
                  isPopular
                    ? 'bg-slate-900 border-2 border-emerald-500 shadow-2xl shadow-emerald-500/10'
                    : 'bg-slate-900/70 border border-slate-800'
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-emerald-500 text-slate-950 font-black text-[10px] tracking-wider uppercase shadow">
                    🔥 Most Popular Choice
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-black text-white">{plan.name}</h3>
                    {plan.tier === 'enterprise' && <Crown className="w-5 h-5 text-amber-400" />}
                    {plan.tier === 'pro' && <Sparkles className="w-5 h-5 text-emerald-400" />}
                  </div>

                  <p className="text-xs text-slate-400 mt-2 min-h-[32px]">{plan.description}</p>

                  <div className="mt-6 pb-6 border-b border-slate-800">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl sm:text-4xl font-black text-white">
                        ₦{price.toLocaleString()}
                      </span>
                      <span className="text-xs text-slate-400">
                        /{billingCycle === 'yearly' ? 'year' : 'month'}
                      </span>
                    </div>
                    {price > 0 && (
                      <div className="text-[11px] text-emerald-400 font-semibold mt-1">
                        ≈ ${(price / (billingCycle === 'yearly' ? 18000 : 1520)).toFixed(0)} USD
                      </div>
                    )}
                  </div>

                  {/* Features List */}
                  <div className="mt-6 space-y-3">
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                      Plan Inclusions:
                    </span>
                    {plan.features.map((feat, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                        <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-8 pt-4">
                  {isCurrent ? (
                    <button
                      disabled
                      className="w-full py-3 rounded-xl bg-slate-800 text-emerald-400 font-bold text-xs border border-slate-700 cursor-default"
                    >
                      ✓ Your Active Plan
                    </button>
                  ) : (
                    <button
                      onClick={() => handleUpgrade(plan)}
                      disabled={isUpgrading === plan.id}
                      className={`w-full py-3 rounded-xl font-black text-xs transition-all shadow-lg flex items-center justify-center gap-1.5 ${
                        isPopular
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 hover:from-emerald-400 hover:to-teal-400'
                          : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
                      }`}
                    >
                      {isUpgrading === plan.id ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Activating Subscription...</span>
                        </>
                      ) : (
                        <>
                          <span>Select {plan.name}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Boost Add-ons Section */}
        <div className="mt-16 bg-slate-900 border border-slate-800 rounded-3xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400">
              <Flame className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">À La Carte Ad Boost Packages</h2>
              <p className="text-xs text-slate-400">Instantly spotlight any listing to the top of category feeds without upgrading full plan.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
              <div>
                <span className="font-bold text-white text-sm block">3-Day Quick Pulse</span>
                <span className="text-slate-400 text-[11px]">Boost on local city search</span>
                <div className="text-base font-black text-amber-400 mt-2">₦3,500</div>
              </div>
              <button 
                onClick={() => alert('Boost credit applied! Choose an ad from your dashboard to activate.')}
                className="mt-4 w-full py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold"
              >
                Buy 3-Day Boost
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
              <div>
                <span className="font-bold text-white text-sm block">7-Day City Spotlight</span>
                <span className="text-slate-400 text-[11px]">Top 3 slot on city homepage</span>
                <div className="text-base font-black text-amber-400 mt-2">₦7,500</div>
              </div>
              <button 
                onClick={() => alert('Boost credit applied! Choose an ad from your dashboard to activate.')}
                className="mt-4 w-full py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold"
              >
                Buy 7-Day Spotlight
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
              <div>
                <span className="font-bold text-white text-sm block">30-Day Mega Surge</span>
                <span className="text-slate-400 text-[11px]">Nationwide featured carousel</span>
                <div className="text-base font-black text-amber-400 mt-2">₦25,000</div>
              </div>
              <button 
                onClick={() => alert('Boost credit applied! Choose an ad from your dashboard to activate.')}
                className="mt-4 w-full py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold"
              >
                Buy 30-Day Surge
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
