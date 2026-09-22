'use client';

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  PlusCircle, 
  X, 
  Flame, 
  Check, 
  Image as ImageIcon, 
  Sparkles, 
  Eye, 
  MapPin, 
  MessageSquare, 
  Zap,
  CheckCircle2,
  HelpCircle,
  Upload
} from 'lucide-react';
import { BusinessCategoryType } from '../types';

export const CreateAdModal: React.FC = () => {
  const { 
    isCreateAdModalOpen, 
    setIsCreateAdModalOpen, 
    currentUser, 
    businesses, 
    currentLocation, 
    categories, 
    refreshData 
  } = useApp();

  const userBiz = businesses.find(b => b.ownerId === currentUser.id) || businesses[0];

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<BusinessCategoryType>(userBiz?.category || 'services');
  const [price, setPrice] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [tags, setTags] = useState('');
  const [whatsapp, setWhatsapp] = useState(userBiz?.whatsapp || userBiz?.phone || '');
  const [isBoosted, setIsBoosted] = useState(false);
  const [boostPlanDays, setBoostPlanDays] = useState(7);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync state when modal opens or business changes
  React.useEffect(() => {
    if (isCreateAdModalOpen && userBiz) {
      if (!whatsapp && (userBiz.whatsapp || userBiz.phone)) {
        setWhatsapp(userBiz.whatsapp || userBiz.phone || '');
      }
      if (!mediaUrl && (userBiz.coverImageUrl || userBiz.logoUrl)) {
        setMediaUrl(userBiz.coverImageUrl || userBiz.logoUrl || '');
      }
      if (userBiz.category) {
        setCategory(userBiz.category);
      }
    }
  }, [isCreateAdModalOpen, userBiz]);

  if (!isCreateAdModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description || !userBiz) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/advertisements/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: userBiz.id,
          businessName: userBiz.name,
          businessLogo: userBiz.logoUrl,
          businessCategory: category,
          title,
          description,
          category: categories.find(c => c.id === category)?.name || 'General',
          mediaUrls: mediaUrl ? [mediaUrl] : [],
          mediaType: 'image',
          price: price ? Number(price) : undefined,
          location: userBiz.location || currentLocation,
          tags: tags.split(',').map(t => t.trim()).filter(Boolean),
          contactWhatsApp: whatsapp,
          isBoosted,
          boostPlan: isBoosted ? { type: 'featured', days: boostPlanDays, priorityScore: 95 } : undefined
        })
      });
      const data = await res.json();
      if (data.success) {
        setIsCreateAdModalOpen(false);
        setTitle('');
        setDescription('');
        setPrice('');
        setTags('');
        setIsBoosted(false);
        refreshData();
      }
    } catch (err) {
      console.error('Failed to create advertisement:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="glass-modal rounded-3xl max-w-4xl w-full max-h-[92vh] overflow-y-auto shadow-2xl p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-cyan-400 mb-1">
              <Sparkles className="w-3 h-3" />
              <span>Ad Publisher Studio</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Create New Advertisement
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Publish and distribute across Boost Market feeds and customer discovery channels.
            </p>
          </div>

          <button
            onClick={() => setIsCreateAdModalOpen(false)}
            className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2-Column Layout: Form on Left, Live Ad Preview on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-6 items-start">
          
          {/* Left Form */}
          <form onSubmit={handleSubmit} className="lg:col-span-7 space-y-4 text-xs">
            
            {/* Target Business Identity */}
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1.5">
                Advertising as Business
              </label>
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center gap-3">
                <img 
                  src={userBiz?.logoUrl || 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=100&auto=format&fit=crop&q=80'} 
                  alt={userBiz?.name}
                  className="w-9 h-9 rounded-xl object-cover"
                />
                <div>
                  <div className="font-bold text-slate-900 dark:text-white text-xs">{userBiz?.name}</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 capitalize">{userBiz?.category} • {userBiz?.location?.city}</div>
                </div>
              </div>
            </div>

            {/* Ad Title */}
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                Advertisement Headline *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. 50% Off Professional Car Diagnostics This Week"
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                Description & Offer Details *
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your product, service, special offer, warranty, and why customers should choose you..."
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                required
              />
            </div>

            {/* Category & Price */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as BusinessCategoryType)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Featured Price (₦ NGN)</label>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="15000"
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Visual Media Selection */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-slate-700 dark:text-slate-300 font-bold">Ad Visual Media URL</label>
                <div className="flex items-center gap-2">
                  {userBiz?.coverImageUrl && (
                    <button
                      type="button"
                      onClick={() => setMediaUrl(userBiz.coverImageUrl || '')}
                      className="text-indigo-600 dark:text-cyan-400 hover:underline font-semibold text-[11px] cursor-pointer"
                    >
                      Use Business Cover
                    </button>
                  )}
                  {userBiz?.logoUrl && (
                    <button
                      type="button"
                      onClick={() => setMediaUrl(userBiz.logoUrl || '')}
                      className="text-indigo-600 dark:text-cyan-400 hover:underline font-semibold text-[11px] cursor-pointer"
                    >
                      Use Logo
                    </button>
                  )}
                </div>
              </div>

              <input
                type="url"
                value={mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
                placeholder="https://example.com/ad-image.jpg"
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Direct Contact WhatsApp & Tags */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  WhatsApp Contact Number *
                </label>
                <input
                  type="text"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="+2348031234567"
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  Tags (comma separated)
                </label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="service, discount, nigeria"
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white"
                />
              </div>
            </div>

            {/* Boost Advertisement Strategic Box */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-cyan-500/10 border border-indigo-500/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-indigo-600 text-white">
                    <Flame className="w-4 h-4 text-amber-300" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                      Boost This Advertisement (Recommended)
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Multiplies reach by 3.5x, highlights in trending feed, adds Promoted Badge.
                    </p>
                  </div>
                </div>

                <input
                  type="checkbox"
                  checked={isBoosted}
                  onChange={(e) => setIsBoosted(e.target.checked)}
                  className="w-5 h-5 accent-indigo-600 rounded cursor-pointer"
                />
              </div>

              {isBoosted && (
                <div className="mt-3 pt-3 border-t border-indigo-500/20 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                    Boost Duration:
                  </span>
                  <div className="flex items-center gap-1.5">
                    {[3, 7, 14, 30].map(days => (
                      <button
                        type="button"
                        key={days}
                        onClick={() => setBoostPlanDays(days)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-colors ${
                          boostPlanDays === days
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {days} Days
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Submission CTA */}
            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsCreateAdModalOpen(false)}
                className="px-4 py-2.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-advertise px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-md cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span>Publishing...</span>
                ) : (
                  <>
                    <PlusCircle className="w-4 h-4" />
                    <span>Publish Advertisement</span>
                  </>
                )}
              </button>
            </div>

          </form>

          {/* Right Column: Live Advertisement Preview */}
          <div className="lg:col-span-5 bg-slate-50 dark:bg-slate-900/60 p-4 sm:p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-indigo-500" />
                <span>Live Feed Preview</span>
              </span>
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Real-Time</span>
              </span>
            </div>

            {/* Rendered Live Card Preview */}
            <div className="glass-card rounded-2xl overflow-hidden border-indigo-400/40 dark:border-indigo-500/40 shadow-lg">
              {isBoosted && (
                <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400" />
              )}
              
              <div className="p-3 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  {userBiz?.logoUrl ? (
                    <img 
                      src={userBiz.logoUrl} 
                      alt={userBiz?.name}
                      className="w-8 h-8 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-cyan-400 font-black text-xs flex items-center justify-center">
                      {(userBiz?.name || 'B').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white text-xs">{userBiz?.name || 'Your Business'}</div>
                    <div className="text-[10px] text-slate-500 capitalize">{category}</div>
                  </div>
                </div>
                {isBoosted && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
                    Promoted
                  </span>
                )}
              </div>

              <div className="relative aspect-video bg-slate-100 dark:bg-slate-950 flex items-center justify-center overflow-hidden">
                {mediaUrl ? (
                  <img src={mediaUrl} alt={title || 'Ad Preview'} className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center p-4 text-slate-400 dark:text-slate-600">
                    <ImageIcon className="w-8 h-8 mx-auto mb-1 opacity-50" />
                    <span className="text-[10px]">Provide an image URL to preview visual</span>
                  </div>
                )}
                {price && (
                  <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded-lg bg-slate-900/90 text-cyan-300 text-xs font-bold border border-white/20">
                    ₦{Number(price).toLocaleString()}
                  </div>
                )}
              </div>

              <div className="p-3.5 space-y-2">
                <h4 className="font-bold text-slate-900 dark:text-white text-sm line-clamp-1">
                  {title || 'Your Catchy Headline'}
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                  {description || 'Your advertisement description will be clearly rendered here for potential buyers.'}
                </p>

                <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-1 text-[11px] text-slate-500">
                    <MapPin className="w-3 h-3 text-indigo-500" />
                    <span>{currentLocation.city}</span>
                  </div>

                  <div className="py-1 px-3 rounded-lg bg-emerald-600 text-white text-xs font-bold flex items-center gap-1">
                    <MessageSquare className="w-3 h-3" />
                    <span>WhatsApp</span>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 mt-3 text-center">
              Your advertisement will instantly appear to customers searching in {currentLocation.city}.
            </p>
          </div>

        </div>

      </div>
    </div>
  );
};
