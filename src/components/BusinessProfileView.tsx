import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Star, 
  ShieldCheck, 
  MapPin, 
  Phone, 
  Globe, 
  Clock, 
  MessageSquare, 
  Share2, 
  ArrowLeft, 
  CheckCircle2, 
  ShoppingBag, 
  Wrench, 
  Image as ImageIcon, 
  FileText, 
  Plus, 
  ExternalLink,
  Flame,
  Send,
  AlertTriangle
} from 'lucide-react';
import { Business, Product, Service, PortfolioItem, Advertisement, Review } from '../types';

export const BusinessProfileView: React.FC = () => {
  const { 
    selectedBusinessId, 
    businesses, 
    setActiveView, 
    startChatWithBusiness, 
    openReportModal,
    currentUser,
    refreshData
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
      <div className="max-w-7xl mx-auto px-4 py-16 text-center text-slate-400">
        <p>Business profile not found.</p>
        <button
          onClick={() => setActiveView('discover')}
          className="mt-4 px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs"
        >
          Return to Marketplace
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
    <div id="business-profile-view" className="min-h-screen bg-slate-950 pb-20">
      
      {/* Back Button */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        <button
          onClick={() => setActiveView('discover')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-emerald-400 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Marketplace</span>
        </button>
      </div>

      {/* Hero Header Banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-3">
        <div className="relative rounded-3xl overflow-hidden border border-slate-800 bg-slate-900 shadow-2xl">
          {/* Cover Photo */}
          <div className="h-60 sm:h-72 w-full relative bg-slate-950">
            <img
              src={biz.coverImageUrl}
              alt={biz.name}
              className="w-full h-full object-cover opacity-80"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />
            
            {/* Action buttons on cover */}
            <div className="absolute top-4 right-4 flex items-center gap-2">
              <button
                onClick={() => openReportModal('business', biz.id, biz.name)}
                className="p-2 rounded-xl bg-slate-900/80 backdrop-blur-md text-slate-400 hover:text-rose-400 border border-slate-700 transition-colors"
                title="Report Business"
              >
                <AlertTriangle className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Business Info Bar */}
          <div className="px-6 pb-6 pt-0 relative">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 -mt-16 sm:-mt-20">
              
              {/* Logo and Identity */}
              <div className="flex items-end gap-4">
                <img
                  src={biz.logoUrl}
                  alt={biz.name}
                  className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover border-4 border-slate-900 shadow-2xl ring-2 ring-emerald-500/40 bg-slate-950"
                />
                <div className="mb-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                      {biz.name}
                    </h1>
                    {biz.isVerified && (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Verified
                      </span>
                    )}
                    <span className="text-xs uppercase font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      Tier: {biz.tier.toUpperCase()}
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm text-emerald-400 font-semibold mt-0.5">
                    {biz.categoryLabel}
                  </p>

                  <div className="flex items-center gap-3 text-xs text-slate-400 mt-1.5 flex-wrap">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-500" />
                      {biz.location.address || `${biz.location.city}, ${biz.location.state}`}
                    </span>
                    <span className="flex items-center gap-1 text-amber-400 font-bold">
                      <Star className="w-3.5 h-3.5 fill-amber-400" />
                      {biz.rating} ({biz.reviewCount} reviews)
                    </span>
                  </div>
                </div>
              </div>

              {/* Direct CTAs */}
              <div className="flex items-center gap-2 flex-wrap">
                {biz.whatsapp && (
                  <a
                    href={`https://wa.me/${biz.whatsapp.replace(/[^0-9]/g, '')}?text=Hello%20${encodeURIComponent(biz.name)},%20I%20found%20your%20business%20on%20Boost%20Market!`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg transition-all"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </a>
                )}

                <button
                  onClick={() => startChatWithBusiness(biz.id, `Hello ${biz.name}! I am contacting you via Boost Market.`)}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/20 hover:scale-102 transition-all flex items-center gap-1.5"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Send Direct Message</span>
                </button>
              </div>
            </div>

            {/* Bio Description */}
            <p className="mt-6 text-xs sm:text-sm text-slate-300 leading-relaxed border-t border-slate-800 pt-4">
              {biz.description}
            </p>

            {/* Subcategories tags */}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {biz.subcategories.map((sub, idx) => (
                <span key={idx} className="text-xs px-2.5 py-1 rounded-lg bg-slate-800/90 text-slate-300 font-medium">
                  {sub}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <div className="border-b border-slate-800 flex items-center gap-2 sm:gap-4 overflow-x-auto pb-1 text-xs sm:text-sm font-semibold">
          <button
            onClick={() => setActiveTab('ads')}
            className={`pb-3 px-2 flex items-center gap-1.5 border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'ads'
                ? 'border-emerald-500 text-emerald-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Flame className="w-4 h-4" />
            <span>Advertisements ({businessData.ads.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('products')}
            className={`pb-3 px-2 flex items-center gap-1.5 border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'products'
                ? 'border-emerald-500 text-emerald-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Products ({businessData.products.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('services')}
            className={`pb-3 px-2 flex items-center gap-1.5 border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'services'
                ? 'border-emerald-500 text-emerald-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Wrench className="w-4 h-4" />
            <span>Services ({businessData.services.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('portfolio')}
            className={`pb-3 px-2 flex items-center gap-1.5 border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'portfolio'
                ? 'border-emerald-500 text-emerald-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            <span>Portfolio Showcase ({businessData.portfolio.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('reviews')}
            className={`pb-3 px-2 flex items-center gap-1.5 border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'reviews'
                ? 'border-emerald-500 text-emerald-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-white'
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
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 text-xs">
                No active advertisements posted yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {businessData.ads.map(ad => (
                  <div key={ad.id} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg flex flex-col justify-between">
                    <div>
                      <div className="relative h-44 w-full bg-slate-950">
                        <img src={ad.mediaUrls[0]} alt={ad.title} className="w-full h-full object-cover" />
                        {ad.price && (
                          <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded-lg bg-slate-950/90 text-white font-bold text-xs">
                            ₦{ad.price.toLocaleString()}
                          </div>
                        )}
                      </div>
                      <div className="p-4">
                        <h4 className="font-bold text-white text-sm">{ad.title}</h4>
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2">{ad.description}</p>
                      </div>
                    </div>
                    <div className="p-4 pt-0">
                      <button
                        onClick={() => startChatWithBusiness(biz.id, `Inquiry on ad: ${ad.title}`, ad.id)}
                        className="w-full py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Enquire on this Ad</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 2. PRODUCTS CATALOG */}
        {activeTab === 'products' && (
          <div>
            {businessData.products.length === 0 ? (
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 text-xs">
                No products in catalog.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {businessData.products.map(p => (
                  <div key={p.id} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg flex flex-col justify-between p-4">
                    <div>
                      <img src={p.imageUrls[0]} alt={p.name} className="w-full h-40 object-cover rounded-xl mb-3" />
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-emerald-400 font-semibold">{p.category}</span>
                        {p.inStock ? (
                          <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded font-bold">In Stock</span>
                        ) : (
                          <span className="text-[10px] text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded font-bold">Sold Out</span>
                        )}
                      </div>
                      <h4 className="font-bold text-white text-sm mt-1">{p.name}</h4>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">{p.description}</p>
                      <div className="mt-3 text-base font-black text-white">
                        ₦{p.price.toLocaleString()} <span className="text-xs font-normal text-slate-400">(≈ ${(p.price / 1520).toFixed(2)})</span>
                      </div>
                    </div>
                    <button
                      onClick={() => startChatWithBusiness(biz.id, `I would like to order product: ${p.name} (₦${p.price.toLocaleString()})`)}
                      className="mt-4 w-full py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>Order via Chat / Invoice</span>
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
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 text-xs">
                No services listed yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {businessData.services.map(s => (
                  <div key={s.id} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg p-4 flex flex-col justify-between">
                    <div>
                      <img src={s.imageUrls[0]} alt={s.name} className="w-full h-40 object-cover rounded-xl mb-3" />
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-emerald-400 font-semibold">{s.category}</span>
                        <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded">{s.deliveryMode}</span>
                      </div>
                      <h4 className="font-bold text-white text-sm mt-1">{s.name}</h4>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">{s.description}</p>
                      <div className="mt-3 text-base font-black text-emerald-400">
                        From ₦{s.startingPrice.toLocaleString()} <span className="text-xs font-normal text-slate-400">/ {s.durationUnit}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => startChatWithBusiness(biz.id, `I need quotation for service: ${s.name}`)}
                      className="mt-4 w-full py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1"
                    >
                      <Wrench className="w-3.5 h-3.5" />
                      <span>Book / Request Quote</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 4. PORTFOLIO SHOWCASE */}
        {activeTab === 'portfolio' && (
          <div>
            {businessData.portfolio.length === 0 ? (
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 text-xs">
                No portfolio items uploaded yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {businessData.portfolio.map(pf => (
                  <div 
                    key={pf.id}
                    onClick={() => setSelectedMediaLightbox(pf.mediaUrl)}
                    className="group bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden cursor-pointer hover:border-emerald-500/50 transition-all shadow-lg"
                  >
                    <div className="relative h-48 w-full bg-slate-950 overflow-hidden">
                      <img src={pf.mediaUrl} alt={pf.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent" />
                      <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-slate-900/80 text-[10px] text-slate-300 border border-slate-700">
                        {pf.category}
                      </div>
                    </div>
                    <div className="p-4">
                      <h4 className="font-bold text-white text-sm group-hover:text-emerald-400 transition-colors">{pf.title}</h4>
                      {pf.description && <p className="text-xs text-slate-400 mt-1 line-clamp-2">{pf.description}</p>}
                      {pf.clientName && <p className="text-[11px] text-slate-500 mt-2">Client: {pf.clientName}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 5. REVIEWS & RATINGS */}
        {activeTab === 'reviews' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Reviews List */}
            <div className="lg:col-span-2 space-y-4">
              {businessData.reviews.length === 0 ? (
                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 text-xs">
                  No customer reviews yet. Be the first to leave a review!
                </div>
              ) : (
                businessData.reviews.map(r => (
                  <div key={r.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <img src={r.authorAvatar || 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=200&auto=format&fit=crop&q=80'} alt={r.authorName} className="w-8 h-8 rounded-full object-cover" />
                        <div>
                          <div className="text-xs font-bold text-white">{r.authorName}</div>
                          <div className="text-[10px] text-slate-400">{new Date(r.createdAt).toLocaleDateString()}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-amber-400 text-xs font-bold">
                        {Array.from({ length: r.rating }).map((_, i) => (
                          <Star key={i} className="w-3.5 h-3.5 fill-amber-400" />
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-slate-300 mt-2.5 leading-relaxed">{r.comment}</p>
                  </div>
                ))
              )}
            </div>

            {/* Leave Review Form */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 h-fit shadow-xl">
              <h3 className="font-bold text-white text-sm mb-3">Leave a Verified Review</h3>
              <form onSubmit={handleReviewSubmit} className="space-y-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Your Rating</label>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        type="button"
                        key={star}
                        onClick={() => setNewRating(star)}
                        className="p-1 text-amber-400"
                      >
                        <Star className={`w-5 h-5 ${star <= newRating ? 'fill-amber-400' : 'text-slate-600'}`} />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">Review Comments</label>
                  <textarea
                    rows={3}
                    value={newReviewText}
                    onChange={(e) => setNewReviewText(e.target.value)}
                    placeholder="Share your experience regarding service quality, communication, and delivery..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingReview}
                  className="w-full py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow transition-all flex items-center justify-center gap-1"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmittingReview ? 'Submitting...' : 'Post Review'}</span>
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* Media Lightbox */}
      {selectedMediaLightbox && (
        <div 
          onClick={() => setSelectedMediaLightbox(null)}
          className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4"
        >
          <div className="max-w-4xl max-h-[90vh] relative">
            <img src={selectedMediaLightbox} alt="Full resolution project" className="max-h-[85vh] w-auto rounded-2xl shadow-2xl" />
            <button
              onClick={() => setSelectedMediaLightbox(null)}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center hover:bg-slate-800"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
