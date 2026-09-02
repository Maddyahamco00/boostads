import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Check, 
  Crown, 
  RefreshCw 
} from 'lucide-react';
import { SubscriptionPlan } from '../types';

export const PricingPlansView: React.FC = () => {
  const { 
    subscriptionPlans, 
    currentUser, 
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
        refreshData();
      }
    } catch (err) {
      console.error('Upgrade failed:', err);
    } finally {
      setIsUpgrading(null);
    }
  };

  return (
    <div id="pricing-plans-view" className="min-h-screen bg-gray-50 text-gray-900 pb-20">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-4 py-8 text-center">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Subscription Plans
          </h1>
          <p className="mt-1 text-xs text-gray-500">
            Choose the plan that fits your business needs
          </p>

          {/* Billing Cycle Toggle */}
          <div className="mt-4 inline-flex items-center gap-1 p-1 rounded-lg bg-gray-100 text-xs font-medium">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                billingCycle === 'monthly' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1 cursor-pointer ${
                billingCycle === 'yearly' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span>Yearly</span>
              <span className="text-[10px] bg-green-100 text-green-700 px-1 py-0.2 rounded font-semibold">Save 20%</span>
            </button>
          </div>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {subscriptionPlans.map((plan) => {
            const isCurrent = currentUser.tier === plan.tier;
            const isPopular = plan.isPopular;
            const price = billingCycle === 'yearly' ? plan.priceYearly : plan.priceMonthly;

            return (
              <div
                key={plan.id}
                className={`relative rounded-xl p-5 flex flex-col justify-between transition-colors ${
                  isPopular
                    ? 'bg-white border-2 border-blue-600 shadow-sm'
                    : 'bg-white border border-gray-200 shadow-xs'
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-blue-600 text-white font-semibold text-[10px] uppercase">
                    Popular
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-bold text-gray-900">{plan.name}</h2>
                    {plan.tier === 'enterprise' && <Crown className="w-4 h-4 text-amber-500" />}
                  </div>

                  <p className="text-xs text-gray-500 mt-1 min-h-[32px]">{plan.description}</p>

                  <div className="mt-4 pb-4 border-b border-gray-100">
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-gray-900">
                        ₦{price.toLocaleString()}
                      </span>
                      <span className="text-xs text-gray-500">
                        /{billingCycle === 'yearly' ? 'year' : 'month'}
                      </span>
                    </div>
                  </div>

                  {/* Features List */}
                  <div className="mt-4 space-y-2">
                    <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
                      Features
                    </span>
                    {plan.features.map((feat, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs text-gray-700">
                        <Check className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6 pt-3 border-t border-gray-100">
                  {isCurrent ? (
                    <button
                      disabled
                      className="w-full py-2 rounded-lg bg-gray-100 text-gray-500 font-medium text-xs cursor-default"
                    >
                      Active Plan
                    </button>
                  ) : (
                    <button
                      onClick={() => handleUpgrade(plan)}
                      disabled={isUpgrading === plan.id}
                      className={`w-full py-2 rounded-lg font-medium text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                        isPopular
                          ? 'bg-blue-600 hover:bg-blue-700 text-white'
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                      }`}
                    >
                      {isUpgrading === plan.id ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Updating...</span>
                        </>
                      ) : (
                        <span>Select Plan</span>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
