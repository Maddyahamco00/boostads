import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  PlusCircle, 
  Sparkles, 
  Image as ImageIcon, 
  MapPin, 
  Tag, 
  Flame, 
  DollarSign, 
  X, 
  Phone, 
  Check, 
  Wand2 
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
  const [category, setCategory] = useState(userBiz?.category || 'retail');
  const [price, setPrice] = useState('');
  const [mediaUrl, setMediaUrl] = useState('https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&auto=format&fit=crop&q=80');
  const [tags, setTags] = useState('shoes, fashion, quality, nigeria');
  const [whatsapp, setWhatsapp] = useState(userBiz?.whatsapp || '+2348031234567');
  const [isBoosted, setIsBoosted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
          mediaUrls: [mediaUrl],
          mediaType: 'image',
          price: price ? Number(price) : undefined,
          location: userBiz.location || currentLocation,
          tags: tags.split(',').map(t => t.trim()).filter(Boolean),
          contactWhatsApp: whatsapp,
          isBoosted,
          boostPlan: isBoosted ? { type: 'featured', days: 7, priorityScore: 90 } : undefined
        })
      });
      const data = await res.json();
      if (data.success) {
        setIsCreateAdModalOpen(false);
        refreshData();
      }
    } catch (err) {
      console.error('Failed to create ad:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 sm:p-8 animate-in fade-in zoom-in-95">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-emerald-400" />
              <span>Post New Advertisement / Boost</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Publish your listing across the Boost Market marketplace and local radius.
            </p>
          </div>
          <button
            onClick={() => setIsCreateAdModalOpen(false)}
            className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 mt-6 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Ad Title <span className="text-emerald-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Premium Handcrafted Northern Leather Dress Shoes"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Target Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as BusinessCategoryType)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-100 focus:outline-none focus:border-emerald-500"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Price (NGN) (Optional)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₦</span>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="35000"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-3 text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Ad Media Image URL <span className="text-emerald-400">*</span>
            </label>
            <input
              type="text"
              value={mediaUrl}
              onChange={(e) => setMediaUrl(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-100 focus:outline-none focus:border-emerald-500"
              required
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Full Description & Features <span className="text-emerald-400">*</span>
            </label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what makes your product/service special, materials used, turnaround time, delivery terms..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Tags (Comma Separated)</label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">WhatsApp Contact Number</label>
              <input
                type="text"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Boost Option Toggle */}
          <div 
            onClick={() => setIsBoosted(!isBoosted)}
            className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
              isBoosted 
                ? 'bg-amber-500/10 border-amber-500/50 text-amber-300' 
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                <Flame className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-white block">Spotlight Ad with Priority Boost</span>
                <span className="text-[11px] text-slate-400">Pushes your ad to the top carousel & highlighted badges</span>
              </div>
            </div>

            <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
              isBoosted ? 'bg-amber-500 border-amber-400 text-slate-950 font-black' : 'border-slate-600'
            }`}>
              {isBoosted && <Check className="w-3 h-3" />}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsCreateAdModalOpen(false)}
              className="px-4 py-2.5 rounded-xl text-slate-400 hover:text-white font-semibold"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/20 hover:scale-102 transition-all"
            >
              {isSubmitting ? 'Publishing Ad...' : 'Publish to Marketplace'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
