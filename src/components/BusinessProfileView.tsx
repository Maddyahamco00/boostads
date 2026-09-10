'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Star, 
  ShieldCheck, 
  MapPin, 
  Phone, 
  MessageSquare, 
  ArrowLeft, 
  ShoppingBag, 
  Wrench, 
  Image as ImageIcon, 
  Flame,
  Send,
  AlertTriangle,
  X,
  Share2,
  ExternalLink,
  Sparkles
} from 'lucide-react';
import { Business, Product, Service, PortfolioItem, Advertisement, Review } from '../types';
import { AdvertisementCard } from './AdvertisementCard';

export const BusinessProfileView: React.FC = () => {
  const { 
    selectedBusinessId, 
    businesses, 
    setActiveView, 
    startChatWithBusiness, 
    openReportModal,
    currentUser,
    refreshData,
    categories
  } = useApp();

  const [businessData, setBusinessData] = useState<{
    business: Business | null;
    products: Product[];
    services: Service[];
    portfolio: PortfolioItem[];
    ads: Advertisement[];
    reviews: Review[];
  }>({
    business: null,
    products: [],
    services: [],
    portfolio: [],
    ads: [],
    reviews: []
  });

  const [activeTab, setActiveTab] = useState<'ads' | 'products' | 'services' | 'portfolio' | 'reviews'>('ads');
  const [selectedMediaLightbox, setSelectedMediaLightbox] = useState<string | null>(null);
  
  // Review submission state
  const [newRating, setNewRating] = useState<number>(5);
  const [newReviewText, setNewReviewText] = useState<string>('');
  const [isSubmittingReview, setIsSubmittingReview] = useState<boolean>(false);

  useEffect(() => {
    if (!selectedBusinessId) return;
    fetch(`/api/businesses/${selectedBusinessId}`)
      .then(r => r.json())
      .then(res => {
        if (res.success) {
          setBusinessData({
            business: res.business,
            products: res.products || [],
            services: res.services || [],
            portfolio: res.portfolio || [],
            ads: res.ads || [],
            reviews: res.reviews || []
          });
        }
      })
      .catch(err => console.error('Failed to load business details:', err));
  }, [selectedBusinessId]);

  const biz = businessData.business || businesses.find(b => b.id === selectedBusinessId) || businesses[0];

  if (!biz) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center text-slate-500">
        <p>Business profile not found.</p>
        <button
          onClick={() => setActiveView('discover')}
          className="mt-4 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs cursor-pointer"
        >
          Return to Advertisements
        </button>
      </div>
    );
  }

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReviewText.trim()) return;
    setIsSubmittingReview(true);
    try {
      const res = await fetch('/api/reviews/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: biz.id,
          authorId: currentUser.id,
          authorName: currentUser.name,
          authorAvatar: currentUser.avatarUrl,
          rating: newRating,
          comment: newReviewText.trim()
        })
      });
      const data = await res.json();
      if (data.success && data.review) {
        setBusinessData(prev => ({
          ...prev,
          reviews: [data.review, ...prev.reviews],
          business: data.business || prev.business
        }));
        setNewReviewText('');
        refreshData();
      }
    } catch (err) {
      console.error('Failed to submit review:', err);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  return (
    <div id="business-profile-view" className="min-h-screen pb-20 text-slate-900 dark:text-slate-100 transition-colors">
      
      {/* Back Button Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <button
          onClick={() => setActiveView('discover')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 dark:hover:text-cyan-400 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Discovery Feed</span>
        </button>
      </div>

      {/* Hero Header Banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
        <div className="relative rounded-3xl overflow-hidden glass-panel border border-slate-200/80 dark:border-slate-800 shadow-xl">
          
          {/* Cover Photo */}
          <div className="h-48 sm:h-72 w-full relative bg-slate-900">
            <img
              src={biz.coverImageUrl || 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1200&auto=format&fit=crop&q=80'}
              alt={biz.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />
            
            {/* Action buttons on cover */}
            <div className="absolute top-4 right-4 flex items-center gap-2">
              <button
                onClick={() => openReportModal('business', biz.id, biz.name)}
                className="p-2.5 rounded-xl bg-slate-900/60 backdrop-blur-md text-white hover:text-rose-400 border border-white/20 transition-colors cursor-pointer"
                title="Report Business"
              >
                <AlertTriangle className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Business Info Bar */}
          <div className="px-6 sm:px-8 pb-8 pt-0 relative">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 -mt-14 sm:-mt-16">
              
              {/* Logo and Identity */}
              <div className="flex items-end gap-4">
                <img
                  src={biz.logoUrl || 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=200&auto=format&fit=crop&q=80'}
                  alt={biz.name}
                  className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover border-4 border-white dark:border-slate-900 shadow-xl bg-white shrink-0"
                />
                <div className="mb-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                      {biz.name}
                    </h1>
                    {biz.isVerified && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-cyan-300 border border-indigo-200 dark:border-indigo-800 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 dark:text-cyan-400" />
                        <span>Verified Business</span>
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                    {biz.categories && biz.categories.length > 0 ? (
                      biz.categories.map((catId, idx) => {
                        const catConfig = categories.find(c => c.id === catId);
                        const label = catConfig?.name || catId;
                        return (
                          <span
                            key={catId}
                            className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              idx === 0
                                ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-cyan-300 border border-indigo-200 dark:border-indigo-800'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            {label}
                          </span>
                        );
                      })
                    ) : (
                      <span className="text-xs font-bold text-indigo-600 dark:text-cyan-400 uppercase tracking-wider">
                        {biz.categoryLabel || biz.category || 'General Business'}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1.5 flex-wrap">
                    {biz.location ? (
                      <span className="flex items-center gap-1 font-medium">
                        <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                        <span>
                          {[
                            biz.location.address,
                            biz.location.lga,
                            biz.location.city,
                            biz.location.state
                          ].filter(Boolean).join(', ')}
                        </span>
                        {biz.location.isServiceAreaOnly && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200">
                            Service Area Only
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-slate-400">
                        <MapPin className="w-3.5 h-3.5" />
                        <span>Nigeria</span>
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-amber-500 font-bold">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      {biz.rating || 5.0} ({biz.reviewCount || 0} reviews)
                    </span>
                  </div>
                </div>
              </div>

              {/* Direct CTAs */}
              <div className="flex items-center gap-2.5 flex-wrap">
                {biz.whatsapp && (
                  <a
                    href={`https://wa.me/${biz.whatsapp.replace(/[^0-9]/g, '')}?text=Hello%20${encodeURIComponent(biz.name)},%20I%20found%20your%20business%20on%20Boost%20Market!`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition-colors"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>WhatsApp Business</span>
                  </a>
                )}

                {biz.phone && (
                  <a
                    href={`tel:${biz.phone}`}
                    className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors"
                    title="Call Business"
                  >
                    <Phone className="w-4 h-4 text-indigo-600 dark:text-cyan-400" />
                  </a>
                )}

                <button
                  onClick={() => startChatWithBusiness(biz.id, `Hello ${biz.name}!`)}
                  className="px-4 py-2.5 rounded-xl btn-advertise text-xs font-bold flex items-center gap-2 cursor-pointer shadow-md"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Inquiry</span>
                </button>
              </div>
            </div>

            {/* Description */}
            {biz.description ? (
              <p className="mt-6 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-slate-800 pt-4 whitespace-pre-line">
                {biz.description}
              </p>
            ) : null}

            {/* Subcategories tags */}
            {biz.subcategories && biz.subcategories.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {biz.subcategories.map((sub, idx) => (
                  <span key={idx} className="text-xs px-2.5 py-1 rounded-lg glass-pill text-slate-600 dark:text-slate-300 font-medium">
                    #{sub}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto pb-2 text-xs font-bold">
          
          <button
            onClick={() => setActiveTab('ads')}
            className={`pb-2.5 px-4 flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'ads'
                ? 'border-indigo-600 text-indigo-600 dark:text-cyan-400 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Flame className="w-4 h-4 text-amber-500" />
            <span>Active Advertisements ({businessData.ads.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('products')}
            className={`pb-2.5 px-4 flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'products'
                ? 'border-indigo-600 text-indigo-600 dark:text-cyan-400 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Products ({businessData.products.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('services')}
            className={`pb-2.5 px-4 flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'services'
                ? 'border-indigo-600 text-indigo-600 dark:text-cyan-400 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Wrench className="w-4 h-4" />
            <span>Services ({businessData.services.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('portfolio')}
            className={`pb-2.5 px-4 flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'portfolio'
                ? 'border-indigo-600 text-indigo-600 dark:text-cyan-400 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            <span>Portfolio ({businessData.portfolio.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('reviews')}
            className={`pb-2.5 px-4 flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'reviews'
                ? 'border-indigo-600 text-indigo-600 dark:text-cyan-400 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Star className="w-4 h-4" />
            <span>Reviews ({businessData.reviews.length})</span>
          </button>
        </div>
      </div>

      {/* Tab Contents */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        
        {/* 1. ADVERTISEMENTS */}
        {activeTab === 'ads' && (
          <div>
            {businessData.ads.length === 0 ? (
              <div className="glass-card rounded-2xl p-12 text-center text-slate-400 text-xs">
                No active advertisements currently running for this business.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {businessData.ads.map(ad => (
                  <AdvertisementCard 
                    key={ad.id}
                    ad={ad}
                    business={biz}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* 2. PRODUCTS CATALOG */}
        {activeTab === 'products' && (
          <div>
            {businessData.products.length === 0 ? (
              <div className="glass-card rounded-2xl p-12 text-center text-slate-400 text-xs">
                No products currently listed in catalog.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {businessData.products.map(p => (
                  <div key={p.id} className="glass-card rounded-2xl overflow-hidden shadow-xs flex flex-col justify-between p-5">
                    <div>
                      <img src={p.imageUrls[0]} alt={p.name} className="w-full h-44 object-cover rounded-xl mb-4" />
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-indigo-600 dark:text-cyan-400 font-bold uppercase">{p.category}</span>
                        {p.inStock ? (
                          <span className="text-[10px] text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md font-bold">In Stock</span>
                        ) : (
                          <span className="text-[10px] text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded-md font-bold">Sold Out</span>
                        )}
                      </div>
                      <h3 className="font-bold text-slate-900 dark:text-white text-base mt-1.5">{p.name}</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{p.description}</p>
                      <div className="mt-3 text-base font-black text-slate-900 dark:text-white">
                        ₦{p.price.toLocaleString()}
                      </div>
                    </div>
                    <button
                      onClick={() => startChatWithBusiness(biz.id, `I would like to order product: ${p.name} (₦${p.price.toLocaleString()})`)}
                      className="mt-4 w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <ShoppingBag className="w-4 h-4" />
                      <span>Inquire to Order</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 3. SERVICES */}
        {activeTab === 'services' && (
          <div>
            {businessData.services.length === 0 ? (
              <div className="glass-card rounded-2xl p-12 text-center text-slate-400 text-xs">
                No services currently listed.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {businessData.services.map(s => (
                  <div key={s.id} className="glass-card rounded-2xl overflow-hidden p-5 flex flex-col justify-between">
                    <div>
                      <img src={s.imageUrls[0]} alt={s.name} className="w-full h-44 object-cover rounded-xl mb-4" />
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-indigo-600 dark:text-cyan-400 font-bold uppercase">{s.category}</span>
                        <span className="text-[10px] uppercase font-bold text-slate-600 dark:text-slate-300 glass-pill px-2 py-0.5 rounded-md">{s.deliveryMode}</span>
                      </div>
                      <h3 className="font-bold text-slate-900 dark:text-white text-base mt-1.5">{s.name}</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{s.description}</p>
                      <div className="mt-3 text-base font-black text-slate-900 dark:text-white">
                        Starting from ₦{s.startingPrice.toLocaleString()}
                      </div>
                    </div>
                    <button
                      onClick={() => startChatWithBusiness(biz.id, `I need quotation for service: ${s.name}`)}
                      className="mt-4 w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Wrench className="w-4 h-4" />
                      <span>Request Quotation</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 4. PORTFOLIO */}
        {activeTab === 'portfolio' && (
          <div>
            {businessData.portfolio.length === 0 ? (
              <div className="glass-card rounded-2xl p-12 text-center text-slate-400 text-xs">
                No portfolio media uploaded yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {businessData.portfolio.map(pf => (
                  <div 
                    key={pf.id}
                    onClick={() => setSelectedMediaLightbox(pf.mediaUrl)}
                    className="glass-card rounded-2xl overflow-hidden cursor-pointer hover:border-indigo-500 transition-all"
                  >
                    <div className="relative h-48 w-full bg-slate-900">
                      <img src={pf.mediaUrl} alt={pf.title} className="w-full h-full object-cover" />
                      <div className="absolute top-2 right-2 px-2.5 py-1 rounded-lg bg-slate-900/80 text-[10px] text-white font-bold border border-white/20">
                        {pf.category}
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold text-slate-900 dark:text-white text-xs">{pf.title}</h3>
                      {pf.description && <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{pf.description}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 5. REVIEWS */}
        {activeTab === 'reviews' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-3">
              {businessData.reviews.length === 0 ? (
                <div className="glass-card rounded-2xl p-12 text-center text-slate-400 text-xs">
                  No reviews yet. Share your experience below.
                </div>
              ) : (
                businessData.reviews.map(r => (
                  <div key={r.id} className="glass-card rounded-2xl p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <img src={r.authorAvatar || 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=200&auto=format&fit=crop&q=80'} alt={r.authorName} className="w-8 h-8 rounded-full object-cover" />
                        <div>
                          <div className="text-xs font-bold text-slate-900 dark:text-white">{r.authorName}</div>
                          <div className="text-[10px] text-slate-400">{new Date(r.createdAt).toLocaleDateString()}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className={`w-3.5 h-3.5 ${i < r.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-700'}`} />
                        ))}
                      </div>
                    </div>
                    <p className="mt-2.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{r.comment}</p>
                  </div>
                ))
              )}
            </div>

            {/* Leave a review form */}
            <div className="glass-card rounded-2xl p-5 self-start">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-3">Leave a Review</h3>
              <form onSubmit={handleReviewSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">Rating</label>
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        type="button"
                        key={star}
                        onClick={() => setNewRating(star)}
                        className="cursor-pointer p-0.5"
                      >
                        <Star className={`w-5 h-5 ${star <= newRating ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-700'}`} />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">Your Feedback</label>
                  <textarea
                    rows={3}
                    value={newReviewText}
                    onChange={(e) => setNewReviewText(e.target.value)}
                    placeholder="Write your honest experience with this advertiser..."
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingReview}
                  className="w-full py-2.5 rounded-xl btn-advertise font-bold text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmittingReview ? 'Submitting...' : 'Post Review'}</span>
                </button>
              </form>
            </div>
          </div>
        )}

      </div>

      {/* Lightbox Modal */}
      {selectedMediaLightbox && (
        <div 
          onClick={() => setSelectedMediaLightbox(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <button 
              onClick={() => setSelectedMediaLightbox(null)}
              className="absolute -top-10 right-0 text-white hover:text-slate-300 cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
            <img src={selectedMediaLightbox} alt="Enlarged Media" className="max-h-[85vh] rounded-2xl object-contain shadow-2xl" />
          </div>
        </div>
      )}

    </div>
  );
};
