'use client';

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Logo, BoostSymbol } from './Logo';
import { 
  ArrowRight, 
  Sparkles, 
  Store, 
  Megaphone, 
  Users, 
  Search, 
  ShieldCheck, 
  CheckCircle2, 
  MapPin, 
  MessageSquare, 
  Layers, 
  TrendingUp, 
  Zap, 
  ChevronRight,
  SlidersHorizontal,
  Compass,
  FileText,
  Key,
  DollarSign,
  Package,
  Wrench,
  Tag,
  Check
} from 'lucide-react';

export const LandingPageView: React.FC = () => {
  const { 
    setActiveView, 
    businesses, 
    categories, 
    setSelectedCategory, 
    setSearchQuery, 
    isAuthenticated,
    viewBusinessDetail
  } = useApp();

  const [heroSearchInput, setHeroSearchInput] = useState('');

  const handleHeroSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (heroSearchInput.trim()) {
      setSearchQuery(heroSearchInput.trim());
    }
    setActiveView('discover');
  };

  const handleCategoryClick = (catId: string) => {
    setSelectedCategory(catId);
    setActiveView('discover');
  };

  // Curated list of confirmed real top-level categories
  const topCategories = [
    { id: 'cat_retail', name: 'Retail & Shopping', icon: Package },
    { id: 'cat_food', name: 'Food & Restaurants', icon: Store },
    { id: 'cat_tech', name: 'Technology & Digital', icon: Zap },
    { id: 'cat_services', name: 'Professional Services', icon: Wrench },
    { id: 'cat_fashion', name: 'Fashion & Apparel', icon: Tag },
    { id: 'cat_health', name: 'Health & Wellness', icon: Sparkles }
  ];

  return (
    <div className="w-full bg-[#071A17] text-slate-100 selection:bg-[#16C784] selection:text-[#071A17] overflow-x-hidden">
      
      {/* ========================================================================
          1. HERO SECTION — Professional Visual Identity with Official Glass Emblem
          ======================================================================== */}
      <section className="relative pt-12 pb-20 md:pt-20 md:pb-28 px-4 sm:px-6 lg:px-8 border-b border-[#16C784]/20">
        
        {/* Luminous Ambient Background Glows */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[450px] bg-gradient-to-b from-[#A3FF12]/15 via-[#16C784]/10 to-transparent blur-[120px] pointer-events-none -z-10" />
        <div className="absolute top-1/3 -left-48 w-96 h-96 bg-[#14B8A6]/10 rounded-full blur-[100px] pointer-events-none -z-10" />
        <div className="absolute bottom-10 -right-48 w-96 h-96 bg-[#A3FF12]/10 rounded-full blur-[100px] pointer-events-none -z-10" />

        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            
            {/* Left Column: Core Positioning & Search (7 cols) */}
            <div className="lg:col-span-7 flex flex-col items-start text-left z-10">
              
              {/* Official AI-Powered Tagline Pill */}
              <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-[#16C784]/10 border border-[#16C784]/30 backdrop-blur-md mb-6">
                <span className="w-2 h-2 rounded-full bg-[#A3FF12] animate-pulse" />
                <span className="text-xs sm:text-sm font-semibold tracking-wide text-[#A3FF12] uppercase font-sans">
                  AI-Powered Advertising Platform
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  • Nigeria
                </span>
              </div>

              {/* Marquee Headline */}
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-white tracking-tight leading-[1.08] mb-6">
                AI-Powered Advertising <br />
                <span className="bm-gradient-text">for Growing Businesses</span>
              </h1>

              {/* Clear Product Positioning Statement */}
              <p className="text-base sm:text-lg text-slate-300 max-w-xl leading-relaxed mb-8">
                Create, promote and discover businesses, products, services and advertisements in one unified platform. Boost Market connects verified Nigerian merchants with active local customers.
              </p>

              {/* Interactive Search Bar / Discovery Trigger */}
              <form onSubmit={handleHeroSearch} className="w-full max-w-xl mb-8">
                <div className="relative flex items-center p-1.5 rounded-2xl bg-[#0B2521]/90 border border-[#16C784]/40 shadow-[0_8px_30px_rgba(0,0,0,0.6)] focus-within:border-[#A3FF12] focus-within:ring-2 focus-within:ring-[#A3FF12]/20 transition-all">
                  <Search className="w-5 h-5 text-[#16C784] ml-3.5 shrink-0" />
                  <input
                    id="hero-search-input"
                    type="text"
                    value={heroSearchInput}
                    onChange={(e) => setHeroSearchInput(e.target.value)}
                    placeholder="Search businesses, products, services, or ads..."
                    className="w-full bg-transparent px-3 py-2.5 text-sm sm:text-base text-white placeholder:text-slate-400 focus:outline-none"
                  />
                  <button
                    id="hero-search-submit-btn"
                    type="submit"
                    className="px-5 py-2.5 rounded-xl btn-bm-primary text-xs sm:text-sm font-bold flex items-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    <span>Search</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>

              {/* Primary Dual CTA System */}
              <div className="flex flex-wrap items-center gap-4 mb-8 w-full sm:w-auto">
                <button
                  id="hero-primary-cta-btn"
                  onClick={() => setActiveView(isAuthenticated ? 'merchant_dashboard' : 'register')}
                  className="w-full sm:w-auto px-7 py-3.5 rounded-xl btn-bm-primary text-sm sm:text-base font-bold flex items-center justify-center gap-2 cursor-pointer shadow-lg"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{isAuthenticated ? 'Go to Business Hub' : 'Get Started'}</span>
                </button>

                <button
                  id="hero-secondary-cta-btn"
                  onClick={() => setActiveView('discover')}
                  className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-[#16C784]/30 hover:border-[#16C784]/60 text-sm sm:text-base font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Store className="w-4 h-4 text-[#A3FF12]" />
                  <span>Explore Businesses</span>
                </button>
              </div>

              {/* Verified Trust Badges (Real Capabilities Only) */}
              <div className="flex flex-wrap items-center gap-y-2 gap-x-6 text-xs text-slate-300 pt-3 border-t border-white/10 w-full">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#16C784]" />
                  <span>Verified Merchant Profiles</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#A3FF12]" />
                  <span>Direct WhatsApp Inquiries</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#14B8A6]" />
                  <span>Multi-Domain Search</span>
                </div>
              </div>

            </div>

            {/* Right Column: Official 3D Glassmorphic Emblem Card (5 cols) */}
            <div className="lg:col-span-5 flex justify-center items-center relative">
              
              <div className="relative w-full max-w-[420px] flex justify-center items-center">
                
                {/* Official 3D Glassmorphism Brand Badge from Prototype Reference */}
                <Logo variant="badge" size="xl" showTagline={true} />

                {/* Floating Interactive Badge (Direct WhatsApp Connect) */}
                <div className="absolute -bottom-5 -left-4 sm:-left-6 p-3 rounded-2xl bg-[#0B2521]/95 border border-[#16C784]/40 shadow-xl backdrop-blur-xl flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#16C784]/20 border border-[#16C784]/40 flex items-center justify-center text-[#A3FF12] shrink-0">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-slate-200">Customer Connect</div>
                    <div className="text-[10px] text-[#A3FF12] font-semibold">Direct WhatsApp messaging</div>
                  </div>
                </div>

                {/* Floating Interactive Badge (AI Marketing Engine) */}
                <div className="absolute -top-3 -right-4 sm:-right-6 p-3 rounded-2xl bg-[#0B2521]/95 border border-[#A3FF12]/40 shadow-xl backdrop-blur-xl flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#A3FF12]/20 border border-[#A3FF12]/40 flex items-center justify-center text-[#A3FF12] shrink-0">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-slate-200">AI Copy & Storyboards</div>
                    <div className="text-[10px] text-slate-400">Integrated Gemini engine</div>
                  </div>
                </div>

              </div>

            </div>

          </div>
        </div>
      </section>


      {/* ========================================================================
          2. PRODUCT POSITIONING FLOW — The Real Platform Mechanism
          ======================================================================== */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 border-b border-[#16C784]/15 bg-[#051513]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-6">
            <span className="text-xs font-bold text-[#A3FF12] uppercase tracking-wider">
              Core Platform Flow
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-xs sm:text-sm font-semibold">
            <div className="px-3.5 py-2 rounded-xl bg-[#09221E] border border-[#16C784]/30 text-white flex items-center gap-2">
              <Store className="w-4 h-4 text-[#A3FF12]" />
              <span>Business</span>
            </div>
            <span className="text-[#16C784] font-bold">→</span>
            <div className="px-3.5 py-2 rounded-xl bg-[#09221E] border border-[#16C784]/30 text-white flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-[#16C784]" />
              <span>Create Advertisement</span>
            </div>
            <span className="text-[#16C784] font-bold">→</span>
            <div className="px-3.5 py-2 rounded-xl bg-[#09221E] border border-[#16C784]/30 text-white flex items-center gap-2">
              <Compass className="w-4 h-4 text-[#14B8A6]" />
              <span>Promote / Discover</span>
            </div>
            <span className="text-[#16C784] font-bold">→</span>
            <div className="px-3.5 py-2 rounded-xl bg-[#09221E] border border-[#16C784]/30 text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-[#A3FF12]" />
              <span>Reach Customers</span>
            </div>
            <span className="text-[#16C784] font-bold">→</span>
            <div className="px-3.5 py-2 rounded-xl bg-[#09221E] border border-[#16C784]/30 text-white flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-[#16C784]" />
              <span>Engage Directly</span>
            </div>
          </div>
        </div>
      </section>


      {/* ========================================================================
          3. HOW BOOST MARKET WORKS — 4 Clean Practical Steps
          ======================================================================== */}
      <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8 border-b border-[#16C784]/20 bg-[#071A17]">
        <div className="max-w-7xl mx-auto">
          
          <div className="text-center max-w-2xl mx-auto mb-16">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#16C784]/15 border border-[#16C784]/30 text-xs font-bold text-[#A3FF12] uppercase tracking-wider mb-3">
              <Zap className="w-3.5 h-3.5" />
              <span>How It Works</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Get Started in Four Simple Steps
            </h2>
            <p className="text-slate-300 text-sm sm:text-base mt-3 leading-relaxed">
              Launch your commercial presence and connect with prospective customers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            
            {/* Step 1 */}
            <div className="p-6 rounded-2xl bg-[#09221E] border border-[#16C784]/25 relative">
              <div className="text-3xl font-black text-[#A3FF12] mb-3">01</div>
              <h3 className="text-lg font-bold text-white mb-2">Create Your Business</h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Set up your official business profile with city location, categories, operating hours, and verified contact information.
              </p>
            </div>

            {/* Step 2 */}
            <div className="p-6 rounded-2xl bg-[#09221E] border border-[#16C784]/25 relative">
              <div className="text-3xl font-black text-[#16C784] mb-3">02</div>
              <h3 className="text-lg font-bold text-white mb-2">Create Your Advertisement</h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Promote your products or services with pricing, imagery, targeted descriptions, and direct WhatsApp contact options.
              </p>
            </div>

            {/* Step 3 */}
            <div className="p-6 rounded-2xl bg-[#09221E] border border-[#16C784]/25 relative">
              <div className="text-3xl font-black text-[#14B8A6] mb-3">03</div>
              <h3 className="text-lg font-bold text-white mb-2">Get Discovered</h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Customers can discover businesses, products, services, and advertisements through dedicated real-time search.
              </p>
            </div>

            {/* Step 4 */}
            <div className="p-6 rounded-2xl bg-[#09221E] border border-[#16C784]/25 relative">
              <div className="text-3xl font-black text-[#A3FF12] mb-3">04</div>
              <h3 className="text-lg font-bold text-white mb-2">Connect and Grow</h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Engage directly with interested buyers via WhatsApp and utilize platform tools to manage your offerings and visibility.
              </p>
            </div>

          </div>

          <div className="mt-12 text-center">
            <button
              id="how-it-works-cta-btn"
              onClick={() => setActiveView(isAuthenticated ? 'merchant_dashboard' : 'register')}
              className="px-8 py-3.5 rounded-xl btn-bm-primary text-sm sm:text-base font-bold inline-flex items-center gap-2 cursor-pointer shadow-lg"
            >
              <span>{isAuthenticated ? 'Open Business Hub' : 'Register Your Business'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </div>
      </section>


      {/* ========================================================================
          4. DISCOVERY & SEARCH SECTION — Real Multi-Domain Exploration
          ======================================================================== */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-b border-[#16C784]/15 bg-[#051513]">
        <div className="max-w-7xl mx-auto">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
            <div>
              <div className="flex items-center gap-2 text-[#A3FF12] text-xs font-bold uppercase tracking-wider mb-2">
                <Compass className="w-4 h-4" />
                <span>Commercial Discovery</span>
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight">
                Discover Verified Businesses, Products & Services
              </h2>
              <p className="text-sm sm:text-base text-slate-400 mt-2 max-w-xl">
                Boost Market provides four dedicated search engines to connect buyers and sellers across Nigerian commerce.
              </p>
            </div>

            <button
              id="landing-view-directory-btn"
              onClick={() => setActiveView('discover')}
              className="inline-flex items-center gap-2 text-sm font-bold text-[#16C784] hover:text-[#A3FF12] transition-colors cursor-pointer self-start md:self-auto"
            >
              <span>Open Directory & Search</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* 4 Search Capabilities Showcase */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
            <div 
              onClick={() => setActiveView('discover')}
              className="p-5 rounded-2xl bg-[#09221E] border border-[#16C784]/25 hover:border-[#16C784]/60 transition-all cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-xl bg-[#16C784]/15 flex items-center justify-center text-[#A3FF12] mb-3">
                <Store className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white group-hover:text-[#A3FF12] transition-colors">
                Business Search
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Locate verified commercial merchants, physical stores, and registered companies by name, category, or city.
              </p>
            </div>

            <div 
              onClick={() => setActiveView('discover')}
              className="p-5 rounded-2xl bg-[#09221E] border border-[#16C784]/25 hover:border-[#16C784]/60 transition-all cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-xl bg-[#16C784]/15 flex items-center justify-center text-[#A3FF12] mb-3">
                <Package className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white group-hover:text-[#A3FF12] transition-colors">
                Product Search
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Find specific catalog items, inventory goods, and retail products with transparent pricing and stock flags.
              </p>
            </div>

            <div 
              onClick={() => setActiveView('discover')}
              className="p-5 rounded-2xl bg-[#09221E] border border-[#16C784]/25 hover:border-[#16C784]/60 transition-all cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-xl bg-[#16C784]/15 flex items-center justify-center text-[#A3FF12] mb-3">
                <Wrench className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white group-hover:text-[#A3FF12] transition-colors">
                Service Search
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Explore professional services with delivery modes: on-premise, remote, or hybrid delivery options.
              </p>
            </div>

            <div 
              onClick={() => setActiveView('discover')}
              className="p-5 rounded-2xl bg-[#09221E] border border-[#16C784]/25 hover:border-[#16C784]/60 transition-all cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-xl bg-[#16C784]/15 flex items-center justify-center text-[#A3FF12] mb-3">
                <Megaphone className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white group-hover:text-[#A3FF12] transition-colors">
                Advertisement Search
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Browse active promotional advertisements, discounts, and commercial offers from verified merchants.
              </p>
            </div>
          </div>

          {/* Quick Category Grid */}
          <div className="mb-10">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
              Browse by Industry Sector
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {topCategories.map((cat) => {
                const IconComponent = cat.icon;
                return (
                  <button
                    key={cat.id}
                    onClick={() => handleCategoryClick(cat.id)}
                    className="p-3.5 rounded-xl bg-[#09221E]/80 hover:bg-[#0E322C] border border-[#16C784]/20 hover:border-[#16C784]/50 text-left transition-all cursor-pointer flex items-center gap-2.5 group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-[#16C784]/10 group-hover:bg-[#16C784]/20 text-[#A3FF12] flex items-center justify-center shrink-0">
                      <IconComponent className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-semibold text-white group-hover:text-[#A3FF12] transition-colors line-clamp-1">
                      {cat.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Live Verified Businesses from Database */}
          {businesses.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Featured Verified Businesses
                </span>
                <span className="text-xs text-[#16C784]">
                  Active in Nigerian Centers
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {businesses.slice(0, 4).map((biz) => (
                  <div
                    key={biz.id}
                    onClick={() => viewBusinessDetail(biz.id)}
                    className="p-4 rounded-2xl bg-[#09221E]/90 border border-[#16C784]/25 hover:border-[#A3FF12]/60 hover:shadow-lg transition-all cursor-pointer flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-[#16C784]/20 text-[#A3FF12] border border-[#16C784]/30">
                          {biz.category || 'Business'}
                        </span>
                        {Boolean(biz.isVerified) && (
                          <div className="flex items-center gap-1 text-[10px] text-[#16C784] font-bold">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Verified</span>
                          </div>
                        )}
                      </div>
                      <h4 className="font-bold text-sm sm:text-base text-white hover:text-[#A3FF12] transition-colors line-clamp-1">
                        {biz.name}
                      </h4>
                      <p className="text-xs text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                        {biz.description || 'Verified commercial business listing on Boost Market.'}
                      </p>
                    </div>

                    <div className="pt-3 mt-3 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-[#16C784]" />
                        <span className="truncate max-w-[120px]">{biz.location?.city || 'Nigeria'}</span>
                      </div>
                      <span className="text-[#A3FF12] font-semibold text-[11px] group-hover:underline">
                        View Profile →
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </section>


      {/* ========================================================================
          5. REAL FEATURES SECTION — Confirmed Functional Capabilities
          ======================================================================== */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 border-b border-[#16C784]/20 bg-[#071A17]">
        <div className="max-w-7xl mx-auto">
          
          <div className="text-center max-w-2xl mx-auto mb-16">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#16C784]/15 border border-[#16C784]/30 text-xs font-bold text-[#A3FF12] uppercase tracking-wider mb-3">
              <Layers className="w-3.5 h-3.5" />
              <span>Core Features</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Built for Commercial Growth
            </h2>
            <p className="text-slate-300 text-sm sm:text-base mt-3 leading-relaxed">
              Every tool and capability is engineered to establish your digital presence and connect you with customers.
            </p>
          </div>

          {/* Asymmetric Bento-Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Bento Card 1: Verified Digital Storefront (Col-Span 2 on Desktop) */}
            <div className="md:col-span-2 p-8 rounded-3xl bg-[#09221E]/90 border border-[#16C784]/30 relative overflow-hidden group hover:border-[#16C784]/60 transition-all">
              <div className="absolute top-0 right-0 w-80 h-80 bg-[#16C784]/10 rounded-full blur-3xl pointer-events-none" />
              
              <div className="relative z-10">
                <div className="flex items-center gap-2 text-xs font-bold text-[#A3FF12] tracking-wider uppercase mb-2">
                  <span>01. Digital Presence</span>
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">
                  Verified Merchant Business Profiles
                </h3>
                <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-xl mb-6">
                  Establish your official business profile with verified physical address, operating hours (including split shifts), telephone contact, and direct WhatsApp customer chat integration.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div className="p-3.5 rounded-xl bg-black/30 border border-white/10">
                    <ShieldCheck className="w-4 h-4 text-[#16C784] mb-1.5" />
                    <div className="text-xs font-bold text-white">Trust Verification</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">Admin-audited verified badge</div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-black/30 border border-white/10">
                    <MessageSquare className="w-4 h-4 text-[#A3FF12] mb-1.5" />
                    <div className="text-xs font-bold text-white">Direct WhatsApp</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">One-click customer chat</div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-black/30 border border-white/10">
                    <MapPin className="w-4 h-4 text-[#14B8A6] mb-1.5" />
                    <div className="text-xs font-bold text-white">Geolocation</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">Target local city customers</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bento Card 2: Security & Authentication (Col-Span 1) */}
            <div className="p-8 rounded-3xl bg-[#09221E]/90 border border-[#16C784]/30 relative overflow-hidden group hover:border-[#16C784]/60 transition-all flex flex-col justify-between">
              <div>
                <div className="text-xs font-bold text-[#A3FF12] tracking-wider uppercase mb-2">
                  02. Account Protection
                </div>
                <h3 className="text-xl font-bold text-white mb-2">
                  Enterprise Security & 2FA
                </h3>
                <p className="text-slate-300 text-xs sm:text-sm leading-relaxed mb-4">
                  Multi-layered authentication with cryptographic email verification, bcrypt password hashing, and optional TOTP two-factor authentication.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-black/40 border border-[#16C784]/20 space-y-2 mt-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-medium">Password Hashing</span>
                  <span className="text-[#16C784] font-bold">Bcrypt 12 Rounds</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-medium">Two-Factor Auth</span>
                  <span className="text-[#A3FF12] font-bold">TOTP Authenticator</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-medium">Session Protection</span>
                  <span className="text-[#14B8A6] font-bold">Secure JWT</span>
                </div>
              </div>
            </div>

            {/* Bento Card 3: AI Marketing Engine (Col-Span 1) */}
            <div id="ai-marketing-card" className="p-8 rounded-3xl bg-[#09221E]/90 border border-[#16C784]/30 relative overflow-hidden group hover:border-[#A3FF12]/60 transition-all flex flex-col justify-between">
              <div>
                <div className="text-xs font-bold text-[#A3FF12] tracking-wider uppercase mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>03. AI Studio</span>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">
                  AI Marketing Copywriter
                </h3>
                <p className="text-slate-300 text-xs sm:text-sm leading-relaxed mb-4">
                  Generate promotional headlines, audience hooks, commercial copy, and 4-scene video storyboards in seconds using our integrated Gemini engine.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-black/40 border border-[#A3FF12]/20">
                <div className="text-[11px] text-slate-300 italic">
                  &ldquo;Premium tailored outfits handcrafted in Kaduna. Order directly on WhatsApp today.&rdquo;
                </div>
              </div>
            </div>

            {/* Bento Card 4: Catalog & Product Management (Col-Span 1) */}
            <div className="p-8 rounded-3xl bg-[#09221E]/90 border border-[#16C784]/30 relative overflow-hidden group hover:border-[#16C784]/60 transition-all flex flex-col justify-between">
              <div>
                <div className="text-xs font-bold text-[#A3FF12] tracking-wider uppercase mb-2">
                  04. Catalog
                </div>
                <h3 className="text-xl font-bold text-white mb-2">
                  Products & Services
                </h3>
                <p className="text-slate-300 text-xs sm:text-sm leading-relaxed mb-4">
                  Publish catalog products and service offerings with detailed descriptions, imagery, starting prices, and delivery options.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-black/30 border border-white/10 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#16C784]/20 flex items-center justify-center text-[#16C784] font-bold text-xs">
                  ₦
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Item Pricing & Delivery</div>
                  <div className="text-[11px] text-slate-400">On-premise, remote, or hybrid</div>
                </div>
              </div>
            </div>

            {/* Bento Card 5: Invoicing Engine (Col-Span 1) */}
            <div className="p-8 rounded-3xl bg-[#09221E]/90 border border-[#16C784]/30 relative overflow-hidden group hover:border-[#16C784]/60 transition-all flex flex-col justify-between">
              <div>
                <div className="text-xs font-bold text-[#A3FF12] tracking-wider uppercase mb-2">
                  05. Billing
                </div>
                <h3 className="text-xl font-bold text-white mb-2">
                  Multi-Currency Invoicing
                </h3>
                <p className="text-slate-300 text-xs sm:text-sm leading-relaxed mb-4">
                  Generate professional customer invoices with dynamic foreign exchange rates supporting NGN, USD, GBP, EUR, and AED.
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2 text-[10px] font-bold">
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-[#A3FF12] border border-emerald-500/30">NGN</span>
                <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">USD</span>
                <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">GBP</span>
                <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">EUR</span>
              </div>
            </div>

          </div>

          <div className="mt-8 text-center">
            <p className="text-xs text-slate-400 italic">
              More capabilities coming as Boost Market expands.
            </p>
          </div>

        </div>
      </section>


      {/* ========================================================================
          6. AI MARKETING COPYWRITER SECTION — Real Functional AI Feature
          ======================================================================== */}
      <section id="ai-marketing" className="py-20 px-4 sm:px-6 lg:px-8 border-b border-[#16C784]/20 bg-[#051513] relative">
        <div className="max-w-7xl mx-auto">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            <div className="lg:col-span-6">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#A3FF12]/15 border border-[#A3FF12]/30 text-xs font-bold text-[#A3FF12] uppercase tracking-wider mb-4">
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI Marketing Engine</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-4">
                Create Better Marketing Content with AI
              </h2>
              <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-6">
                Boost Market includes an integrated AI copywriter powered by Google Gemini. It assists merchants in crafting targeted promotional headlines, commercial body copy, audience hooks, and 4-scene video storyboards.
              </p>

              <div className="space-y-3 mb-8">
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#16C784]/20 border border-[#16C784]/40 flex items-center justify-center text-[#A3FF12] shrink-0 mt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-white">Commercial Ad Headlines: </span>
                    <span className="text-xs sm:text-sm text-slate-300">Creates attention-grabbing titles tailored to your products and services.</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#16C784]/20 border border-[#16C784]/40 flex items-center justify-center text-[#A3FF12] shrink-0 mt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-white">4-Scene Video Storyboards: </span>
                    <span className="text-xs sm:text-sm text-slate-300">Generates scene descriptions and voiceover scripts for video advertising.</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#16C784]/20 border border-[#16C784]/40 flex items-center justify-center text-[#A3FF12] shrink-0 mt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-white">Audience Hooks: </span>
                    <span className="text-xs sm:text-sm text-slate-300">Formulates compelling value propositions that drive customer inquiries.</span>
                  </div>
                </div>
              </div>

              <button
                id="ai-section-cta-btn"
                onClick={() => {
                  if (isAuthenticated) {
                    setActiveView('merchant_dashboard');
                  } else {
                    setActiveView('register');
                  }
                }}
                className="px-6 py-3 rounded-xl btn-bm-lime text-xs sm:text-sm font-bold inline-flex items-center gap-2 cursor-pointer shadow-md"
              >
                <span>Try AI Marketing in Merchant Hub</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* AI Studio Interactive UI Preview */}
            <div className="lg:col-span-6">
              <div className="p-6 rounded-3xl bg-[#09221E] border border-[#16C784]/30 shadow-2xl relative">
                <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#A3FF12]" />
                    <span className="text-xs font-bold text-white">AI Marketing Generator</span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#16C784]/20 text-[#A3FF12] border border-[#16C784]/30">
                    Server-Side Gemini
                  </span>
                </div>

                <div className="space-y-4 text-xs">
                  <div className="p-3.5 rounded-xl bg-black/40 border border-white/10">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Generated Headline
                    </span>
                    <p className="text-sm font-extrabold text-[#A3FF12]">
                      &ldquo;Elevate Your Style with Custom Bespoke Wear in Kaduna&rdquo;
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-black/40 border border-white/10">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Promotional Ad Body
                    </span>
                    <p className="text-slate-300 leading-relaxed">
                      Experience precision tailoring, premium fabrics, and rapid turnaround times. Direct delivery across Kaduna State and nationwide courier dispatch.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-black/40 border border-[#14B8A6]/20">
                    <span className="text-[10px] font-bold text-[#14B8A6] uppercase tracking-wider block mb-1">
                      Storyboard Scene 1 (Hook • 0–3s)
                    </span>
                    <p className="text-slate-300">
                      <strong className="text-white">Visual:</strong> Close-up shot of hand-stitched embroidery on premium fabric.<br />
                      <strong className="text-white">Narration:</strong> &ldquo;Quality tailoring that speaks before you do.&rdquo;
                    </p>
                  </div>
                </div>
              </div>
            </div>

          </div>

        </div>
      </section>


      {/* ========================================================================
          7. DUAL CALL TO ACTION — Business CTA & Discovery CTA
          ======================================================================== */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-[#071A17] to-[#041210]">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Card 1: For Businesses */}
          <div className="p-8 sm:p-10 rounded-3xl bg-[#09221E] border border-[#16C784]/40 shadow-xl flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-[#071A17] border border-[#16C784]/30 flex items-center justify-center text-[#A3FF12] mb-6">
                <Store className="w-6 h-6" />
              </div>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-white mb-3">
                Ready to put your business in front of more customers?
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed mb-6">
                Register your business, publish promotional advertisements, organize your catalog, and receive direct WhatsApp customer inquiries.
              </p>
            </div>

            <button
              id="business-cta-btn"
              onClick={() => setActiveView(isAuthenticated ? 'merchant_dashboard' : 'register')}
              className="w-full py-3.5 rounded-xl btn-bm-primary text-sm font-bold flex items-center justify-center gap-2 cursor-pointer shadow-lg"
            >
              <span>{isAuthenticated ? 'Open Business Hub' : 'Register Your Business'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Card 2: For Discoverers / Shoppers */}
          <div className="p-8 sm:p-10 rounded-3xl bg-[#09221E] border border-[#16C784]/40 shadow-xl flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-[#071A17] border border-[#16C784]/30 flex items-center justify-center text-[#14B8A6] mb-6">
                <Compass className="w-6 h-6" />
              </div>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-white mb-3">
                Discover businesses, products and services.
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed mb-6">
                Explore verified businesses, catalog items, services, and commercial offers across Nigerian metropolitan centers.
              </p>
            </div>

            <button
              id="discovery-cta-btn"
              onClick={() => setActiveView('discover')}
              className="w-full py-3.5 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-[#16C784]/30 hover:border-[#16C784]/60 text-sm font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Store className="w-4 h-4 text-[#A3FF12]" />
              <span>Explore Boost Directory</span>
            </button>
          </div>

        </div>
      </section>

    </div>
  );
};
