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
  Megaphone
} from 'lucide-react';

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
  const [accountName, setAccountName] = useState(userBiz?.name || 'Boost Market Merchant');
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
      alert('Product created.');
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
          category: userBiz.categoryLabel,
          imageUrls: ['https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop&q=80'],
          durationUnit: 'service',
          deliveryMode: 'on_premise'
        })
      });
      setNewServName('');
      setNewServPrice('');
      setNewServDesc('');
      alert('Service added.');
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
          description: newPfDesc || 'Delivered project',
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
      alert('Portfolio item uploaded.');
      refreshData();
    } catch (err) {
      console.error('Failed to add portfolio:', err);
    }
  };

  return (
    <div id="merchant-dashboard-view" className="min-h-screen bg-gray-50 pb-20 text-gray-900">
      {/* Top Banner */}
      <div className="border-b border-gray-200 bg-white px-4 py-6 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img
              src={userBiz?.logoUrl || 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=200&auto=format&fit=crop&q=80'}
              alt={userBiz?.name}
              className="w-12 h-12 rounded-xl object-cover border border-gray-200"
            />
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-xl font-bold text-gray-900">{userBiz?.name || 'Merchant Dashboard'}</h1>
                <ShieldCheck className="w-4 h-4 text-blue-600" />
              </div>
              <p className="text-xs text-gray-500">
                {userBiz?.categoryLabel} • {userBiz?.location.city}, {userBiz?.location.state}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => viewBusinessDetail(userBiz?.id || '')}
              className="px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>View Profile</span>
            </button>

            <button
              onClick={() => setIsCreateAdModalOpen(true)}
              className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Ad</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between text-gray-500 mb-1">
              <span className="text-xs font-medium">Revenue</span>
              <DollarSign className="w-4 h-4 text-green-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">₦2,850,000</div>
            <div className="text-xs text-green-600 font-medium mt-0.5">
              Settled
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between text-gray-500 mb-1">
              <span className="text-xs font-medium">Leads</span>
              <Users className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{userLeads.length > 0 ? userLeads.length : 48}</div>
            <div className="text-xs text-gray-500 mt-0.5">
              Active inquiries
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between text-gray-500 mb-1">
              <span className="text-xs font-medium">Campaigns</span>
              <Megaphone className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{userCampaigns.length}</div>
            <div className="text-xs text-gray-500 mt-0.5">
              Active campaigns
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between text-gray-500 mb-1">
              <span className="text-xs font-medium">Rating</span>
              <ShieldCheck className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">4.9 / 5.0</div>
            <div className="text-xs text-gray-500 mt-0.5">
              Verified business
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="border-b border-gray-200 flex items-center gap-2 overflow-x-auto text-xs font-medium pb-1">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-2.5 px-3 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'overview' ? 'border-blue-600 text-blue-600 font-semibold' : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            My Ads ({userAds.length})
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`pb-2.5 px-3 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'products' ? 'border-blue-600 text-blue-600 font-semibold' : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            Products
          </button>
          <button
            onClick={() => setActiveTab('services')}
            className={`pb-2.5 px-3 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'services' ? 'border-blue-600 text-blue-600 font-semibold' : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            Services
          </button>
          <button
            onClick={() => setActiveTab('portfolio')}
            className={`pb-2.5 px-3 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'portfolio' ? 'border-blue-600 text-blue-600 font-semibold' : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            Portfolio
          </button>
          <button
            onClick={() => setActiveTab('bank_payouts')}
            className={`pb-2.5 px-3 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'bank_payouts' ? 'border-blue-600 text-blue-600 font-semibold' : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            Payout Settings
          </button>
        </div>
      </div>

      {/* Tab Contents */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        
        {/* 1. ADS TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">Your Advertisements</h2>
              <button
                onClick={() => setIsCreateAdModalOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs transition-colors cursor-pointer"
              >
                + Post Ad
              </button>
            </div>

            {userAds.length === 0 ? (
              <div className="p-8 text-center text-gray-400 bg-white border border-gray-200 rounded-xl text-xs">
                No active ads found. Click "+ Post Ad" to create one.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {userAds.map(ad => (
                  <div key={ad.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden p-4 flex flex-col justify-between shadow-xs">
                    <div>
                      <img src={ad.mediaUrls[0]} alt={ad.title} className="w-full h-36 object-cover rounded-lg mb-3" />
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-semibold text-gray-500">{ad.status}</span>
                        {ad.isBoosted && (
                          <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.2 rounded font-semibold">
                            Boosted
                          </span>
                        )}
                      </div>
                      <h3 className="font-semibold text-gray-900 text-sm mt-1">{ad.title}</h3>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{ad.description}</p>
                    </div>

                    <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                      <span>{ad.viewsCount} views</span>
                      <span>{ad.inquiriesCount} chats</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 2. PRODUCTS TAB */}
        {activeTab === 'products' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 bg-white border border-gray-200 rounded-xl p-5 shadow-xs">
              <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
                <ShoppingBag className="w-4 h-4 text-blue-600" />
                <span>Add Product</span>
              </h2>
              <form onSubmit={handleAddProduct} className="space-y-3 text-xs">
                <div>
                  <label className="block text-gray-700 font-medium mb-1">Product Name</label>
                  <input
                    type="text"
                    value={newProdName}
                    onChange={(e) => setNewProdName(e.target.value)}
                    placeholder="e.g. Leather Bag"
                    className="w-full bg-white border border-gray-200 rounded-lg p-2 text-xs text-gray-900 focus:outline-none focus:border-blue-600"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-1">Price (NGN)</label>
                  <input
                    type="number"
                    value={newProdPrice}
                    onChange={(e) => setNewProdPrice(e.target.value)}
                    placeholder="45000"
                    className="w-full bg-white border border-gray-200 rounded-lg p-2 text-xs text-gray-900 focus:outline-none focus:border-blue-600"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-1">Image URL</label>
                  <input
                    type="text"
                    value={newProdImg}
                    onChange={(e) => setNewProdImg(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-lg p-2 text-xs text-gray-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-1">Description</label>
                  <textarea
                    rows={2}
                    value={newProdDesc}
                    onChange={(e) => setNewProdDesc(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-lg p-2 text-xs text-gray-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs transition-colors cursor-pointer"
                >
                  Save Product
                </button>
              </form>
            </div>

            <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-5 shadow-xs">
              <h2 className="text-sm font-semibold text-gray-900 mb-2">Product Catalog</h2>
              <p className="text-xs text-gray-500">
                Products added here are shown on your business profile.
              </p>
            </div>
          </div>
        )}

        {/* 3. SERVICES TAB */}
        {activeTab === 'services' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 bg-white border border-gray-200 rounded-xl p-5 shadow-xs">
              <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
                <Wrench className="w-4 h-4 text-blue-600" />
                <span>Add Service</span>
              </h2>
              <form onSubmit={handleAddService} className="space-y-3 text-xs">
                <div>
                  <label className="block text-gray-700 font-medium mb-1">Service Title</label>
                  <input
                    type="text"
                    value={newServName}
                    onChange={(e) => setNewServName(e.target.value)}
                    placeholder="e.g. Tailoring"
                    className="w-full bg-white border border-gray-200 rounded-lg p-2 text-xs text-gray-900 focus:outline-none focus:border-blue-600"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-1">Starting Price (NGN)</label>
                  <input
                    type="number"
                    value={newServPrice}
                    onChange={(e) => setNewServPrice(e.target.value)}
                    placeholder="25000"
                    className="w-full bg-white border border-gray-200 rounded-lg p-2 text-xs text-gray-900 focus:outline-none focus:border-blue-600"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-1">Description</label>
                  <textarea
                    rows={2}
                    value={newServDesc}
                    onChange={(e) => setNewServDesc(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-lg p-2 text-xs text-gray-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs transition-colors cursor-pointer"
                >
                  Save Service
                </button>
              </form>
            </div>

            <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-5 shadow-xs">
              <h2 className="text-sm font-semibold text-gray-900 mb-2">Service Offerings</h2>
              <p className="text-xs text-gray-500">
                List services for clients to book and request invoices.
              </p>
            </div>
          </div>
        )}

        {/* 4. PORTFOLIO TAB */}
        {activeTab === 'portfolio' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 bg-white border border-gray-200 rounded-xl p-5 shadow-xs">
              <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-blue-600" />
                <span>Add Portfolio Item</span>
              </h2>
              <form onSubmit={handleAddPortfolio} className="space-y-3 text-xs">
                <div>
                  <label className="block text-gray-700 font-medium mb-1">Title</label>
                  <input
                    type="text"
                    value={newPfTitle}
                    onChange={(e) => setNewPfTitle(e.target.value)}
                    placeholder="Project name"
                    className="w-full bg-white border border-gray-200 rounded-lg p-2 text-xs text-gray-900 focus:outline-none focus:border-blue-600"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-1">Description</label>
                  <textarea
                    rows={2}
                    value={newPfDesc}
                    onChange={(e) => setNewPfDesc(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-lg p-2 text-xs text-gray-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-1">Main Image URL</label>
                  <input
                    type="text"
                    value={newPfImg}
                    onChange={(e) => setNewPfImg(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-lg p-2 text-xs text-gray-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs transition-colors cursor-pointer"
                >
                  Save Item
                </button>
              </form>
            </div>

            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-900">Showcase Gallery</h2>
                <span className="text-xs text-gray-500">{userBiz?.portfolioItems?.length || 0} items</span>
              </div>
              
              {userBiz?.portfolioItems && userBiz.portfolioItems.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {userBiz.portfolioItems.map((pf) => (
                    <div key={pf.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden p-4 shadow-xs">
                      <img src={pf.mediaUrl} alt={pf.title} className="w-full h-36 object-cover rounded-lg mb-2" />
                      <h3 className="font-semibold text-gray-900 text-xs">{pf.title}</h3>
                      <p className="text-[11px] text-gray-500 mt-0.5">{pf.description}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 bg-white border border-gray-200 rounded-xl text-xs text-gray-400">
                  No portfolio items added yet.
                </div>
              )}
            </div>
          </div>
        )}

        {/* 5. BANK PAYOUT SETTINGS */}
        {activeTab === 'bank_payouts' && (
          <div className="max-w-xl bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
            <div className="flex items-center gap-2.5 mb-4">
              <Building2 className="w-5 h-5 text-blue-600" />
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Payout Account Settings</h2>
                <p className="text-xs text-gray-500">Bank account for automated settlements</p>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-gray-700 font-medium mb-1">Bank Name</label>
                <select
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-lg p-2 text-xs text-gray-900 focus:outline-none focus:border-blue-600"
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
                <label className="block text-gray-700 font-medium mb-1">Account Number</label>
                <input
                  type="text"
                  maxLength={10}
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-lg p-2 text-xs font-mono text-gray-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-1">Account Name</label>
                <input
                  type="text"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-lg p-2 text-xs text-gray-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <button
                onClick={() => {
                  setBankSaved(true);
                  setTimeout(() => setBankSaved(false), 2000);
                }}
                className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs transition-colors cursor-pointer"
              >
                {bankSaved ? 'Saved!' : 'Save Payout Details'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
