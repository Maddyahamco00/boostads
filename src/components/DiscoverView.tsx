import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Sparkles, 
  MapPin, 
  Star, 
  ShieldCheck, 
  MessageSquare, 
  ArrowRight, 
  Flame, 
  CheckCircle2, 
  Tag, 
  ExternalLink,
  Phone,
  SlidersHorizontal,
  Share2,
  AlertTriangle,
  Eye,
  Clock,
  Compass,
  ShoppingBag,
  Wrench,
  Utensils,
  Camera,
  Wheat,
  Briefcase,
  Code,
  Heart
} from 'lucide-react';
import { Advertisement, Business, BusinessCategoryType } from '../types';

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  services: <Wrench className="w-4 h-4" />,
  retail: <ShoppingBag className="w-4 h-4" />,
  food_hospitality: <Utensils className="w-4 h-4" />,
  creative: <Camera className="w-4 h-4" />,
  agriculture: <Wheat className="w-4 h-4" />,
  professional: <Briefcase className="w-4 h-4" />,
  tech_development: <Code className="w-4 h-4" />,
  beauty_wellness: <Sparkles className="w-4 h-4" />
};

export const DiscoverView: React.FC = () => {
  const { 
    businesses, 
    advertisements, 
    categories, 
    currentLocation, 
    selectedCategory, 
    setSelectedCategory, 
    searchQuery, 
    setSearchQuery,
    viewBusinessDetail, 
    startChatWithBusiness,
    openReportModal,
    setActiveView,
    setIsCreateAdModalOpen
  } = useApp();

  const [activeTab, setActiveTab] = useState<'all' | 'ads' | 'businesses'>('all');
  const [selectedRadius, setSelectedRadius] = useState<number>(50);
  const [verifiedOnly, setVerifiedOnly] = useState<boolean>(false);
  const [boostedOnly, setBoostedOnly] = useState<boolean>(false);
  const [selectedAdForModal, setSelectedAdForModal] = useState<Advertisement | null>(null);

  // Filter Advertisements
  const filteredAds = advertisements.filter(ad => {
    if (ad.status !== 'active') return false;
    if (selectedCategory !== 'all' && ad.businessCategory !== selectedCategory && !ad.category.toLowerCase().includes(selectedCategory.toLowerCase())) {
      return false;
    }
    if (boostedOnly && !ad.isBoosted) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const match = ad.title.toLowerCase().includes(q) ||
        ad.description.toLowerCase().includes(q) ||
        ad.businessName.toLowerCase().includes(q) ||
        ad.tags.some(t => t.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });

  // Filter Businesses
  const filteredBusinesses = businesses.filter(b => {
    if (selectedCategory !== 'all' && b.category !== selectedCategory) return false;
    if (verifiedOnly && !b.isVerified) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const match = b.name.toLowerCase().includes(q) ||
        b.tagline.toLowerCase().includes(q) ||
        b.description.toLowerCase().includes(q) ||
        b.subcategories.some(sc => sc.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });

  const boostedAds = advertisements.filter(ad => ad.isBoosted && ad.status === 'active');

  const handleShare = (ad: Advertisement) => {
    if (navigator.share) {
      navigator.share({
        title: ad.title,
        text: `Check out "${ad.title}" from ${ad.businessName} on Boost Market!`,
        url: window.location.href
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  return (
    <div id="discover-view-container" className="min-h-screen bg-slate-950 pb-20">
      
      {/* 1. Hero Search & Category Section */}
      <section className="relative overflow-hidden border-b border-slate-800 bg-gradient-to-b from-slate-900 via-slate-900/90 to-slate-950 px-4 pt-8 pb-10 sm:px-6 lg:px-8">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-500/10 via-transparent to-transparent pointer-events-none" />

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Real Boosters SaaS Marketplace • All Business Categories</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
              Discover Local Businesses, Hire Experts & <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-200">Get Paid Instantly</span>
            </h1>
            <p className="mt-3 text-sm sm:text-base text-slate-400 max-w-2xl mx-auto">
              The premier platform for tailors, mechanics, farmers, software engineers, retail shops, and corporate services to advertise and communicate in real time.
            </p>
          </div>

          {/* Quick Filter Control Bar */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 sm:p-4 shadow-xl max-w-4xl mx-auto">
            <div className="flex flex-wrap items-center justify-between gap-3">
              
              {/* Type Switcher */}
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
                <button
                  onClick={() => setActiveTab('all')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    activeTab === 'all' ? 'bg-emerald-500 text-slate-950 font-bold shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  All Listings ({filteredAds.length + filteredBusinesses.length})
                </button>
                <button
                  onClick={() => setActiveTab('ads')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    activeTab === 'ads' ? 'bg-emerald-500 text-slate-950 font-bold shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Advertisements ({filteredAds.length})
                </button>
                <button
                  onClick={() => setActiveTab('businesses')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    activeTab === 'businesses' ? 'bg-emerald-500 text-slate-950 font-bold shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Verified Businesses ({filteredBusinesses.length})
                </button>
              </div>

              {/* Location & Radius */}
              <div className="flex items-center gap-2 text-xs">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="font-semibold">{currentLocation.city}</span>
                </div>

                {/* Radius Select */}
                <select
                  value={selectedRadius}
                  onChange={(e) => setSelectedRadius(Number(e.target.value))}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
                >
                  <option value={10}>Within 10 km</option>
                  <option value={25}>Within 25 km</option>
                  <option value={50}>Within 50 km</option>
                  <option value={200}>State-wide (200 km)</option>
                  <option value={1000}>Nationwide</option>
                </select>
              </div>

              {/* Toggles */}
              <div className="flex items-center gap-2 text-xs">
                <button
                  onClick={() => setBoostedOnly(!boostedOnly)}
                  className={`px-2.5 py-1.5 rounded-lg border flex items-center gap-1 transition-all ${
                    boostedOnly
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 font-semibold'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  <Flame className="w-3 h-3 text-amber-400" />
                  <span>Boosted Only</span>
                </button>

                <button
                  onClick={() => setVerifiedOnly(!verifiedOnly)}
                  className={`px-2.5 py-1.5 rounded-lg border flex items-center gap-1 transition-all ${
                    verifiedOnly
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 font-semibold'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  <span>Verified Only</span>
                </button>
              </div>
            </div>

            {/* Dynamic Category Chips */}
            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center gap-2 overflow-x-auto pb-1 text-xs">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-1.5 rounded-xl whitespace-nowrap font-semibold flex items-center gap-1.5 transition-all ${
                  selectedCategory === 'all'
                    ? 'bg-emerald-500 text-slate-950 shadow-md font-bold'
                    : 'bg-slate-950/80 text-slate-300 border border-slate-800 hover:bg-slate-800'
                }`}
              >
                <Compass className="w-3.5 h-3.5" />
                <span>All Categories</span>
              </button>

              {categories.map((cat) => {
                const isSelected = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-xl whitespace-nowrap font-medium flex items-center gap-1.5 transition-all ${
                      isSelected
                        ? 'bg-emerald-500 text-slate-950 shadow-md font-bold'
                        : 'bg-slate-950/80 text-slate-300 border border-slate-800 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    {CATEGORY_ICONS[cat.id] || <Tag className="w-3.5 h-3.5" />}
                    <span>{cat.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* 2. Spotlight / Boosted Ads Carousel */}
      {boostedAds.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-400">
                <Flame className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                Featured & Boosted Showcase
              </h2>
              <span className="text-xs bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded-full border border-amber-500/30">
                Top Priority
              </span>
            </div>
            <button 
              onClick={() => setIsCreateAdModalOpen(true)}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
            >
              <span>Boost Your Business Ad</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {boostedAds.slice(0, 3).map((ad) => (
              <div
                key={ad.id}
                className="group relative bg-slate-900 border border-amber-500/30 rounded-2xl overflow-hidden shadow-xl hover:border-amber-400/60 transition-all flex flex-col"
              >
                {/* Media Image */}
                <div className="relative h-48 w-full overflow-hidden bg-slate-950">
                  <img
                    src={ad.mediaUrls[0] || 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop&q=80'}
                    alt={ad.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
                  
                  {/* Boosted Pill */}
                  <div className="absolute top-3 left-3 flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/90 text-slate-950 font-black text-[10px] tracking-wider uppercase shadow">
                    <Flame className="w-3 h-3" /> Boosted {ad.boostPlan?.type || 'Featured'}
                  </div>

                  {/* Price Tag */}
                  {ad.price && (
                    <div className="absolute top-3 right-3 px-3 py-1 rounded-xl bg-slate-950/90 border border-slate-700 text-white font-bold text-xs shadow-lg">
                      ₦{ad.price.toLocaleString()}
                      <span className="text-[10px] text-emerald-400 ml-1">
                        (≈ ${(ad.price / 1520).toFixed(0)})
                      </span>
                    </div>
                  )}

                  {/* Business Attribution */}
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <img
                        src={ad.businessLogo}
                        alt={ad.businessName}
                        className="w-6 h-6 rounded-full object-cover border border-amber-400 shadow"
                      />
                      <span className="font-bold text-slate-100 truncate">{ad.businessName}</span>
                    </div>
                    <span className="text-[11px] text-slate-300 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-emerald-400" /> {ad.location.city}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 
                      onClick={() => setSelectedAdForModal(ad)}
                      className="font-bold text-white text-sm hover:text-emerald-400 cursor-pointer line-clamp-2"
                    >
                      {ad.title}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
                      {ad.description}
                    </p>
                  </div>

                  {/* Tags & Action CTAs */}
                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                    <div className="flex flex-wrap gap-1">
                      {ad.tags.slice(0, 2).map((t, idx) => (
                        <span key={idx} className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">
                          #{t}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => startChatWithBusiness(ad.businessId, `Enquiry about: ${ad.title}`, ad.id)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1 shadow-md transition-all"
                      >
                        <MessageSquare className="w-3 h-3" />
                        <span>Chat</span>
                      </button>
                      <button
                        onClick={() => viewBusinessDetail(ad.businessId)}
                        className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                        title="View Business Profile"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 3. Verified Businesses Grid */}
      {(activeTab === 'all' || activeTab === 'businesses') && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                Top Verified Businesses & Professionals ({filteredBusinesses.length})
              </h2>
            </div>
            <span className="text-xs text-slate-400">
              Showing verified entities in {currentLocation.city}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredBusinesses.map((biz) => (
              <div
                key={biz.id}
                className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden hover:border-slate-700 transition-all flex flex-col shadow-lg"
              >
                {/* Cover & Logo */}
                <div className="relative h-28 w-full bg-slate-950">
                  <img
                    src={biz.coverImageUrl}
                    alt={biz.name}
                    className="w-full h-full object-cover opacity-80"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent" />
                  
                  {/* Verified Badge */}
                  {biz.isVerified && (
                    <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold text-[10px] flex items-center gap-1 backdrop-blur-sm">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      <span>Verified Business</span>
                    </div>
                  )}

                  {/* Logo Avatar */}
                  <div className="absolute -bottom-4 left-4">
                    <img
                      src={biz.logoUrl}
                      alt={biz.name}
                      className="w-14 h-14 rounded-xl object-cover border-2 border-slate-900 shadow-md ring-2 ring-emerald-500/30"
                    />
                  </div>
                </div>

                {/* Content */}
                <div className="pt-6 p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 
                          onClick={() => viewBusinessDetail(biz.id)}
                          className="font-bold text-white text-base hover:text-emerald-400 cursor-pointer flex items-center gap-1"
                        >
                          {biz.name}
                        </h3>
                        <p className="text-xs text-emerald-400 font-medium">
                          {biz.categoryLabel}
                        </p>
                      </div>

                      {/* Rating */}
                      <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-bold">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        <span>{biz.rating}</span>
                        <span className="text-[10px] text-slate-400 font-normal">({biz.reviewCount})</span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-400 mt-2 line-clamp-2">
                      {biz.tagline || biz.description}
                    </p>

                    {/* Subcategories */}
                    <div className="mt-3 flex flex-wrap gap-1">
                      {biz.subcategories.slice(0, 3).map((sub, i) => (
                        <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-slate-800/80 text-slate-300">
                          {sub}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Location & CTA */}
                  <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                    <div className="text-slate-400 flex items-center gap-1 text-[11px]">
                      <MapPin className="w-3 h-3 text-slate-500" />
                      <span className="truncate max-w-[120px]">{biz.location.city}, {biz.location.state}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => startChatWithBusiness(biz.id)}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold flex items-center gap-1 border border-slate-700 transition-colors"
                      >
                        <MessageSquare className="w-3 h-3" />
                        <span>Chat</span>
                      </button>

                      <button
                        onClick={() => viewBusinessDetail(biz.id)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold flex items-center gap-1 transition-all"
                      >
                        <span>Profile</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 4. Active Marketplace Ads Grid */}
      {(activeTab === 'all' || activeTab === 'ads') && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-indigo-400">
                <Tag className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                All Marketplace Advertisements ({filteredAds.length})
              </h2>
            </div>
            <button
              onClick={() => setIsCreateAdModalOpen(true)}
              className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
            >
              <span>+ Post Your Ad</span>
            </button>
          </div>

          {filteredAds.length === 0 ? (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center max-w-lg mx-auto">
              <Compass className="w-10 h-10 text-slate-500 mx-auto mb-3" />
              <h3 className="text-base font-bold text-white">No Advertisements Found</h3>
              <p className="text-xs text-slate-400 mt-1">
                Try selecting a different category or adjusting your search filters.
              </p>
              <button
                onClick={() => { setSelectedCategory('all'); setSearchQuery(''); }}
                className="mt-4 px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filteredAds.map((ad) => (
                <div
                  key={ad.id}
                  className="bg-slate-900 border border-slate-800/80 rounded-2xl overflow-hidden hover:border-slate-700 transition-all flex flex-col shadow-lg group"
                >
                  {/* Media Thumbnail */}
                  <div className="relative h-44 w-full bg-slate-950 overflow-hidden">
                    <img
                      src={ad.mediaUrls[0] || 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop&q=80'}
                      alt={ad.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent" />

                    {/* Price Badge */}
                    {ad.price && (
                      <div className="absolute bottom-2.5 left-2.5 px-2.5 py-1 rounded-lg bg-slate-900/90 border border-slate-700 text-white font-bold text-xs shadow">
                        ₦{ad.price.toLocaleString()}
                        <span className="text-[10px] text-emerald-400 ml-1">
                          (≈ ${(ad.price / 1520).toFixed(0)})
                        </span>
                      </div>
                    )}

                    {/* Boosted tag if active */}
                    {ad.isBoosted && (
                      <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md bg-amber-500 text-slate-950 font-black text-[9px] uppercase tracking-wider flex items-center gap-1 shadow">
                        <Flame className="w-2.5 h-2.5" /> Boosted
                      </div>
                    )}

                    {/* Category Tag */}
                    <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-md bg-slate-900/80 backdrop-blur-sm text-slate-300 text-[10px] border border-slate-700">
                      {ad.category}
                    </div>
                  </div>

                  {/* Ad Body */}
                  <div className="p-3.5 flex-1 flex flex-col justify-between">
                    <div>
                      {/* Business link */}
                      <div 
                        onClick={() => viewBusinessDetail(ad.businessId)}
                        className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-emerald-400 cursor-pointer mb-1"
                      >
                        <img
                          src={ad.businessLogo}
                          alt={ad.businessName}
                          className="w-4 h-4 rounded-full object-cover"
                        />
                        <span className="font-semibold truncate">{ad.businessName}</span>
                      </div>

                      <h4 
                        onClick={() => setSelectedAdForModal(ad)}
                        className="font-bold text-white text-xs hover:text-emerald-400 cursor-pointer line-clamp-2 leading-snug"
                      >
                        {ad.title}
                      </h4>

                      <p className="text-[11px] text-slate-400 mt-1.5 line-clamp-2">
                        {ad.description}
                      </p>
                    </div>

                    {/* Footer Actions */}
                    <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between gap-1 text-xs">
                      <div className="text-[10px] text-slate-500 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-500" />
                        <span>{ad.location.city}</span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleShare(ad)}
                          className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors"
                          title="Share"
                        >
                          <Share2 className="w-3 h-3" />
                        </button>

                        <button
                          onClick={() => openReportModal('ad', ad.id, ad.title)}
                          className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-rose-400 transition-colors"
                          title="Report Listing"
                        >
                          <AlertTriangle className="w-3 h-3" />
                        </button>

                        <button
                          onClick={() => startChatWithBusiness(ad.businessId, `Enquiry: ${ad.title}`, ad.id)}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-[11px] flex items-center gap-1"
                        >
                          <MessageSquare className="w-3 h-3" />
                          <span>Chat</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* 5. Detailed Ad Modal */}
      {selectedAdForModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-in fade-in zoom-in-95">
            {/* Modal Image */}
            <div className="relative h-64 w-full bg-slate-950">
              <img
                src={selectedAdForModal.mediaUrls[0]}
                alt={selectedAdForModal.title}
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => setSelectedAdForModal(null)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-slate-900/90 text-white font-bold flex items-center justify-center hover:bg-slate-800 border border-slate-700 shadow"
              >
                ✕
              </button>
              {selectedAdForModal.isBoosted && (
                <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-amber-500 text-slate-950 font-black text-xs uppercase flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5" /> Boosted Showcase
                </div>
              )}
            </div>

            {/* Modal Content */}
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div 
                  onClick={() => {
                    viewBusinessDetail(selectedAdForModal.businessId);
                    setSelectedAdForModal(null);
                  }}
                  className="flex items-center gap-2 cursor-pointer group"
                >
                  <img
                    src={selectedAdForModal.businessLogo}
                    alt={selectedAdForModal.businessName}
                    className="w-8 h-8 rounded-full object-cover border border-emerald-500/50"
                  />
                  <div>
                    <div className="text-xs font-bold text-white group-hover:text-emerald-400 flex items-center gap-1">
                      {selectedAdForModal.businessName}
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    </div>
                    <div className="text-[10px] text-slate-400">{selectedAdForModal.location.city}, {selectedAdForModal.location.state}</div>
                  </div>
                </div>

                {selectedAdForModal.price && (
                  <div className="text-right">
                    <div className="text-lg font-black text-emerald-400">
                      ₦{selectedAdForModal.price.toLocaleString()}
                    </div>
                    <div className="text-xs text-slate-400">
                      ≈ ${(selectedAdForModal.price / 1520).toFixed(2)} USD
                    </div>
                  </div>
                )}
              </div>

              <h3 className="text-xl font-bold text-white mt-4">
                {selectedAdForModal.title}
              </h3>

              <p className="text-sm text-slate-300 mt-3 whitespace-pre-line leading-relaxed">
                {selectedAdForModal.description}
              </p>

              {/* Tags */}
              <div className="mt-4 flex flex-wrap gap-1.5">
                {selectedAdForModal.tags.map((t, idx) => (
                  <span key={idx} className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300">
                    #{t}
                  </span>
                ))}
              </div>

              {/* CTAs */}
              <div className="mt-6 pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {selectedAdForModal.contactWhatsApp && (
                    <a
                      href={`https://wa.me/${selectedAdForModal.contactWhatsApp.replace(/[^0-9]/g, '')}?text=Hi,%20I%20am%20interested%20in%20your%20listing:%20${encodeURIComponent(selectedAdForModal.title)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>WhatsApp Seller</span>
                    </a>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      startChatWithBusiness(selectedAdForModal.businessId, `Enquiry: ${selectedAdForModal.title}`, selectedAdForModal.id);
                      setSelectedAdForModal(null);
                    }}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/20 hover:scale-102 transition-all flex items-center gap-1.5"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Chat & Enquire on Boost Market</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
