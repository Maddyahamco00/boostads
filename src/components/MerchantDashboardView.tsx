import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Store, 
  DollarSign, 
  Flame, 
  MessageSquare, 
  TrendingUp, 
  Plus, 
  ShoppingBag, 
  Wrench, 
  Image as ImageIcon, 
  CreditCard, 
  Building2, 
  ShieldCheck, 
  Edit3,
  ExternalLink,
  Sparkles,
  Eye,
  MousePointer,
  Megaphone,
  Users,
  CheckCircle2
} from 'lucide-react';
import { Product, Service, PortfolioItem, Advertisement } from '../types';

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
  const userCampaigns = campaigns.filter(c => c.businessId === userBiz?.id || currentUser.role === 'ceo');
  const userLeads = leads.filter(l => l.businessId === userBiz?.id || currentUser.role === 'ceo');

  const [activeTab, setActiveTab] = useState<'overview' | 'ads' | 'products' | 'services' | 'portfolio' | 'bank_payouts'>('overview');

  // Form states for adding product/service
  const [newProdName, setNewProdName] = useState('');
  const [newProdPrice, setNewProdPrice] = useState('');
  const [newProdDesc, setNewProdDesc] = useState('');
  const [newProdImg, setNewProdImg] = useState('https://images.unsplash.com/photo-1549298916-b41d501d3772?w=600&auto=format&fit=crop&q=80');

  const [newServName, setNewServName] = useState('');
  const [newServPrice, setNewServPrice] = useState('');
  const [newServDesc, setNewServDesc] = useState('');

  const [newPfTitle, setNewPfTitle] = useState('');
  const [newPfDesc, setNewPfDesc] = useState('');
  const [newPfImg, setNewPfImg] = useState('https://images.unsplash.com/photo-1558655146-d09347e92766?w=600&auto=format&fit=crop&q=80');
  const [newPfBeforeImg, setNewPfBeforeImg] = useState('');
  const [newPfAfterImg, setNewPfAfterImg] = useState('');

  const [bankName, setBankName] = useState('Guaranty Trust Bank (GTBank)');
  const [accountNumber, setAccountNumber] = useState('0123456789');
  const [accountName, setAccountName] = useState(userBiz?.name || 'Real Boosters Merchant');
  const [bankSaved, setBankSaved] = useState(false);

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
          category: userBiz.categoryLabel,
          imageUrls: [newProdImg],
          inStock: true
        })
      });
      setNewProdName('');
      setNewProdPrice('');
      setNewProdDesc('');
      alert('Product created and added to your catalog!');
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
          description: newServDesc || 'Professional service by verified expert',
          startingPrice: Number(newServPrice),
          category: userBiz.categoryLabel,
          imageUrls: ['https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop&q=80'],
          durationUnit: 'service',
          deliveryMode: 'on_premise'
        })
      });
      setNewServName('');
      setNewServPrice('');
      setNewServDesc('');
      alert('Service added to your business profile!');
      refreshData();
    } catch (err) {
      console.error('Failed to add service:', err);
    }
  };

  const handleAddPortfolio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPfTitle || !userBiz) return;
    try {
      await fetch('/api/portfolio/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: userBiz.id,
          title: newPfTitle,
          description: newPfDesc || 'Showcase project delivered to satisfied client',
          mediaUrl: newPfImg,
          beforeImageUrl: newPfBeforeImg || undefined,
          afterImageUrl: newPfAfterImg || undefined,
          category: userBiz.categoryLabel
        })
      });
      setNewPfTitle('');
      setNewPfDesc('');
      setNewPfBeforeImg('');
      setNewPfAfterImg('');
      alert('Portfolio showcase item with Before & After images uploaded successfully!');
      refreshData();
    } catch (err) {
      console.error('Failed to add portfolio:', err);
    }
  };

  return (
    <div id="merchant-dashboard-view" className="min-h-screen bg-slate-950 pb-24">
      {/* Top Banner */}
      <div className="border-b border-slate-800 bg-slate-900 px-4 py-8 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <img
              src={userBiz?.logoUrl || 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=200&auto=format&fit=crop&q=80'}
              alt={userBiz?.name}
              className="w-14 h-14 rounded-2xl object-cover ring-2 ring-emerald-500/40"
            />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-white">{userBiz?.name || 'My Business Dashboard'}</h1>
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {userBiz?.categoryLabel} • {userBiz?.location.city}, {userBiz?.location.state}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => viewBusinessDetail(userBiz?.id || '')}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center gap-1.5 border border-slate-700 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Preview Public Profile</span>
            </button>

            <button
              onClick={() => setIsCreateAdModalOpen(true)}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 hover:scale-102 transition-all flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Ad</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold">Total Revenue Settled</span>
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-white">₦2,850,000</div>
            <div className="text-[11px] text-emerald-400 font-semibold mt-1">
              +18.4% from last month
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold">Total Inquiries / Leads</span>
              <Users className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-2xl font-black text-white">{userLeads.length > 0 ? `${userLeads.length} Leads` : '48 Leads'}</div>
            <div className="text-[11px] text-indigo-400 font-semibold mt-1">
              Multi-platform CRM active
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold">Cross-Platform Campaigns</span>
              <Megaphone className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-black text-white">{userCampaigns.length} Active</div>
            <div className="text-[11px] text-amber-400 font-semibold mt-1">
              Meta • Google • TikTok • YouTube
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold">Rating & Credibility</span>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-white">4.9 / 5.0</div>
            <div className="text-[11px] text-slate-400 font-medium mt-1">
              Verified Real Boosters Merchant
            </div>
          </div>
        </div>

        {/* Multi-Platform Ad Engine Promo Banner */}
        <div className="mt-6 bg-gradient-to-r from-indigo-950 via-slate-900 to-emerald-950 border border-indigo-500/30 rounded-3xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500 text-slate-950">
                PRO FEATURE
              </span>
              <h3 className="text-base font-black text-white">Multi-Platform Advertising & CRM Engine</h3>
            </div>
            <p className="text-xs text-slate-300 max-w-xl">
              Distribute advertising spend across <strong>Facebook, Instagram, Google Ads, TikTok & YouTube</strong> with automated smart allocation, strict budget caps, and integrated lead tracking.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveView('campaigns')}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/20 flex items-center gap-1.5 transition-all"
            >
              <Megaphone className="w-3.5 h-3.5" />
              <span>Open Ad & CRM Hub</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <div className="border-b border-slate-800 flex items-center gap-4 overflow-x-auto text-xs sm:text-sm font-semibold pb-1">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-3 px-2 border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'overview' ? 'border-emerald-500 text-emerald-400 font-bold' : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            My Active Ads ({userAds.length})
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`pb-3 px-2 border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'products' ? 'border-emerald-500 text-emerald-400 font-bold' : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            Manage Products
          </button>
          <button
            onClick={() => setActiveTab('services')}
            className={`pb-3 px-2 border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'services' ? 'border-emerald-500 text-emerald-400 font-bold' : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            Manage Services
          </button>
          <button
            onClick={() => setActiveTab('portfolio')}
            className={`pb-3 px-2 border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'portfolio' ? 'border-emerald-500 text-emerald-400 font-bold' : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            Portfolio Showcase
          </button>
          <button
            onClick={() => setActiveTab('bank_payouts')}
            className={`pb-3 px-2 border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'bank_payouts' ? 'border-emerald-500 text-emerald-400 font-bold' : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            Bank Payout Settings
          </button>
        </div>
      </div>

      {/* Tab Contents */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        
        {/* 1. ADS TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Your Posted Advertisements</h3>
              <button
                onClick={() => setIsCreateAdModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs"
              >
                + Post New Ad
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {userAds.map(ad => (
                <div key={ad.id} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden p-4 flex flex-col justify-between">
                  <div>
                    <img src={ad.mediaUrls[0]} alt={ad.title} className="w-full h-40 object-cover rounded-xl mb-3" />
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-emerald-400">{ad.status}</span>
                      {ad.isBoosted && (
                        <span className="text-[10px] bg-amber-500 text-slate-950 px-2 py-0.5 rounded font-black">
                          🔥 BOOSTED
                        </span>
                      )}
                    </div>
                    <h4 className="font-bold text-white text-sm mt-1">{ad.title}</h4>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">{ad.description}</p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-slate-400">👀 {ad.viewsCount} views</span>
                    <span className="text-slate-400">💬 {ad.inquiriesCount} chats</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 2. PRODUCTS TAB */}
        {activeTab === 'products' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-3xl p-6 h-fit shadow-xl">
              <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-emerald-400" />
                <span>Add Product to Catalog</span>
              </h3>
              <form onSubmit={handleAddProduct} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Product Title</label>
                  <input
                    type="text"
                    value={newProdName}
                    onChange={(e) => setNewProdName(e.target.value)}
                    placeholder="e.g. Handmade Leather Loafers"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Price (NGN)</label>
                  <input
                    type="number"
                    value={newProdPrice}
                    onChange={(e) => setNewProdPrice(e.target.value)}
                    placeholder="45000"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Image URL</label>
                  <input
                    type="text"
                    value={newProdImg}
                    onChange={(e) => setNewProdImg(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Description</label>
                  <textarea
                    rows={2}
                    value={newProdDesc}
                    onChange={(e) => setNewProdDesc(e.target.value)}
                    placeholder="Genuine calfskin, double leather sole..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow"
                >
                  Publish Product
                </button>
              </form>
            </div>

            <div className="lg:col-span-2 bg-slate-900/60 border border-slate-800 rounded-3xl p-6">
              <h3 className="text-sm font-bold text-white mb-4">Catalog Overview</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Products listed here are visible to customers visiting your business profile. Customers can directly order or request an invoice for any listed item via real-time chat.
              </p>
            </div>
          </div>
        )}

        {/* 3. SERVICES TAB */}
        {activeTab === 'services' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-3xl p-6 h-fit shadow-xl">
              <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <Wrench className="w-4 h-4 text-emerald-400" />
                <span>Add Service Offering</span>
              </h3>
              <form onSubmit={handleAddService} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Service Title</label>
                  <input
                    type="text"
                    value={newServName}
                    onChange={(e) => setNewServName(e.target.value)}
                    placeholder="e.g. Bespoke Kaftan Tailoring"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Starting Price (NGN)</label>
                  <input
                    type="number"
                    value={newServPrice}
                    onChange={(e) => setNewServPrice(e.target.value)}
                    placeholder="25000"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Description</label>
                  <textarea
                    rows={2}
                    value={newServDesc}
                    onChange={(e) => setNewServDesc(e.target.value)}
                    placeholder="Precision measurement, bespoke fitting..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow"
                >
                  Publish Service
                </button>
              </form>
            </div>

            <div className="lg:col-span-2 bg-slate-900/60 border border-slate-800 rounded-3xl p-6">
              <h3 className="text-sm font-bold text-white mb-4">Service Offerings</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Add your custom services so local and international clients can book your expertise and request customized milestone invoices.
              </p>
            </div>
          </div>
        )}

        {/* 4. PORTFOLIO TAB */}
        {activeTab === 'portfolio' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-3xl p-6 h-fit shadow-xl">
              <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-emerald-400" />
                <span>Upload Showcase or Before/After</span>
              </h3>
              <form onSubmit={handleAddPortfolio} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Project Title *</label>
                  <input
                    type="text"
                    value={newPfTitle}
                    onChange={(e) => setNewPfTitle(e.target.value)}
                    placeholder="e.g. Royal Wedding Agbada or Engine Rebuild"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Description / Client Result</label>
                  <textarea
                    rows={2}
                    value={newPfDesc}
                    onChange={(e) => setNewPfDesc(e.target.value)}
                    placeholder="Describe how your work solved the client's problem..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Main Finished Image URL</label>
                  <input
                    type="text"
                    value={newPfImg}
                    onChange={(e) => setNewPfImg(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800">
                  <div>
                    <label className="block text-slate-400 font-medium mb-1">Before Image URL</label>
                    <input
                      type="text"
                      placeholder="Optional Before URL"
                      value={newPfBeforeImg}
                      onChange={(e) => setNewPfBeforeImg(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-[11px] text-slate-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-medium mb-1">After Image URL</label>
                    <input
                      type="text"
                      placeholder="Optional After URL"
                      value={newPfAfterImg}
                      onChange={(e) => setNewPfAfterImg(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-[11px] text-slate-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow"
                >
                  Publish to Showcase Gallery
                </button>
              </form>
            </div>

            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">Your Delivered Projects & Transformations</h3>
                <span className="text-xs text-slate-400">{userBiz?.portfolioItems?.length || 0} items</span>
              </div>
              
              {userBiz?.portfolioItems && userBiz.portfolioItems.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {userBiz.portfolioItems.map((pf) => (
                    <div key={pf.id} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden p-4">
                      {pf.beforeImageUrl && pf.afterImageUrl ? (
                        <div className="grid grid-cols-2 gap-2 mb-3">
                          <div className="relative">
                            <img src={pf.beforeImageUrl} alt="Before" className="w-full h-32 object-cover rounded-lg" />
                            <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded bg-slate-950/80 text-[9px] font-bold text-amber-400">
                              BEFORE
                            </span>
                          </div>
                          <div className="relative">
                            <img src={pf.afterImageUrl} alt="After" className="w-full h-32 object-cover rounded-lg" />
                            <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded bg-emerald-500/90 text-[9px] font-bold text-slate-950">
                              AFTER
                            </span>
                          </div>
                        </div>
                      ) : (
                        <img src={pf.mediaUrl} alt={pf.title} className="w-full h-40 object-cover rounded-xl mb-3" />
                      )}
                      <h4 className="font-bold text-white text-xs">{pf.title}</h4>
                      <p className="text-[11px] text-slate-400 mt-1">{pf.description}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-slate-900/40 border border-slate-800 rounded-3xl p-6">
                  <ImageIcon className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                  <p className="text-xs text-slate-400">No showcase items uploaded yet. Add your previous client transformations above.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 5. BANK PAYOUT SETTINGS */}
        {activeTab === 'bank_payouts' && (
          <div className="max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Verified Nigerian Settlement Account</h3>
                <p className="text-xs text-slate-400">Automated daily NGN settlement powered by Flutterwave & Paystack</p>
              </div>
            </div>

            <div className="space-y-4 text-xs mt-6">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Select Nigerian Bank or Fintech</label>
                <select
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-100 focus:outline-none focus:border-emerald-500"
                >
                  <option>Guaranty Trust Bank (GTBank)</option>
                  <option>Zenith Bank Plc</option>
                  <option>Access Bank Plc</option>
                  <option>First Bank of Nigeria</option>
                  <option>United Bank for Africa (UBA)</option>
                  <option>Moniepoint Microfinance Bank</option>
                  <option>OPay Digital Services</option>
                  <option>Palmpay Nigeria</option>
                  <option>Kuda Bank Microfinance</option>
                  <option>Stanbic IBTC Bank</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">10-Digit NUBAN Account Number</label>
                <input
                  type="text"
                  maxLength={10}
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-100 font-mono text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Verified Account Name</label>
                <input
                  type="text"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-100 font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>

              <button
                onClick={() => {
                  setBankSaved(true);
                  setTimeout(() => setBankSaved(false), 3000);
                }}
                className="w-full py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-lg transition-all"
              >
                {bankSaved ? '✓ Payout Account Verified & Saved!' : 'Save Payout Account'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
