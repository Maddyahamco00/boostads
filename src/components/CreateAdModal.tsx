import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  PlusCircle, 
  X, 
  Flame, 
  Check 
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
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-gray-200 rounded-xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-xl p-5 sm:p-6">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div>
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <PlusCircle className="w-4 h-4 text-blue-600" />
              <span>Post Advertisement</span>
            </h2>
            <p className="text-xs text-gray-500">
              Publish your listing across Boost Market
            </p>
          </div>
          <button
            onClick={() => setIsCreateAdModalOpen(false)}
            className="w-7 h-7 rounded-lg bg-gray-100 text-gray-400 hover:text-gray-700 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5 mt-4 text-xs">
          <div>
            <label className="block text-gray-700 font-medium mb-1">
              Ad Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Handcrafted Leather Dress Shoes"
              className="w-full bg-white border border-gray-200 rounded-lg p-2 text-xs text-gray-900 focus:outline-none focus:border-blue-600"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-gray-700 font-medium mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as BusinessCategoryType)}
                className="w-full bg-white border border-gray-200 rounded-lg p-2 text-xs text-gray-900 focus:outline-none focus:border-blue-600"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-1">Price (NGN)</label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="35000"
                className="w-full bg-white border border-gray-200 rounded-lg p-2 text-xs text-gray-900 focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-1">
              Image URL *
            </label>
            <input
              type="text"
              value={mediaUrl}
              onChange={(e) => setMediaUrl(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-lg p-2 text-xs text-gray-900 focus:outline-none focus:border-blue-600"
              required
            />
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-1">
              Description *
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe product details, turnaround time, delivery terms..."
              className="w-full bg-white border border-gray-200 rounded-lg p-2 text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-600"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-gray-700 font-medium mb-1">Tags (Comma-separated)</label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-lg p-2 text-xs text-gray-900 focus:outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-1">WhatsApp Number</label>
              <input
                type="text"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-lg p-2 text-xs text-gray-900 focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          {/* Boost Option Toggle */}
          <div 
            onClick={() => setIsBoosted(!isBoosted)}
            className={`p-3 rounded-lg border cursor-pointer transition-colors flex items-center justify-between ${
              isBoosted 
                ? 'bg-amber-50 border-amber-300 text-amber-900' 
                : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Flame className="w-4 h-4 text-amber-500" />
              <div>
                <span className="font-semibold text-xs block text-gray-900">Featured Spotlight</span>
                <span className="text-[11px] text-gray-500">Highlight this ad on marketplace top carousels</span>
              </div>
            </div>

            <div className={`w-4 h-4 rounded border flex items-center justify-center ${
              isBoosted ? 'bg-amber-500 border-amber-500 text-white' : 'border-gray-300'
            }`}>
              {isBoosted && <Check className="w-3 h-3" />}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 flex items-center justify-end gap-2 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIsCreateAdModalOpen(false)}
              className="px-3 py-1.5 rounded-lg text-gray-600 hover:text-gray-900 font-medium text-xs cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Publishing...' : 'Publish Ad'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
