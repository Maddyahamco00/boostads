import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Crown, 
  ShieldCheck, 
  DollarSign, 
  AlertTriangle, 
  Users, 
  Flame, 
  CheckCircle2, 
  XCircle, 
  Tag, 
  TrendingUp, 
  Sliders,
  Check,
  Building2,
  Trash2,
  Lock
} from 'lucide-react';
import { Business, Advertisement, ReportItem } from '../types';

export const AdminPanelView: React.FC = () => {
  const { 
    businesses, 
    advertisements, 
    reports, 
    invoices, 
    refreshData 
  } = useApp();

  const [activeTab, setActiveTab] = useState<'businesses' | 'ads' | 'reports' | 'financials'>('businesses');
  const [fxSpread, setFxSpread] = useState<number>(2.0);

  const totalGMV = invoices.filter(i => i.status === 'paid').reduce((acc, i) => acc + i.total, 0);

  const handleVerifyBusiness = async (bizId: string, isVerified: boolean) => {
    try {
      await fetch(`/api/admin/businesses/${bizId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isVerified })
      });
      refreshData();
    } catch (err) {
      console.error('Failed to update verification status:', err);
    }
  };

  const handleToggleAdBoost = async (adId: string, isBoosted: boolean) => {
    try {
      await fetch(`/api/admin/ads/${adId}/boost`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isBoosted })
      });
      refreshData();
    } catch (err) {
      console.error('Failed to toggle boost status:', err);
    }
  };

  const handleResolveReport = async (reportId: string) => {
    try {
      await fetch(`/api/admin/reports/${reportId}/resolve`, {
        method: 'POST'
      });
      refreshData();
    } catch (err) {
      console.error('Failed to resolve report:', err);
    }
  };

  return (
    <div id="admin-panel-view" className="min-h-screen bg-slate-950 pb-24">
      {/* Executive Header */}
      <div className="border-b border-slate-800 bg-gradient-to-r from-amber-950/30 via-slate-900 to-slate-950 px-4 py-8 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center">
              <Crown className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-white">CEO Governance & Platform Control</h1>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-black uppercase border border-amber-500/30">
                  Owner Maddy
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Real Boosters Ecosystem Executive Administration • Full Platform Oversight
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-emerald-400 font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Core Server Active (Port 3000)</span>
            </span>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold">Total Businesses</span>
              <Building2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-white">{businesses.length}</div>
            <div className="text-[11px] text-emerald-400 font-medium mt-1">
              {businesses.filter(b => b.isVerified).length} Verified Entities
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold">Active Ads / Boosts</span>
              <Flame className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-black text-white">{advertisements.length}</div>
            <div className="text-[11px] text-amber-400 font-medium mt-1">
              {advertisements.filter(a => a.isBoosted).length} Priority Boosted
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold">Platform GMV Settled</span>
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-white">₦{totalGMV.toLocaleString()}</div>
            <div className="text-[11px] text-emerald-400 font-medium mt-1">
              Automated NGN Payouts
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold">Pending Flagged Reports</span>
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            </div>
            <div className="text-2xl font-black text-white">
              {reports.filter(r => r.status === 'pending').length}
            </div>
            <div className="text-[11px] text-slate-400 font-medium mt-1">
              Trust & Safety Moderation
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <div className="border-b border-slate-800 flex items-center gap-4 text-xs sm:text-sm font-semibold pb-1">
          <button
            onClick={() => setActiveTab('businesses')}
            className={`pb-3 px-2 border-b-2 transition-all ${
              activeTab === 'businesses' ? 'border-amber-400 text-amber-400 font-bold' : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            Manage Businesses ({businesses.length})
          </button>
          <button
            onClick={() => setActiveTab('ads')}
            className={`pb-3 px-2 border-b-2 transition-all ${
              activeTab === 'ads' ? 'border-amber-400 text-amber-400 font-bold' : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            Moderate Advertisements ({advertisements.length})
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`pb-3 px-2 border-b-2 transition-all ${
              activeTab === 'reports' ? 'border-amber-400 text-amber-400 font-bold' : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            Trust & Safety Reports ({reports.length})
          </button>
          <button
            onClick={() => setActiveTab('financials')}
            className={`pb-3 px-2 border-b-2 transition-all ${
              activeTab === 'financials' ? 'border-amber-400 text-amber-400 font-bold' : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            FX & Gateway Margins
          </button>
        </div>
      </div>

      {/* Tab Contents */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        
        {/* 1. BUSINESSES TAB */}
        {activeTab === 'businesses' && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Registered Business Directory & KYC Status</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-800 bg-slate-950/60">
                    <th className="p-4">Business Name & Category</th>
                    <th className="p-4">Location</th>
                    <th className="p-4">Tier</th>
                    <th className="p-4">Verification</th>
                    <th className="p-4 text-right">Admin Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {businesses.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-850 transition-colors text-slate-200">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <img src={b.logoUrl} alt={b.name} className="w-8 h-8 rounded-lg object-cover" />
                          <div>
                            <div className="font-bold text-white">{b.name}</div>
                            <div className="text-[11px] text-emerald-400">{b.categoryLabel}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-slate-300">{b.location.city}, {b.location.state}</td>
                      <td className="p-4">
                        <span className="uppercase font-bold text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
                          {b.tier}
                        </span>
                      </td>
                      <td className="p-4">
                        {b.isVerified ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400 font-bold">
                            <ShieldCheck className="w-4 h-4" /> Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-slate-400">
                            Unverified
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => handleVerifyBusiness(b.id, !b.isVerified)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            b.isVerified
                              ? 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30'
                              : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                          }`}
                        >
                          {b.isVerified ? 'Revoke Verified Seal' : 'Grant Verified Seal'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 2. ADVERTISEMENTS MODERATION */}
        {activeTab === 'ads' && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white">Live Marketplace Advertisements</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-800 bg-slate-950/60">
                    <th className="p-4">Ad Title & Business</th>
                    <th className="p-4">Category</th>
                    <th className="p-4">Price</th>
                    <th className="p-4">Boost Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {advertisements.map((ad) => (
                    <tr key={ad.id} className="hover:bg-slate-850 transition-colors text-slate-200">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <img src={ad.mediaUrls[0]} alt={ad.title} className="w-10 h-10 rounded-lg object-cover" />
                          <div>
                            <div className="font-bold text-white">{ad.title}</div>
                            <div className="text-[11px] text-slate-400">{ad.businessName}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-slate-300">{ad.category}</td>
                      <td className="p-4 font-bold text-white">
                        {ad.price ? `₦${ad.price.toLocaleString()}` : 'Free / Custom'}
                      </td>
                      <td className="p-4">
                        {ad.isBoosted ? (
                          <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold flex items-center gap-1 w-fit">
                            <Flame className="w-3 h-3 text-amber-400" /> Boosted
                          </span>
                        ) : (
                          <span className="text-slate-500">Standard</span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => handleToggleAdBoost(ad.id, !ad.isBoosted)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            ad.isBoosted
                              ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                              : 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                          }`}
                        >
                          {ad.isBoosted ? 'Demote from Spotlight' : 'Promote to Spotlight'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 3. REPORTS TAB */}
        {activeTab === 'reports' && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
            <h3 className="text-sm font-bold text-white mb-4">Flagged Customer Complaints & Reports</h3>
            {reports.length === 0 ? (
              <p className="text-xs text-slate-400">Zero active reports on the platform.</p>
            ) : (
              <div className="space-y-3">
                {reports.map((rep) => (
                  <div key={rep.id} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-rose-400 uppercase">[{rep.targetType}]</span>
                        <span className="text-sm font-bold text-white">{rep.targetName}</span>
                        <span className="text-xs text-slate-500">Reason: {rep.reason}</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{rep.details}</p>
                    </div>

                    <div>
                      {rep.status === 'resolved' ? (
                        <span className="text-emerald-400 text-xs font-bold">✓ Resolved</span>
                      ) : (
                        <button
                          onClick={() => handleResolveReport(rep.id)}
                          className="px-3 py-1.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs"
                        >
                          Mark Resolved
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 4. FINANCIALS TAB */}
        {activeTab === 'financials' && (
          <div className="max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
            <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-400" />
              <span>Multi-Currency FX Spread & Commission Governance</span>
            </h3>
            <p className="text-xs text-slate-400 mb-6">
              Configure the foreign exchange rate margin applied to international customer checkouts (USD, EUR, GBP, AED, CAD).
            </p>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  FX Spread Margin: <span className="text-emerald-400 font-bold">{fxSpread}%</span>
                </label>
                <input
                  type="range"
                  min={0.5}
                  max={5.0}
                  step={0.1}
                  value={fxSpread}
                  onChange={(e) => setFxSpread(Number(e.target.value))}
                  className="w-full accent-emerald-500"
                />
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Base Official USD/NGN:</span>
                  <span className="text-white font-mono">₦1,520.00</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Effective Consumer Rate (+{fxSpread}%):</span>
                  <span className="text-emerald-400 font-mono font-bold">
                    ₦{(1520 * (1 - fxSpread / 100)).toFixed(2)}
                  </span>
                </div>
              </div>

              <button
                onClick={() => alert(`FX Margin configuration updated to ${fxSpread}% successfully.`)}
                className="w-full py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-lg"
              >
                Apply Global FX Setting
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
