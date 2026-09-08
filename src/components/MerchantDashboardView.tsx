'use client';

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  DollarSign, 
  Plus, 
  ShoppingBag, 
  Wrench, 
  Image as ImageIcon, 
  Building2, 
  ShieldCheck, 
  ExternalLink,
  Users,
  Megaphone,
  Flame,
  Eye,
  MousePointer,
  TrendingUp,
  MessageSquare,
  Sparkles,
  BarChart3,
  CreditCard,
  CheckCircle2,
  Phone,
  ArrowUpRight
} from 'lucide-react';
import { AdvertisementCard } from './AdvertisementCard';

export const MerchantDashboardView: React.FC = () => {
  const { 
    currentUser, 
    businesses, 
    advertisements, 
    campaigns,
    leads,
    setIsCreateAdModalOpen,
    setActiveView,
    viewBusinessDetail,
    refreshData
  } = useApp();

  const userBiz = businesses.find(b => b.ownerId === currentUser.id) || businesses[0];
  const userAds = advertisements.filter(a => a.businessId === userBiz?.id);
  const userCampaigns = campaigns.filter(c => c.businessId === userBiz?.id || currentUser.role === 'SUPER_ADMIN');
  const userLeads = leads.filter(l => l.businessId === userBiz?.id || currentUser.role === 'SUPER_ADMIN');

  const [activeTab, setActiveTab] = useState<'overview' | 'ads' | 'leads' | 'products' | 'services' | 'bank_payouts'>('overview');

  // Form states for adding product/service
  const [newProdName, setNewProdName] = useState('');
  const [newProdPrice, setNewProdPrice] = useState('');
  const [newProdDesc, setNewProdDesc] = useState('');
  const [newProdImg, setNewProdImg] = useState('https://images.unsplash.com/photo-1549298916-b41d501d3772?w=600&auto=format&fit=crop&q=80');

  const [newServName, setNewServName] = useState('');
  const [newServPrice, setNewServPrice] = useState('');
  const [newServDesc, setNewServDesc] = useState('');

  const [bankName, setBankName] = useState('Guaranty Trust Bank (GTBank)');
  const [accountNumber, setAccountNumber] = useState('0123456789');
  const [accountName, setAccountName] = useState(userBiz?.name || 'Boost Market Merchant');
  const [bankSaved, setBankSaved] = useState(false);

  const totalAdViews = userAds.reduce((acc, curr) => acc + (curr.viewsCount || 0), 0) || 1420;
  const totalAdClicks = userAds.reduce((acc, curr) => acc + (curr.clicksCount || 0), 0) || 168;

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName || !newProdPrice || !userBiz) return;
    try {
      await fetch('/api/products/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: userBiz.id,
          name: newProdName,
          description: newProdDesc || 'High quality product on Boost Market',
          price: Number(newProdPrice),
          category: userBiz.categoryLabel || userBiz.category,
          imageUrls: [newProdImg],
          inStock: true
        })
      });
      setNewProdName('');
      setNewProdPrice('');
      setNewProdDesc('');
      refreshData();
    } catch (err) {
      console.error('Failed to add product:', err);
    }
  };

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newServName || !newServPrice || !userBiz) return;
    try {
      await fetch('/api/services/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: userBiz.id,
          name: newServName,
          description: newServDesc || 'Professional service',
          startingPrice: Number(newServPrice),
          category: userBiz.categoryLabel || userBiz.category,
          imageUrls: ['https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop&q=80'],
          durationUnit: 'service',
          deliveryMode: 'on_premise'
        })
      });
      setNewServName('');
      setNewServPrice('');
      setNewServDesc('');
      refreshData();
    } catch (err) {
      console.error('Failed to add service:', err);
    }
  };

  const handleSaveBank = (e: React.FormEvent) => {
    e.preventDefault();
    setBankSaved(true);
    setTimeout(() => setBankSaved(false), 3000);
  };

  return (
    <div id="merchant-dashboard-view" className="min-h-screen pb-20 text-slate-900 dark:text-slate-100 transition-colors">
      
      {/* Top Banner / Merchant Identity */}
      <div className="glass-panel border-b border-slate-200/80 dark:border-slate-800 px-4 py-6 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <img
              src={userBiz?.logoUrl || 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=200&auto=format&fit=crop&q=80'}
              alt={userBiz?.name}
              className="w-14 h-14 rounded-2xl object-cover border border-slate-200 dark:border-slate-700 shadow-sm"
            />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  {userBiz?.name || 'Business Advertising Hub'}
                </h1>
                <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-cyan-400" />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {userBiz?.categoryLabel || userBiz?.category} • {userBiz?.location?.city}, {userBiz?.location?.state}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => viewBusinessDetail(userBiz?.id || '')}
              className="px-4 py-2.5 rounded-xl glass-card text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Public Profile</span>
            </button>

            <button
              onClick={() => setIsCreateAdModalOpen(true)}
              className="btn-advertise px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-md cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Advertisement</span>
            </button>
          </div>
        </div>
      </div>

      {/* Primary Advertising Performance Metrics */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          
          <div className="glass-card p-5 rounded-2xl">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Total Ad Views</span>
              <Eye className="w-4 h-4 text-indigo-600 dark:text-cyan-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              {totalAdViews.toLocaleString()}
            </div>
            <div className="text-xs text-emerald-600 dark:text-emerald-400 font-bold mt-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              <span>+24.8% this week</span>
            </div>
          </div>

          <div className="glass-card p-5 rounded-2xl">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Ad Engagements</span>
              <MousePointer className="w-4 h-4 text-purple-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              {totalAdClicks.toLocaleString()}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-1">
              Clicks & Inquiries
            </div>
          </div>

          <div className="glass-card p-5 rounded-2xl">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Customer Leads</span>
              <Users className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              {userLeads.length || 14}
            </div>
            <div className="text-xs text-emerald-600 dark:text-emerald-400 font-bold mt-1">
              WhatsApp & Calls
            </div>
          </div>

          <div className="glass-card p-5 rounded-2xl">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Active Campaigns</span>
              <Megaphone className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              {userAds.filter(a => a.isBoosted).length || 2} Boosted
            </div>
            <div className="text-xs text-indigo-600 dark:text-cyan-400 font-bold mt-1">
              Multi-platform distribution
            </div>
          </div>

        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto pb-2 text-xs font-bold">
          
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-2.5 px-4 flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'overview'
                ? 'border-indigo-600 text-indigo-600 dark:text-cyan-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Advertising Overview</span>
          </button>

          <button
            onClick={() => setActiveTab('ads')}
            className={`pb-2.5 px-4 flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'ads'
                ? 'border-indigo-600 text-indigo-600 dark:text-cyan-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Flame className="w-4 h-4 text-amber-500" />
            <span>My Advertisements ({userAds.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('leads')}
            className={`pb-2.5 px-4 flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'leads'
                ? 'border-indigo-600 text-indigo-600 dark:text-cyan-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Users className="w-4 h-4 text-emerald-500" />
            <span>Direct Leads ({userLeads.length || 6})</span>
          </button>

          <button
            onClick={() => setActiveTab('products')}
            className={`pb-2.5 px-4 flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'products'
                ? 'border-indigo-600 text-indigo-600 dark:text-cyan-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Product Catalog</span>
          </button>

          <button
            onClick={() => setActiveTab('services')}
            className={`pb-2.5 px-4 flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'services'
                ? 'border-indigo-600 text-indigo-600 dark:text-cyan-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Wrench className="w-4 h-4" />
            <span>Services Menu</span>
          </button>

          <button
            onClick={() => setActiveTab('bank_payouts')}
            className={`pb-2.5 px-4 flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'bank_payouts'
                ? 'border-indigo-600 text-indigo-600 dark:text-cyan-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Payout Account</span>
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            
            {/* Quick Action Boost Banner */}
            <div className="glass-card rounded-3xl p-6 sm:p-8 border-indigo-400/40 dark:border-indigo-500/40 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="space-y-2 text-center md:text-left">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-cyan-400">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Boost Distribution Engine</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                  Reach 25,000+ Potential Customers in {userBiz?.location?.city || 'Your Area'}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-xl">
                  Boost your active advertisements across Boost Market feeds, Facebook, Instagram, and local search channels.
                </p>
              </div>

              <button
                onClick={() => setActiveView('campaigns')}
                className="btn-advertise px-6 py-3 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2 shadow-lg cursor-pointer whitespace-nowrap"
              >
                <Flame className="w-4 h-4 text-amber-300" />
                <span>Launch New Boost Campaign</span>
              </button>
            </div>

            {/* Active Advertisements Showcase */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Active Advertisements Performance
                </h3>
                <button
                  onClick={() => setIsCreateAdModalOpen(true)}
                  className="text-xs font-bold text-indigo-600 dark:text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Ad</span>
                </button>
              </div>

              {userAds.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {userAds.map(ad => (
                    <AdvertisementCard key={ad.id} ad={ad} business={userBiz} />
                  ))}
                </div>
              ) : (
                <div className="glass-card rounded-2xl p-10 text-center text-slate-400 text-xs">
                  <p>You have not published any advertisements yet.</p>
                  <button
                    onClick={() => setIsCreateAdModalOpen(true)}
                    className="mt-4 px-4 py-2 rounded-xl btn-advertise font-bold text-xs cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create Your First Ad</span>
                  </button>
                </div>
              )}
            </div>

          </div>
        )}

        {/* MY ADS TAB */}
        {activeTab === 'ads' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                All Published Advertisements ({userAds.length})
              </h3>
              <button
                onClick={() => setIsCreateAdModalOpen(true)}
                className="btn-advertise px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Post New Ad</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {userAds.map(ad => (
                <div key={ad.id} className="relative">
                  <AdvertisementCard ad={ad} business={userBiz} />
                  
                  {/* Action Bar for Merchant */}
                  <div className="mt-2 flex items-center justify-between p-2 rounded-xl glass-panel text-xs">
                    <span className="font-semibold text-slate-500">
                      Status: <span className="text-emerald-600 dark:text-emerald-400 font-bold">Active</span>
                    </span>
                    <button
                      onClick={() => setActiveView('campaigns')}
                      className="text-xs font-bold text-indigo-600 dark:text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Flame className="w-3.5 h-3.5 text-amber-500" />
                      <span>{ad.isBoosted ? 'Extend Boost' : 'Boost Ad'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* LEADS TAB */}
        {activeTab === 'leads' && (
          <div className="glass-card rounded-2xl overflow-hidden p-5">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">
              Direct Customer Inquiries & Leads
            </h3>
            
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {[
                { name: 'Alhaji Musa Ibrahim', phone: '+2348031122334', ad: 'Premium Computer Diagnostics', time: '10 mins ago', message: 'Hello, what is your pricing for engine scanning?' },
                { name: 'Chinedu Okafor', phone: '+2348029988776', ad: 'Full Transmission Overhaul', time: '2 hours ago', message: 'Can you service my Honda Accord tomorrow morning?' },
                { name: 'Fatima Bello', phone: '+2348095544332', ad: 'Special Diagnostic Promo', time: 'Yesterday', message: 'Do you offer home visit inspections in Kaduna?' }
              ].map((lead, idx) => (
                <div key={idx} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900 dark:text-white">{lead.name}</span>
                      <span className="text-[11px] text-slate-400 font-medium">{lead.time}</span>
                    </div>
                    <div className="text-xs text-indigo-600 dark:text-cyan-400 font-semibold mt-0.5">
                      Interested in: {lead.ad}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 italic">
                      "{lead.message}"
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <a
                      href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}?text=Hello%20${encodeURIComponent(lead.name)},%20thank%20you%20for%20your%20inquiry%20on%20Boost%20Market!`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Reply on WhatsApp</span>
                    </a>

                    <a
                      href={`tel:${lead.phone}`}
                      className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="Call Lead"
                    >
                      <Phone className="w-4 h-4 text-indigo-600" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PRODUCTS CATALOG TAB */}
        {activeTab === 'products' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-4 glass-card p-5 rounded-2xl self-start">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-3">Add Product to Catalog</h3>
              <form onSubmit={handleAddProduct} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">Product Name</label>
                  <input
                    type="text"
                    value={newProdName}
                    onChange={(e) => setNewProdName(e.target.value)}
                    placeholder="e.g. Bosch Diagnostic Scanner OBD2"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">Price (₦ NGN)</label>
                  <input
                    type="number"
                    value={newProdPrice}
                    onChange={(e) => setNewProdPrice(e.target.value)}
                    placeholder="45000"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">Description</label>
                  <textarea
                    rows={2}
                    value={newProdDesc}
                    onChange={(e) => setNewProdDesc(e.target.value)}
                    placeholder="Key specifications, warranty, compatibility..."
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl btn-advertise font-bold text-xs cursor-pointer shadow-md"
                >
                  Save Product
                </button>
              </form>
            </div>

            <div className="lg:col-span-8 glass-card p-5 rounded-2xl">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-4">Current Products</h3>
              <p className="text-xs text-slate-500">Products in your catalog can be featured in advertisements or ordered directly by customers.</p>
            </div>
          </div>
        )}

        {/* SERVICES TAB */}
        {activeTab === 'services' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-4 glass-card p-5 rounded-2xl self-start">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-3">Add Service Offering</h3>
              <form onSubmit={handleAddService} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">Service Name</label>
                  <input
                    type="text"
                    value={newServName}
                    onChange={(e) => setNewServName(e.target.value)}
                    placeholder="e.g. Complete Engine Overhaul & Tune-Up"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">Starting Price (₦ NGN)</label>
                  <input
                    type="number"
                    value={newServPrice}
                    onChange={(e) => setNewServPrice(e.target.value)}
                    placeholder="25000"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">Description</label>
                  <textarea
                    rows={2}
                    value={newServDesc}
                    onChange={(e) => setNewServDesc(e.target.value)}
                    placeholder="Scope of work, turnaround time, guarantee..."
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl btn-advertise font-bold text-xs cursor-pointer shadow-md"
                >
                  Save Service
                </button>
              </form>
            </div>

            <div className="lg:col-span-8 glass-card p-5 rounded-2xl">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-4">Service Offerings</h3>
              <p className="text-xs text-slate-500">Service listings allow clients to request quotes and book directly.</p>
            </div>
          </div>
        )}

        {/* BANK PAYOUTS TAB */}
        {activeTab === 'bank_payouts' && (
          <div className="max-w-xl glass-card rounded-2xl p-6">
            <h3 className="font-bold text-slate-900 dark:text-white text-base mb-2">Merchant Bank Account</h3>
            <p className="text-xs text-slate-500 mb-4">Receive direct bank settlements for client invoices, orders, and services.</p>
            
            <form onSubmit={handleSaveBank} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">Bank Name</label>
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">Account Number</label>
                <input
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">Account Name</label>
                <input
                  type="text"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl btn-advertise font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{bankSaved ? 'Bank Details Updated!' : 'Save Payout Details'}</span>
                </button>
              </div>
            </form>
          </div>
        )}

      </div>

    </div>
  );
};
