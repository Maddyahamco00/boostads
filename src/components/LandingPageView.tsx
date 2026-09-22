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
  Video,
  Award,
  ExternalLink,
  Target
} from 'lucide-react';

export const LandingPageView: React.FC = () => {
  const { 
    setActiveView, 
    businesses, 
    advertisements, 
    categories, 
    setSelectedCategory, 
    setSearchQuery, 
    setIsCreateAdModalOpen,
    isAuthenticated,
    viewBusinessDetail,
    viewAdDetail
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

  // Curated list of confirmed real categories with intuitive icons
  const quickCategories = [
    { id: 'cat_retail', name: 'Retail & Shopping', count: businesses.filter(b => b.category === 'cat_retail' || b.category === 'Retail').length || 'Browse' },
    { id: 'cat_food', name: 'Food & Restaurants', count: businesses.filter(b => b.category === 'cat_food' || b.category === 'Food & Beverage').length || 'Browse' },
    { id: 'cat_tech', name: 'Technology & Electronics', count: businesses.filter(b => b.category === 'cat_tech' || b.category === 'Technology').length || 'Browse' },
    { id: 'cat_services', name: 'Professional Services', count: businesses.filter(b => b.category === 'cat_services' || b.category === 'Services').length || 'Browse' },
    { id: 'cat_fashion', name: 'Fashion & Apparel', count: businesses.filter(b => b.category === 'cat_fashion' || b.category === 'Fashion').length || 'Browse' },
    { id: 'cat_health', name: 'Health & Wellness', count: businesses.filter(b => b.category === 'cat_health' || b.category === 'Healthcare').length || 'Browse' },
  ];

  return (
    <div className="w-full bg-[#071A17] text-slate-100 selection:bg-[#16C784] selection:text-[#071A17] overflow-hidden">
      
      {/* ========================================================================
          HERO SECTION — High Visual Impact with Official 3D Glass Emblem Tile
          ======================================================================== */}
      <section className="relative pt-12 pb-20 md:pt-20 md:pb-32 px-4 sm:px-6 lg:px-8 border-b border-[#16C784]/20">
        
        {/* Luminous Ambient Background Glows */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[450px] bg-gradient-to-b from-[#A3FF12]/15 via-[#16C784]/10 to-transparent blur-[120px] pointer-events-none -z-10" />
        <div className="absolute top-1/3 -left-48 w-96 h-96 bg-[#14B8A6]/10 rounded-full blur-[100px] pointer-events-none -z-10" />
        <div className="absolute bottom-10 -right-48 w-96 h-96 bg-[#A3FF12]/10 rounded-full blur-[100px] pointer-events-none -z-10" />

        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            
            {/* Left Column: Core Value Proposition & Action (7 cols) */}
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
                Smart Advertising. <br />
                <span className="bm-gradient-text">Better Results.</span> <br />
                Powered by AI.
              </h1>

              {/* Subtitle describing true platform mechanism */}
              <p className="text-base sm:text-lg text-slate-300 max-w-xl leading-relaxed mb-8">
                Boost Market connects growing businesses across Kaduna, Lagos, Abuja, and nationwide. Create verified profiles, generate high-converting AI marketing copy, launch targeted ads, and receive direct customer leads via WhatsApp.
              </p>

              {/* Interactive Search Bar / Discovery Trigger */}
              <form onSubmit={handleHeroSearch} className="w-full max-w-xl mb-8">
                <div className="relative flex items-center p-1.5 rounded-2xl bg-[#0B2521]/90 border border-[#16C784]/40 shadow-[0_8px_30px_rgba(0,0,0,0.6)] focus-within:border-[#A3FF12] focus-within:ring-2 focus-within:ring-[#A3FF12]/20 transition-all">
                  <Search className="w-5 h-5 text-[#16C784] ml-3.5 shrink-0" />
                  <input
                    type="text"
                    value={heroSearchInput}
                    onChange={(e) => setHeroSearchInput(e.target.value)}
                    placeholder="Search businesses, products, services, or ads..."
                    className="w-full bg-transparent px-3 py-2.5 text-sm sm:text-base text-white placeholder:text-slate-400 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl btn-bm-primary text-xs sm:text-sm font-bold flex items-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    <span>Search</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>

              {/* Primary Dual CTA System */}
              <div className="flex flex-wrap items-center gap-4 mb-10 w-full sm:w-auto">
                <button
                  onClick={() => setActiveView(isAuthenticated ? 'merchant_dashboard' : 'register')}
                  className="w-full sm:w-auto px-7 py-3.5 rounded-xl btn-bm-primary text-sm sm:text-base font-bold flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{isAuthenticated ? 'Go to Business Hub' : 'Get Started — Register Business'}</span>
                </button>

                <button
                  onClick={() => setActiveView('discover')}
                  className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-[#16C784]/30 hover:border-[#16C784]/60 text-sm sm:text-base font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Store className="w-4 h-4 text-[#A3FF12]" />
                  <span>Explore Businesses & Ads</span>
                </button>
              </div>

              {/* Verified Trust Badges (Real Capabilities Only) */}
              <div className="flex flex-wrap items-center gap-y-2 gap-x-6 text-xs text-slate-300 pt-2 border-t border-white/10 w-full">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#16C784]" />
                  <span>Verified Merchant Profiles</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#A3FF12]" />
                  <span>Direct WhatsApp Inbound Leads</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#14B8A6]" />
                  <span>Multi-City Geo Targeting</span>
                </div>
              </div>

            </div>

            {/* Right Column: Official 3D Glassmorphic Emblem Card (5 cols) */}
            <div className="lg:col-span-5 flex justify-center items-center relative">
              
              {/* Outer decorative halo */}
              <div className="relative w-full max-w-[420px] flex justify-center items-center">
                
                {/* Official 3D Glassmorphism Brand Badge from Prototype */}
                <Logo variant="badge" size="xl" showTagline={true} />

                {/* Floating Interactive Badge (Direct WhatsApp Connect) */}
                <div className="absolute -bottom-6 -left-4 sm:-left-8 p-3.5 rounded-2xl bg-[#0B2521]/95 border border-[#16C784]/40 shadow-xl backdrop-blur-xl flex items-center gap-3 animate-bounce [animation-duration:4s]">
                  <div className="w-10 h-10 rounded-xl bg-[#16C784]/20 border border-[#16C784]/40 flex items-center justify-center text-[#A3FF12] shrink-0">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-slate-200">Instant Customer Leads</div>
                    <div className="text-[10px] text-[#A3FF12] font-semibold">Direct WhatsApp routing</div>
                  </div>
                </div>

                {/* Floating Interactive Badge (AI Marketing Engine) */}
                <div className="absolute -top-4 -right-4 sm:-right-6 p-3 rounded-2xl bg-[#0B2521]/95 border border-[#A3FF12]/40 shadow-xl backdrop-blur-xl flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#A3FF12]/20 border border-[#A3FF12]/40 flex items-center justify-center text-[#A3FF12] shrink-0">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-slate-200">AI Copy & Storyboards</div>
                    <div className="text-[10px] text-slate-400">Gemini 2.5 Flash Engine</div>
                  </div>
                </div>

              </div>

            </div>

          </div>
        </div>
      </section>


      {/* ========================================================================
          DISCOVERY & CATEGORY EXPLORATION — Instant Navigation into Real Data
          ======================================================================== */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 border-b border-[#16C784]/15 bg-[#051513]">
        <div className="max-w-7xl mx-auto">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
            <div>
              <div className="flex items-center gap-2 text-[#A3FF12] text-xs font-bold uppercase tracking-wider mb-2">
                <Compass className="w-4 h-4" />
                <span>Marketplace Discovery</span>
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight">
                Discover Verified Businesses & Offers
              </h2>
              <p className="text-sm sm:text-base text-slate-400 mt-2 max-w-xl">
                Explore local commercial establishments, catalogs, active promotional ads, and professional services across Nigerian metropolitan centers.
              </p>
            </div>

            <button
              onClick={() => setActiveView('discover')}
              className="inline-flex items-center gap-2 text-sm font-bold text-[#16C784] hover:text-[#A3FF12] transition-colors cursor-pointer self-start md:self-auto"
            >
              <span>View Full Directory</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Category Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-12">
            {quickCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleCategoryClick(cat.id)}
                className="group p-4 rounded-2xl bg-[#09221E]/80 hover:bg-[#0E322C] border border-[#16C784]/20 hover:border-[#16C784]/60 text-left transition-all duration-200 cursor-pointer flex flex-col justify-between"
              >
                <div className="w-10 h-10 rounded-xl bg-[#16C784]/10 group-hover:bg-[#16C784]/20 border border-[#16C784]/30 flex items-center justify-center text-[#A3FF12] mb-3 transition-colors">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs sm:text-sm font-bold text-white group-hover:text-[#A3FF12] transition-colors line-clamp-2">
                    {cat.name}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                    <span>{cat.count}</span>
                    <span>listings</span>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Live Platform Highlights (Real Items from Database) */}
          {businesses.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Featured Verified Merchants
                </span>
                <span className="text-xs text-[#16C784]">
                  Kaduna • Lagos • Abuja
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
                      <h3 className="font-bold text-sm sm:text-base text-white hover:text-[#A3FF12] transition-colors line-clamp-1">
                        {biz.name}
                      </h3>
                      <p className="text-xs text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                        {biz.description || 'Verified commercial business listing on Boost Market.'}
                      </p>
                    </div>

                    <div className="pt-3 mt-3 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-[#16C784]" />
                        <span className="truncate max-w-[120px]">{biz.location?.city || 'Kaduna'}</span>
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
          CORE CAPABILITIES — Bento-Grid Layout (Confirmed Real Features Only)
          ======================================================================== */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 border-b border-[#16C784]/20 bg-[#071A17]">
        <div className="max-w-7xl mx-auto">
          
          <div className="text-center max-w-2xl mx-auto mb-16">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#16C784]/15 border border-[#16C784]/30 text-xs font-bold text-[#A3FF12] uppercase tracking-wider mb-3">
              <Layers className="w-3.5 h-3.5" />
              <span>Full-Stack Advertising Platform</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Everything Your Business Needs to Grow
            </h2>
            <p className="text-slate-300 text-sm sm:text-base mt-3 leading-relaxed">
              Real capabilities built specifically for commercial merchants, service providers, and consumers.
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
                  Set up your official business profile with verified address, operating hours, phone contact, social profiles, and instant WhatsApp chat integration. Customers can find and contact you in seconds.
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
                    <div className="text-xs font-bold text-white">Geo Location</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">Target local city customers</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bento Card 2: Multi-City Ad Campaigns (Col-Span 1) */}
            <div className="p-8 rounded-3xl bg-[#09221E]/90 border border-[#16C784]/30 relative overflow-hidden group hover:border-[#16C784]/60 transition-all flex flex-col justify-between">
              <div>
                <div className="text-xs font-bold text-[#A3FF12] tracking-wider uppercase mb-2">
                  02. Targeted Reach
                </div>
                <h3 className="text-xl font-bold text-white mb-2">
                  Multi-Tier Ad Campaigns
                </h3>
                <p className="text-slate-300 text-xs sm:text-sm leading-relaxed mb-4">
                  Create and publish promotional advertisements with custom pricing, media, call-to-action buttons, and targeted regional distribution.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-black/40 border border-[#16C784]/20 space-y-2 mt-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-medium">Standard Campaign</span>
                  <span className="text-[#16C784] font-bold">Active</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-medium">City-Targeted Distribution</span>
                  <span className="text-[#A3FF12] font-bold">Kaduna / Lagos</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-medium">Direct Inbound Leads</span>
                  <span className="text-[#14B8A6] font-bold">Tracked</span>
                </div>
              </div>
            </div>

            {/* Bento Card 3: AI Marketing Studio (Col-Span 1) */}
            <div id="ai-marketing" className="p-8 rounded-3xl bg-[#09221E]/90 border border-[#16C784]/30 relative overflow-hidden group hover:border-[#A3FF12]/60 transition-all flex flex-col justify-between">
              <div>
                <div className="text-xs font-bold text-[#A3FF12] tracking-wider uppercase mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>03. AI Studio</span>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">
                  AI Marketing Copy & Storyboards
                </h3>
                <p className="text-slate-300 text-xs sm:text-sm leading-relaxed mb-4">
                  Generate compelling marketing headlines, audience hooks, ad descriptions, and 4-scene video storyboards in seconds using our integrated Gemini engine.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-black/40 border border-[#A3FF12]/20">
                <div className="flex items-center gap-2 text-xs font-bold text-[#A3FF12] mb-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  <span>Instant Commercial Copy</span>
                </div>
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
                  Products & Services Inventory
                </h3>
                <p className="text-slate-300 text-xs sm:text-sm leading-relaxed mb-4">
                  Organize your offerings with detailed pricing, high-resolution media, category hierarchy, and real-time availability statuses.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-black/30 border border-white/10 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#16C784]/20 flex items-center justify-center text-[#16C784] font-bold text-xs">
                  ₦
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Transparent Pricing</div>
                  <div className="text-[11px] text-slate-400">Fixed, negotiable, or quote-based</div>
                </div>
              </div>
            </div>

            {/* Bento Card 5: Inbound Leads Hub & Pipeline (Col-Span 1) */}
            <div className="p-8 rounded-3xl bg-[#09221E]/90 border border-[#16C784]/30 relative overflow-hidden group hover:border-[#16C784]/60 transition-all flex flex-col justify-between">
              <div>
                <div className="text-xs font-bold text-[#A3FF12] tracking-wider uppercase mb-2">
                  05. Sales Pipeline
                </div>
                <h3 className="text-xl font-bold text-white mb-2">
                  Customer Lead Management
                </h3>
                <p className="text-slate-300 text-xs sm:text-sm leading-relaxed mb-4">
                  Track every customer who shows interest. Manage lead states from New to Contacted, Qualified, and Closed directly inside your Merchant Hub.
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">New</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">Contacted</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#16C784]/20 text-[#A3FF12] border border-[#16C784]/30">Closed</span>
              </div>
            </div>

          </div>

        </div>
      </section>


      {/* ========================================================================
          HOW IT WORKS — 4 Clear Practical Steps
          ======================================================================== */}
      <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8 border-b border-[#16C784]/20 bg-[#051513]">
        <div className="max-w-7xl mx-auto">
          
          <div className="text-center max-w-2xl mx-auto mb-16">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#16C784]/15 border border-[#16C784]/30 text-xs font-bold text-[#A3FF12] uppercase tracking-wider mb-3">
              <Zap className="w-3.5 h-3.5" />
              <span>Simple Workflow</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              How Boost Market Works
            </h2>
            <p className="text-slate-300 text-sm sm:text-base mt-3 leading-relaxed">
              Launch your business presence and reach potential customers in four simple steps.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            
            {/* Step 1 */}
            <div className="p-6 rounded-2xl bg-[#09221E] border border-[#16C784]/25 relative">
              <div className="text-3xl font-black text-[#A3FF12] mb-3">01</div>
              <h3 className="text-lg font-bold text-white mb-2">Register Business</h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Create your authenticated account and complete your verified business profile with city location and WhatsApp contact.
              </p>
            </div>

            {/* Step 2 */}
            <div className="p-6 rounded-2xl bg-[#09221E] border border-[#16C784]/25 relative">
              <div className="text-3xl font-black text-[#16C784] mb-3">02</div>
              <h3 className="text-lg font-bold text-white mb-2">Upload Catalog</h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Add your products and services with images, descriptions, pricing, and appropriate category tags.
              </p>
            </div>

            {/* Step 3 */}
            <div className="p-6 rounded-2xl bg-[#09221E] border border-[#16C784]/25 relative">
              <div className="text-3xl font-black text-[#14B8A6] mb-3">03</div>
              <h3 className="text-lg font-bold text-white mb-2">Launch Ad Campaigns</h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Use the AI Studio to craft high-impact ad copy and publish promotions targeted to your city or nationwide.
              </p>
            </div>

            {/* Step 4 */}
            <div className="p-6 rounded-2xl bg-[#09221E] border border-[#16C784]/25 relative">
              <div className="text-3xl font-black text-[#A3FF12] mb-3">04</div>
              <h3 className="text-lg font-bold text-white mb-2">Convert Inbound Leads</h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Receive direct inquiries from customers via WhatsApp, track lead pipeline in your dashboard, and grow sales.
              </p>
            </div>

          </div>

          <div className="mt-12 text-center">
            <button
              onClick={() => setActiveView(isAuthenticated ? 'merchant_dashboard' : 'register')}
              className="px-8 py-3.5 rounded-xl btn-bm-primary text-sm sm:text-base font-bold inline-flex items-center gap-2 cursor-pointer shadow-lg"
            >
              <span>{isAuthenticated ? 'Open Merchant Hub' : 'Register Your Business Now'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </div>
      </section>


      {/* ========================================================================
          AI MARKETING SHOWCASE — Real Functional Feature Highlight
          ======================================================================== */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-b border-[#16C784]/20 bg-[#071A17] relative">
        <div className="max-w-7xl mx-auto">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            <div className="lg:col-span-6">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#A3FF12]/15 border border-[#A3FF12]/30 text-xs font-bold text-[#A3FF12] uppercase tracking-wider mb-4">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Gemini-Powered Engine</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-4">
                Generate High-Converting Ad Copy & Video Storyboards
              </h2>
              <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-6">
                Never struggle with writing marketing content again. Boost Market includes an integrated AI copywriter that crafts targeted headlines, body copy, audience hooks, and multi-scene video ad scripts tailored to your specific business offerings.
              </p>

              <div className="space-y-3 mb-8">
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#16C784]/20 border border-[#16C784]/40 flex items-center justify-center text-[#A3FF12] shrink-0 mt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-white">Automated Commercial Headlines: </span>
                    <span className="text-xs sm:text-sm text-slate-300">Creates attention-grabbing titles optimized for customer click-through.</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#16C784]/20 border border-[#16C784]/40 flex items-center justify-center text-[#A3FF12] shrink-0 mt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-white">4-Scene Video Storyboards: </span>
                    <span className="text-xs sm:text-sm text-slate-300">Detailed visual descriptions, voiceover scripts, and duration tags for video ads.</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#16C784]/20 border border-[#16C784]/40 flex items-center justify-center text-[#A3FF12] shrink-0 mt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-white">Target Audience Segmentation: </span>
                    <span className="text-xs sm:text-sm text-slate-300">Identifies who to target based on product category and city demographics.</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  if (isAuthenticated) {
                    setActiveView('merchant_dashboard');
                  } else {
                    setActiveView('register');
                  }
                }}
                className="px-6 py-3 rounded-xl btn-bm-lime text-xs sm:text-sm font-bold inline-flex items-center gap-2 cursor-pointer"
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
                    Live Engine
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
          FINAL CONVERSION BANNER — High Contrast Call to Action
          ======================================================================== */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-[#071A17] to-[#041210]">
        <div className="max-w-5xl mx-auto p-8 sm:p-12 md:p-16 rounded-[36px] bg-[#09221E] border border-[#16C784]/40 shadow-2xl relative overflow-hidden text-center">
          
          {/* Ambient Glow */}
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#16C784]/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10">
            <div className="inline-flex items-center justify-center p-2 rounded-2xl bg-[#071A17] border border-[#16C784]/30 mb-6">
              <BoostSymbol size={48} />
            </div>

            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight mb-4">
              Ready to Grow with Boost Market?
            </h2>

            <p className="text-slate-300 text-sm sm:text-base max-w-xl mx-auto mb-8 leading-relaxed">
              Join merchants across Nigeria advertising and discovering verified products, services, and commercial offers on one unified platform.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4">
              <button
                onClick={() => setActiveView(isAuthenticated ? 'merchant_dashboard' : 'register')}
                className="px-8 py-3.5 rounded-xl btn-bm-primary text-sm sm:text-base font-bold flex items-center justify-center gap-2 cursor-pointer shadow-xl"
              >
                <span>{isAuthenticated ? 'Open Business Hub' : 'Register Your Business'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => setActiveView('discover')}
                className="px-8 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-[#16C784]/30 hover:border-[#16C784]/60 text-sm sm:text-base font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Store className="w-4 h-4 text-[#A3FF12]" />
                <span>Explore Directory</span>
              </button>
            </div>

            {/* Prototype Footer Tagline Echo */}
            <div className="mt-12 pt-6 border-t border-white/10 text-xs text-slate-400 flex flex-wrap items-center justify-center gap-3">
              <span className="font-semibold text-slate-300">Smart advertising. Better results. Powered by AI.</span>
              <span>•</span>
              <span>© {new Date().getFullYear()} Boost Market. All rights reserved.</span>
            </div>
          </div>

        </div>
      </section>

    </div>
  );
};
