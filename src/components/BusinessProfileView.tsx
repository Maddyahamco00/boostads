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
      <div className="max-w-7xl mx-auto px-4 py-16 text-center text-gray-500">
        <p>Business profile not found.</p>
        <button
          onClick={() => setActiveView('discover')}
          className="mt-4 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs cursor-pointer"
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
    <div id="business-profile-view" className="min-h-screen bg-gray-50 pb-20 text-gray-900">
      
      {/* Back Button */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        <button
          onClick={() => setActiveView('discover')}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-blue-600 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Marketplace</span>
        </button>
      </div>

      {/* Hero Header Banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-3">
        <div className="relative rounded-xl overflow-hidden border border-gray-200 bg-white shadow-xs">
          {/* Cover Photo */}
          <div className="h-48 sm:h-64 w-full relative bg-gray-100">
            <img
              src={biz.coverImageUrl}
              alt={biz.name}
              className="w-full h-full object-cover"
            />
            
            {/* Action buttons on cover */}
            <div className="absolute top-3 right-3 flex items-center gap-2">
              <button
                onClick={() => openReportModal('business', biz.id, biz.name)}
                className="p-2 rounded-lg bg-white/90 backdrop-blur-xs text-gray-500 hover:text-red-600 border border-gray-200 transition-colors cursor-pointer"
                title="Report Business"
              >
                <AlertTriangle className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Business Info Bar */}
          <div className="px-6 pb-6 pt-0 relative">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 -mt-12 sm:-mt-14">
              
              {/* Logo and Identity */}
              <div className="flex items-end gap-3.5">
                <img
                  src={biz.logoUrl}
                  alt={biz.name}
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl object-cover border-2 border-white shadow-md bg-white"
                />
                <div className="mb-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
                      {biz.name}
                    </h1>
                    {biz.isVerified && (
                      <span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" /> Verified
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-blue-600 font-medium mt-0.5">
                    {biz.categoryLabel}
                  </p>

                  <div className="flex items-center gap-3 text-xs text-gray-500 mt-1 flex-wrap">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {biz.location.address || `${biz.location.city}, ${biz.location.state}`}
                    </span>
                    <span className="flex items-center gap-1 text-amber-600 font-medium">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
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
                    className="px-3.5 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium text-xs flex items-center gap-1.5 transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </a>
                )}

                <button
                  onClick={() => startChatWithBusiness(biz.id, `Hello ${biz.name}!`)}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Message</span>
                </button>
              </div>
            </div>

            {/* Description */}
            <p className="mt-4 text-xs text-gray-600 leading-relaxed border-t border-gray-100 pt-3">
              {biz.description}
            </p>

            {/* Subcategories tags */}
            {biz.subcategories && biz.subcategories.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {biz.subcategories.map((sub, idx) => (
                  <span key={idx} className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600 font-medium">
                    {sub}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="border-b border-gray-200 flex items-center gap-2 overflow-x-auto pb-1 text-xs font-medium">
          <button
            onClick={() => setActiveTab('ads')}
            className={`pb-2.5 px-3 flex items-center gap-1.5 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'ads'
                ? 'border-blue-600 text-blue-600 font-semibold'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Ads ({businessData.ads.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('products')}
            className={`pb-2.5 px-3 flex items-center gap-1.5 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'products'
                ? 'border-blue-600 text-blue-600 font-semibold'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Products ({businessData.products.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('services')}
            className={`pb-2.5 px-3 flex items-center gap-1.5 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'services'
                ? 'border-blue-600 text-blue-600 font-semibold'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>Services ({businessData.services.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('portfolio')}
            className={`pb-2.5 px-3 flex items-center gap-1.5 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'portfolio'
                ? 'border-blue-600 text-blue-600 font-semibold'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Portfolio ({businessData.portfolio.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('reviews')}
            className={`pb-2.5 px-3 flex items-center gap-1.5 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'reviews'
                ? 'border-blue-600 text-blue-600 font-semibold'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <Star className="w-3.5 h-3.5" />
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
              <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-400 text-xs">
                No active advertisements posted yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {businessData.ads.map(ad => (
                  <div key={ad.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs flex flex-col justify-between">
                    <div>
                      <div className="relative h-40 w-full bg-gray-100">
                        <img src={ad.mediaUrls[0]} alt={ad.title} className="w-full h-full object-cover" />
                        {ad.price && (
                          <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-gray-900/80 text-white font-semibold text-xs">
                            ₦{ad.price.toLocaleString()}
                          </div>
                        )}
                      </div>
                      <div className="p-4">
                        <h2 className="font-semibold text-gray-900 text-sm">{ad.title}</h2>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{ad.description}</p>
                      </div>
                    </div>
                    <div className="p-4 pt-0">
                      <button
                        onClick={() => startChatWithBusiness(biz.id, `Inquiry on ad: ${ad.title}`, ad.id)}
                        className="w-full py-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Inquire</span>
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
              <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-400 text-xs">
                No products in catalog.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {businessData.products.map(p => (
                  <div key={p.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs flex flex-col justify-between p-4">
                    <div>
                      <img src={p.imageUrls[0]} alt={p.name} className="w-full h-36 object-cover rounded-lg mb-3" />
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-blue-600 font-medium">{p.category}</span>
                        {p.inStock ? (
                          <span className="text-[10px] text-green-700 bg-green-50 px-1.5 py-0.2 rounded font-medium">In Stock</span>
                        ) : (
                          <span className="text-[10px] text-red-700 bg-red-50 px-1.5 py-0.2 rounded font-medium">Sold Out</span>
                        )}
                      </div>
                      <h2 className="font-semibold text-gray-900 text-sm mt-1">{p.name}</h2>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{p.description}</p>
                      <div className="mt-2 text-sm font-bold text-gray-900">
                        ₦{p.price.toLocaleString()}
                      </div>
                    </div>
                    <button
                      onClick={() => startChatWithBusiness(biz.id, `I would like to order product: ${p.name} (₦${p.price.toLocaleString()})`)}
                      className="mt-3 w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>Order</span>
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
              <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-400 text-xs">
                No services listed yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {businessData.services.map(s => (
                  <div key={s.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs p-4 flex flex-col justify-between">
                    <div>
                      <img src={s.imageUrls[0]} alt={s.name} className="w-full h-36 object-cover rounded-lg mb-3" />
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-blue-600 font-medium">{s.category}</span>
                        <span className="text-[10px] uppercase font-medium text-gray-600 bg-gray-100 px-1.5 py-0.2 rounded">{s.deliveryMode}</span>
                      </div>
                      <h2 className="font-semibold text-gray-900 text-sm mt-1">{s.name}</h2>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{s.description}</p>
                      <div className="mt-2 text-sm font-bold text-gray-900">
                        From ₦{s.startingPrice.toLocaleString()}
                      </div>
                    </div>
                    <button
                      onClick={() => startChatWithBusiness(biz.id, `I need quotation for service: ${s.name}`)}
                      className="mt-3 w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer"
                    >
                      <Wrench className="w-3.5 h-3.5" />
                      <span>Request Quote</span>
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
              <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-400 text-xs">
                No portfolio items uploaded yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {businessData.portfolio.map(pf => (
                  <div 
                    key={pf.id}
                    onClick={() => setSelectedMediaLightbox(pf.mediaUrl)}
                    className="bg-white border border-gray-200 rounded-xl overflow-hidden cursor-pointer hover:border-blue-500 transition-all shadow-xs"
                  >
                    <div className="relative h-44 w-full bg-gray-100">
                      <img src={pf.mediaUrl} alt={pf.title} className="w-full h-full object-cover" />
                      <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-white/90 text-[10px] text-gray-700 border border-gray-200">
                        {pf.category}
                      </div>
                    </div>
                    <div className="p-3">
                      <h2 className="font-semibold text-gray-900 text-xs">{pf.title}</h2>
                      {pf.description && <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2">{pf.description}</p>}
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
            <div className="lg:col-span-2 space-y-3">
              {businessData.reviews.length === 0 ? (
                <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-400 text-xs">
                  No reviews yet. Be the first to leave one.
                </div>
              ) : (
                businessData.reviews.map(r => (
                  <div key={r.id} className="bg-white border border-gray-200 rounded-xl p-3.5 shadow-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <img src={r.authorAvatar || 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=200&auto=format&fit=crop&q=80'} alt={r.authorName} className="w-7 h-7 rounded-full object-cover" />
                        <div>
                          <div className="text-xs font-semibold text-gray-900">{r.authorName}</div>
                          <div className="text-[10px] text-gray-400">{new Date(r.createdAt).toLocaleDateString()}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5 text-amber-500 text-xs">
                        {Array.from({ length: r.rating }).map((_, i) => (
                          <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 mt-2 leading-relaxed">{r.comment}</p>
                  </div>
                ))
              )}
            </div>

            {/* Leave Review Form */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 h-fit shadow-xs">
              <h2 className="font-semibold text-gray-900 text-xs mb-3">Leave a Review</h2>
              <form onSubmit={handleReviewSubmit} className="space-y-3">
                <div>
                  <label className="text-xs text-gray-600 block mb-1 font-medium">Rating</label>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        type="button"
                        key={star}
                        onClick={() => setNewRating(star)}
                        className="p-1 cursor-pointer"
                      >
                        <Star className={`w-4 h-4 ${star <= newRating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-600 block mb-1 font-medium">Comments</label>
                  <textarea
                    rows={3}
                    value={newReviewText}
                    onChange={(e) => setNewReviewText(e.target.value)}
                    placeholder="Share your experience..."
                    className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-600"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingReview}
                  className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs shadow-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
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
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="max-w-4xl max-h-[90vh] relative">
            <img src={selectedMediaLightbox} alt="Showcase" className="max-h-[85vh] w-auto rounded-xl shadow-2xl" />
            <button
              onClick={() => setSelectedMediaLightbox(null)}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-gray-900 text-white font-bold flex items-center justify-center hover:bg-gray-800 cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
