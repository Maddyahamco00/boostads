'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { 
  PlusCircle, 
  ArrowRight, 
  Sparkles, 
  Flame, 
  MapPin, 
  TrendingUp, 
  ShieldCheck, 
  SlidersHorizontal, 
  Search, 
  Eye, 
  Users, 
  Zap, 
  CheckCircle2, 
  Store, 
  MessageSquare, 
  Layers, 
  Target, 
  BarChart3, 
  ChevronRight,
  ExternalLink,
  DollarSign
} from 'lucide-react';
import { AdvertisementCard } from './AdvertisementCard';
import { Advertisement, Business } from '../types';

export const DiscoverView: React.FC = () => {
  const { 
    advertisements, 
    businesses, 
    categories, 
    currentLocation, 
    searchQuery, 
    setSearchQuery, 
    selectedCategory, 
    setSelectedCategory, 
    setIsCreateAdModalOpen,
    setActiveView,
    viewBusinessDetail
  } = useApp();

  // Feed Filter States
  const [feedTab, setFeedTab] = useState<'all' | 'promoted' | 'nearby' | 'trending' | 'businesses'>('all');
  const [selectedRadiusKm, setSelectedRadiusKm] = useState<number>(25);

  // Interactive Reach Calculator State
  const [calcBudget, setCalcBudget] = useState<number>(5000);

  // Filter advertisements based on search, tab, category, and location
  const filteredAds = useMemo(() => {
    return advertisements.filter(ad => {
      // Category Match
      if (selectedCategory && selectedCategory !== 'all') {
        const catMatch = ad.category?.toLowerCase() === selectedCategory.toLowerCase() ||
                         ad.businessCategory?.toLowerCase() === selectedCategory.toLowerCase();
        if (!catMatch) return false;
      }

      // Search Query Match
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const textMatch = ad.title?.toLowerCase().includes(q) ||
                          ad.description?.toLowerCase().includes(q) ||
                          ad.businessName?.toLowerCase().includes(q) ||
                          ad.tags?.some(t => t.toLowerCase().includes(q));
        if (!textMatch) return false;
      }

      // Tab Match
      if (feedTab === 'promoted') {
        return ad.isBoosted === true;
      }
      if (feedTab === 'nearby') {
        return ad.location?.city?.toLowerCase() === currentLocation?.city?.toLowerCase();
      }
      if (feedTab === 'trending') {
        return (ad.viewsCount || 0) > 100 || ad.isBoosted;
      }

      return true;
    }).sort((a, b) => {
      // Boosted ads always take visual priority in the discovery stream
      if (a.isBoosted && !b.isBoosted) return -1;
      if (!a.isBoosted && b.isBoosted) return 1;
      return (b.viewsCount || 0) - (a.viewsCount || 0);
    });
  }, [advertisements, selectedCategory, searchQuery, feedTab, currentLocation]);

  // Filtered businesses for the business directory tab
  const filteredBusinesses = useMemo(() => {
    return businesses.filter(b => {
      if (selectedCategory && selectedCategory !== 'all') {
        if (b.category?.toLowerCase() !== selectedCategory.toLowerCase()) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return b.name.toLowerCase().includes(q) || b.description.toLowerCase().includes(q);
      }
      return true;
    });
  }, [businesses, selectedCategory, searchQuery]);

  const scrollToFeed = () => {
    const el = document.getElementById('advertising-feed');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleOpenBusiness = (bizId: string) => {
    viewBusinessDetail(bizId);
  };

  // Reach estimates for calculator
  const estimatedReach = Math.floor(calcBudget * 2.8);
  const estimatedClicks = Math.floor(calcBudget * 0.14);
  const estimatedLeads = Math.max(3, Math.floor(calcBudget * 0.018));

  return (
    <div id="discover-view-container" className="min-h-screen pb-24 text-slate-900 dark:text-slate-100 transition-colors">
      
      {/* 1. HERO SECTION: High-Impact Business Advertising Proposition */}
      <section className="relative overflow-hidden pt-12 sm:pt-20 pb-16 sm:pb-24 px-4 sm:px-6 lg:px-8 border-b border-slate-200/80 dark:border-slate-800/80">
        
        {/* Subtle Ambient Background Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full overflow-hidden pointer-events-none -z-10">
          <div className="absolute top-[-10%] left-[20%] w-[500px] h-[500px] rounded-full bg-indigo-500/10 dark:bg-indigo-600/15 blur-3xl" />
          <div className="absolute top-[20%] right-[15%] w-[450px] h-[450px] rounded-full bg-cyan-500/10 dark:bg-cyan-500/15 blur-3xl" />
          <div className="absolute bottom-[-10%] left-[40%] w-[600px] h-[300px] rounded-full bg-purple-500/10 dark:bg-purple-600/15 blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            
            {/* Left Column: Core Value Message & Action */}
            <div className="lg:col-span-7 space-y-6 sm:space-y-8 text-center lg:text-left">
              
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold tracking-wide glass-pill text-indigo-700 dark:text-cyan-300">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-cyan-400" />
                <span>The Premier Business Advertising Network</span>
              </div>

              {/* Main Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.08] text-slate-900 dark:text-white">
                Put Your Business in Front of the <span className="brand-gradient-text">Right People.</span>
              </h1>

              {/* Supporting Subtitle */}
              <p className="text-base sm:text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                Create, promote, and manage high-impact business advertisements. Distribute locally or across social platforms to connect with ready-to-buy customers.
              </p>

              {/* Primary & Secondary Call to Actions */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 sm:gap-4 pt-2">
                <button
                  id="hero-advertise-btn"
                  onClick={() => setIsCreateAdModalOpen(true)}
                  className="btn-advertise w-full sm:w-auto px-7 py-3.5 rounded-2xl text-base font-bold flex items-center justify-center gap-2.5 shadow-lg cursor-pointer"
                >
                  <PlusCircle className="w-5 h-5" />
                  <span>Advertise Your Business</span>
                </button>

                <button
                  id="hero-explore-btn"
                  onClick={scrollToFeed}
                  className="w-full sm:w-auto px-7 py-3.5 rounded-2xl text-base font-bold glass-card hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-white flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <span>Explore Advertisements</span>
                  <ArrowRight className="w-4 h-4 text-indigo-500" />
                </button>
              </div>

              {/* Quick Proof Metrics Strip */}
              <div className="pt-6 border-t border-slate-200/80 dark:border-slate-800 grid grid-cols-3 gap-4 max-w-lg mx-auto lg:mx-0">
                <div>
                  <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">250K+</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">Ad Impressions</div>
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-black text-indigo-600 dark:text-cyan-400">18.5K+</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">Customer Leads</div>
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">99.4%</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">Local Delivery</div>
                </div>
              </div>

            </div>

            {/* Right Column: Live Interactive Advertisement Showcase */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="relative w-full max-w-md">
                
                {/* Floating Signal Ping */}
                <div className="absolute -top-3 -right-3 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-600 text-white text-xs font-bold shadow-lg animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-cyan-300" />
                  <span>Live Ad Stream</span>
                </div>

                {/* Showcased Active Advertisement */}
                {advertisements.length > 0 ? (
                  <div className="transform hover:-rotate-1 transition-transform duration-300">
                    <AdvertisementCard 
                      ad={advertisements[0]} 
                      featured={true} 
                      onViewBusiness={handleOpenBusiness}
                    />
                  </div>
                ) : (
                  <div className="glass-card p-6 rounded-3xl text-center">
                    <p className="text-sm text-slate-500">Loading live advertisements...</p>
                  </div>
                )}

                {/* Floating Reach Badge Card */}
                <div className="absolute -bottom-5 -left-4 sm:-left-6 z-20 glass-panel p-3 sm:p-4 rounded-2xl shadow-xl flex items-center gap-3 border border-white/40 dark:border-slate-700/80">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-cyan-400 flex items-center justify-center text-white shrink-0">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">Hyper-Local Radius</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">Targeted in {currentLocation.city}</div>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 2. HOW BOOST MARKET WORKS: Strategic Advertising Journey */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 border-b border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/30">
        <div className="max-w-7xl mx-auto">
          
          <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold glass-pill text-indigo-600 dark:text-cyan-400 mb-3">
              <span>The Advertising Engine</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              From Creation to Measurable Customer Results
            </h2>
            <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-slate-300">
              Businesses register on Boost Market to advertise products, services, and offers directly to ready customers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6 relative">
            
            {/* Step 1 */}
            <div className="glass-card p-6 rounded-2xl flex flex-col justify-between relative group hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors">
              <div>
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-cyan-400 flex items-center justify-center font-black text-sm mb-4">
                  01
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1.5">
                  Business Registers
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  Establish your verified business profile, location, contact, and catalog showcase.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="glass-card p-6 rounded-2xl flex flex-col justify-between relative group hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors">
              <div>
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-cyan-400 flex items-center justify-center font-black text-sm mb-4">
                  02
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1.5">
                  Create Advertisement
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  Upload visual media, craft compelling headlines, offers, and direct WhatsApp / call CTAs.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="glass-card p-6 rounded-2xl flex flex-col justify-between relative group border-indigo-400/50 dark:border-indigo-500/50 shadow-md">
              <div>
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center font-black text-sm mb-4">
                  03
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1.5">
                  Boost & Distribute
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  Supercharge reach across Boost Market feeds, Facebook, Instagram, Google, and your local city.
                </p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="glass-card p-6 rounded-2xl flex flex-col justify-between relative group hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors">
              <div>
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-cyan-400 flex items-center justify-center font-black text-sm mb-4">
                  04
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1.5">
                  People Discover
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  Audience discovers verified ads nearby, compares promotions, and reviews credentials.
                </p>
              </div>
            </div>

            {/* Step 5 */}
            <div className="glass-card p-6 rounded-2xl flex flex-col justify-between relative group hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors">
              <div>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black text-sm mb-4">
                  05
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1.5">
                  Business Gets Results
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  Receive direct WhatsApp messages, phone calls, walk-in visits, and tracked sales.
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 3. DISCOVERY & ADVERTISING FEED: Primary Interactive Center */}
      <section id="advertising-feed" className="py-14 sm:py-18 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        
        {/* Feed Header Controls */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-slate-200/80 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Active Advertising Marketplace
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight mt-1">
              Explore Live Advertisements & Offers
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Showing active campaigns in <span className="font-semibold text-slate-800 dark:text-slate-200">{currentLocation.city}</span> and nationwide.
            </p>
          </div>

          {/* Feed Filter Segmented Controls */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 glass-pill rounded-2xl self-start md:self-auto">
            <button
              onClick={() => setFeedTab('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                feedTab === 'all'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All Ads ({advertisements.length})
            </button>

            <button
              onClick={() => setFeedTab('promoted')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                feedTab === 'promoted'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>Promoted First</span>
            </button>

            <button
              onClick={() => setFeedTab('nearby')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                feedTab === 'nearby'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Nearby ({currentLocation.city})</span>
            </button>

            <button
              onClick={() => setFeedTab('trending')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                feedTab === 'trending'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Trending</span>
            </button>

            <button
              onClick={() => setFeedTab('businesses')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                feedTab === 'businesses'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Store className="w-3.5 h-3.5" />
              <span>Businesses ({businesses.length})</span>
            </button>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="pt-4 pb-6 flex items-center gap-2 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold shadow-xs'
                : 'glass-pill text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800'
            }`}
          >
            All Categories
          </button>

          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(c.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedCategory === c.id
                  ? 'bg-indigo-600 text-white font-bold shadow-xs'
                  : 'glass-pill text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800'
              }`}
            >
              <span>{c.iconName || '🏷️'}</span>
              <span>{c.name}</span>
            </button>
          ))}
        </div>

        {/* FEED CONTENT: Advertisement Cards or Business Profiles */}
        {feedTab !== 'businesses' ? (
          <div>
            {filteredAds.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7">
                {filteredAds.map((ad, idx) => (
                  <AdvertisementCard 
                    key={ad.id} 
                    ad={ad} 
                    business={businesses.find(b => b.id === ad.businessId)}
                    onViewBusiness={handleOpenBusiness}
                    featured={idx === 0 && feedTab === 'all'}
                  />
                ))}
              </div>
            ) : (
              <div className="glass-card rounded-3xl p-12 text-center max-w-md mx-auto my-8">
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-cyan-400 flex items-center justify-center mx-auto mb-4">
                  <Search className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">No advertisements found</h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-2">
                  No campaigns matched your current search or category filters. Try clearing your filters or be the first to advertise here!
                </p>
                <button
                  onClick={() => {
                    setSelectedCategory('all');
                    setSearchQuery('');
                    setFeedTab('all');
                  }}
                  className="mt-5 px-5 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  Clear All Filters
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Business Directory Showcase Tab */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7">
            {filteredBusinesses.map((biz) => (
              <div 
                key={biz.id}
                onClick={() => handleOpenBusiness(biz.id)}
                className="glass-card rounded-2xl overflow-hidden cursor-pointer group hover:border-indigo-400 dark:hover:border-indigo-500 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="h-32 w-full relative bg-slate-900">
                    <img 
                      src={biz.coverImageUrl || 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=600&auto=format&fit=crop&q=80'} 
                      alt={biz.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    
                    <div className="absolute -bottom-5 left-4 w-14 h-14 rounded-xl overflow-hidden border-2 border-white dark:border-slate-800 bg-white shadow-md">
                      <img src={biz.logoUrl} alt={biz.name} className="w-full h-full object-cover" />
                    </div>
                  </div>

                  <div className="pt-7 p-5">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-cyan-400 transition-colors flex items-center gap-1.5">
                        <span>{biz.name}</span>
                        {biz.isVerified && <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-cyan-400" />}
                      </h3>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 capitalize">
                        {biz.category}
                      </span>
                    </div>

                    <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300 line-clamp-2">
                      {biz.description}
                    </p>

                    <div className="mt-3.5 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                      <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                      <span>{biz.location?.city}, {biz.location?.state}</span>
                    </div>
                  </div>
                </div>

                <div className="px-5 pb-5 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="text-xs text-slate-500">
                    <span className="font-bold text-slate-800 dark:text-slate-200">{advertisements.filter(a => a.businessId === biz.id).length}</span> Active Ads
                  </div>
                  <button className="text-xs font-bold text-indigo-600 dark:text-cyan-400 hover:underline flex items-center gap-1">
                    <span>View Business</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

      </section>

      {/* 4. VALUE COMPARISON / BENEFITS SECTION */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 border-y border-slate-200/80 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-900/40">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-center">
          
          {/* For Businesses */}
          <div className="glass-panel p-8 sm:p-10 rounded-3xl relative overflow-hidden">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-600 dark:text-cyan-400 mb-4">
              <BarChart3 className="w-3.5 h-3.5" />
              <span>For Business Advertisers</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-4">
              Why Businesses Grow on Boost Market
            </h3>
            <ul className="space-y-4 text-sm sm:text-base text-slate-600 dark:text-slate-300">
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-indigo-600 dark:text-cyan-400 shrink-0 mt-0.5" />
                <span><strong>Targeted Hyper-Local Distribution:</strong> Put promotions directly in front of active customers in your city, district, or nationwide.</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-indigo-600 dark:text-cyan-400 shrink-0 mt-0.5" />
                <span><strong>Zero Middleman Commissions:</strong> Customers message you directly on WhatsApp or call you. You keep 100% of your earnings.</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-indigo-600 dark:text-cyan-400 shrink-0 mt-0.5" />
                <span><strong>Multi-Platform Ad Boost:</strong> Syndicate your campaign across Facebook, Instagram, Google, and local networks in 1 click.</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-indigo-600 dark:text-cyan-400 shrink-0 mt-0.5" />
                <span><strong>Transparent Real-Time Analytics:</strong> Monitor views, reach, clicks, inquiries, and conversion metrics on your dashboard.</span>
              </li>
            </ul>

            <div className="mt-8">
              <button
                onClick={() => setIsCreateAdModalOpen(true)}
                className="btn-advertise px-6 py-3 rounded-xl text-sm font-bold flex items-center gap-2 cursor-pointer"
              >
                <span>Launch Your Advertisement</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Interactive Reach Calculator */}
          <div className="glass-card p-8 sm:p-10 rounded-3xl border-indigo-400/40 dark:border-indigo-500/40 shadow-xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 mb-4">
              <Zap className="w-3.5 h-3.5" />
              <span>Reach Estimator</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-2">
              Estimate Your Audience Reach
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-6">
              Adjust your daily ad budget to calculate your projected reach and lead inquiries.
            </p>

            {/* Budget Slider */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Campaign Ad Spend</span>
                <span className="text-lg font-black text-indigo-600 dark:text-cyan-400">
                  ₦{calcBudget.toLocaleString()}
                </span>
              </div>

              <input 
                type="range"
                min="1000"
                max="50000"
                step="1000"
                value={calcBudget}
                onChange={(e) => setCalcBudget(Number(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer h-2 bg-slate-200 dark:bg-slate-700 rounded-lg"
              />
              <div className="flex justify-between text-[11px] text-slate-400 font-medium">
                <span>₦1,000 Starter</span>
                <span>₦25,000 Growth</span>
                <span>₦50,000 Enterprise</span>
              </div>
            </div>

            {/* Metric Projections */}
            <div className="mt-8 grid grid-cols-3 gap-3 text-center">
              <div className="p-3.5 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50">
                <div className="text-xl sm:text-2xl font-black text-indigo-600 dark:text-cyan-400">
                  {estimatedReach.toLocaleString()}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold mt-0.5">
                  Est. Reach
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50">
                <div className="text-xl sm:text-2xl font-black text-indigo-600 dark:text-cyan-400">
                  {estimatedClicks.toLocaleString()}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold mt-0.5">
                  Est. Clicks
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/50">
                <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">
                  {estimatedLeads.toLocaleString()}+
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold mt-0.5">
                  Direct Leads
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 mt-4 text-center">
              Based on aggregated multi-platform distribution benchmarks across Nigerian commercial cities.
            </p>
          </div>

        </div>
      </section>

      {/* 5. BOTTOM CALL TO ACTION BANNER */}
      <section className="pt-16 sm:pt-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="glass-card rounded-3xl p-8 sm:p-14 text-center relative overflow-hidden border-indigo-500/30 shadow-2xl">
          
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-64 h-64 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-2xl mx-auto space-y-4">
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
              Ready to Accelerate Your Business Growth?
            </h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300">
              Launch your first advertisement in minutes. Reach targeted buyers in {currentLocation.city} and turn discovery into measurable revenue.
            </p>

            <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => setIsCreateAdModalOpen(true)}
                className="btn-advertise px-8 py-3.5 rounded-2xl text-base font-bold shadow-lg flex items-center gap-2 cursor-pointer"
              >
                <PlusCircle className="w-5 h-5" />
                <span>Start Advertising Today</span>
              </button>
            </div>
          </div>

        </div>
      </section>

    </div>
  );
};
