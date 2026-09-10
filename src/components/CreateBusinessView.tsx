'use client';

import React, { useState } from 'react';
import { Building2, ArrowLeft, Loader2, CheckCircle2, AlertCircle, Tag, Check, MapPin } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { businessApi, ApiError } from '../lib/api';
import { NIGERIAN_STATES } from '../types';

export const CreateBusinessView: React.FC = () => {
  const { currentUser, setActiveView, setCurrentUser, refreshData, categories } = useApp();

  const [businessName, setBusinessName] = useState('');
  const [businessDescription, setBusinessDescription] = useState('');
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [locationState, setLocationState] = useState('');
  const [locationCity, setLocationCity] = useState('');
  const [locationAddress, setLocationAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Client-side validation matching backend rules
  const validate = (value: string): string | null => {
    const trimmed = value.trim();
    if (!trimmed) {
      return 'Business name is required.';
    }
    if (trimmed.length < 2) {
      return 'Business name must be at least 2 characters.';
    }
    if (trimmed.length > 100) {
      return 'Business name must not exceed 100 characters.';
    }
    if (/[\u0000-\u001F\u007F]/.test(trimmed)) {
      return 'Business name contains invalid control characters.';
    }
    if (!/[a-zA-Z0-9]/.test(trimmed)) {
      return 'Business name must contain at least one letter or number.';
    }
    return null;
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setBusinessName(val);
    if (validationError) {
      setValidationError(null);
    }
    if (serverError) {
      setServerError(null);
    }
  };

  const handleToggleCategory = (catId: string) => {
    if (categoryError) setCategoryError(null);
    if (selectedCategoryIds.includes(catId)) {
      setSelectedCategoryIds(prev => prev.filter(id => id !== catId));
    } else {
      if (selectedCategoryIds.length >= 5) {
        setCategoryError('You can select a maximum of 5 categories.');
        return;
      }
      setSelectedCategoryIds(prev => [...prev, catId]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    setSuccessMessage(null);

    const error = validate(businessName);
    if (error) {
      setValidationError(error);
      return;
    }

    setIsSubmitting(true);

    try {
      const locationPayload = (locationState && locationCity.trim()) ? {
        state: locationState,
        city: locationCity.trim(),
        country: 'Nigeria',
        ...(locationAddress.trim() ? { address: locationAddress.trim() } : {})
      } : undefined;

      const response = await businessApi.create({
        name: businessName.trim(),
        description: businessDescription.trim() || undefined,
        categoryIds: selectedCategoryIds.length > 0 ? selectedCategoryIds : undefined,
        location: locationPayload
      });

      if (response.success && response.business) {
        setSuccessMessage(`"${response.business.name}" has been registered successfully.`);
        
        // Refresh app data
        await refreshData();
        
        // Update current user to reflect their new businessId and business clientType
        if (currentUser) {
          setCurrentUser({
            ...currentUser,
            businessId: response.business.id,
            clientType: 'business'
          });
        }

        // Navigate to existing business/profile destination after brief visual confirmation
        setTimeout(() => {
          setActiveView('profile');
        }, 900);
      } else {
        throw new Error('Failed to create business.');
      }
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setServerError(err.message || 'Failed to create business.');
      } else if (err instanceof Error) {
        setServerError(err.message);
      } else {
        setServerError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      {/* Back button */}
      <button
        id="create-business-back-btn"
        type="button"
        onClick={() => setActiveView('profile')}
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 mb-6 cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Profile
      </button>

      {/* Main card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
        {/* Card Header */}
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Create Business</h1>
            <p className="text-xs text-slate-500">
              Establish your official business profile on Boost Market
            </p>
          </div>
        </div>

        {/* Success Alert */}
        {successMessage && (
          <div
            id="create-business-success-alert"
            role="status"
            className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm flex items-start gap-3"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">{successMessage}</p>
              <p className="text-xs text-emerald-600 mt-0.5">Redirecting to your profile...</p>
            </div>
          </div>
        )}

        {/* Server Error Alert */}
        {serverError && (
          <div
            id="create-business-server-error"
            role="alert"
            className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-start gap-3"
          >
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Creation Failed</p>
              <p className="text-xs mt-0.5">{serverError}</p>
            </div>
          </div>
        )}

        {/* Creation Form */}
        <form onSubmit={handleSubmit} noValidate className="space-y-6">
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label
                htmlFor="business-name-input"
                className="block text-sm font-semibold text-slate-800"
              >
                Business Name <span className="text-red-500">*</span>
              </label>
              <span className="text-xs text-slate-400">
                {businessName.length}/100
              </span>
            </div>

            <input
              id="business-name-input"
              name="businessName"
              type="text"
              required
              autoFocus
              maxLength={100}
              value={businessName}
              onChange={handleNameChange}
              placeholder="e.g. Arewa Agro Ventures"
              disabled={isSubmitting || !!successMessage}
              className={`w-full px-3.5 py-2.5 text-sm bg-slate-50 border rounded-xl focus:outline-none focus:ring-2 focus:bg-white text-slate-900 transition-all ${
                validationError
                  ? 'border-red-300 focus:ring-red-400'
                  : 'border-slate-200 focus:ring-[#16C784]'
              }`}
            />

            {/* Validation error */}
            {validationError && (
              <p
                id="business-name-error"
                role="alert"
                className="mt-1.5 text-xs text-red-600 font-medium"
              >
                {validationError}
              </p>
            )}
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label
                htmlFor="business-description-input"
                className="block text-sm font-semibold text-slate-800"
              >
                Business Description <span className="text-xs font-normal text-slate-400">(Optional)</span>
              </label>
              <span className="text-xs text-slate-400">
                {businessDescription.length}/2000
              </span>
            </div>

            <textarea
              id="business-description-input"
              name="businessDescription"
              rows={3}
              maxLength={2000}
              value={businessDescription}
              onChange={(e) => setBusinessDescription(e.target.value)}
              placeholder="Tell customers about your business, products, services, or specialty..."
              disabled={isSubmitting || !!successMessage}
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#16C784] focus:bg-white text-slate-900 transition-all resize-y"
            />
            <p className="mt-1 text-xs text-slate-400">
              You can also edit or expand this at any time in your Merchant Dashboard.
            </p>
          </div>

          {/* Categories Selection */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-emerald-600" />
                <span>Categories</span>
                <span className="text-xs font-normal text-slate-400">(Optional, up to 5)</span>
              </label>
              <span className="text-xs text-slate-400">
                {selectedCategoryIds.length}/5 selected
              </span>
            </div>

            {categoryError && (
              <p className="mb-2 text-xs text-red-600 font-medium">{categoryError}</p>
            )}

            <div className="flex flex-wrap gap-2 pt-1">
              {categories
                .filter(cat => cat.active !== false)
                .map((cat) => {
                  const isSelected = selectedCategoryIds.includes(cat.id);
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      id={`create-biz-cat-${cat.id}`}
                      onClick={() => handleToggleCategory(cat.id)}
                      disabled={isSubmitting || !!successMessage}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-semibold'
                          : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                      <span>{cat.name}</span>
                    </button>
                  );
                })}
            </div>
            <p className="mt-2 text-xs text-slate-400">
              Select all categories relevant to your business. You can update them at any time.
            </p>
          </div>

          {/* Location Selection (Optional) */}
          <div>
            <label className="block text-sm font-semibold text-slate-800 flex items-center gap-1.5 mb-1.5">
              <MapPin className="w-4 h-4 text-emerald-600" />
              <span>Location</span>
              <span className="text-xs font-normal text-slate-400">(Optional)</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div>
                <label htmlFor="create-biz-state-select" className="block text-xs font-medium text-slate-600 mb-1">
                  State / Region
                </label>
                <select
                  id="create-biz-state-select"
                  value={locationState}
                  onChange={(e) => setLocationState(e.target.value)}
                  disabled={isSubmitting || !!successMessage}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#16C784] focus:bg-white text-slate-900 transition-all"
                >
                  <option value="">Select State...</option>
                  {NIGERIAN_STATES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="create-biz-city-input" className="block text-xs font-medium text-slate-600 mb-1">
                  City / Town
                </label>
                <input
                  id="create-biz-city-input"
                  type="text"
                  value={locationCity}
                  onChange={(e) => setLocationCity(e.target.value)}
                  placeholder="e.g. Kaduna, Lagos, Kano, Abuja"
                  disabled={isSubmitting || !!successMessage}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#16C784] focus:bg-white text-slate-900 transition-all"
                />
              </div>
            </div>

            <div>
              <label htmlFor="create-biz-address-input" className="block text-xs font-medium text-slate-600 mb-1">
                Street Address (Optional)
              </label>
              <input
                id="create-biz-address-input"
                type="text"
                value={locationAddress}
                onChange={(e) => setLocationAddress(e.target.value)}
                placeholder="e.g. 10 Commercial Avenue"
                disabled={isSubmitting || !!successMessage}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#16C784] focus:bg-white text-slate-900 transition-all"
              />
            </div>
            <p className="mt-1.5 text-xs text-slate-400">
              You can configure detailed GPS coordinates, LGA, and delivery radius in your Merchant Dashboard.
            </p>
          </div>

          {/* Form Actions */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              id="create-business-cancel-btn"
              type="button"
              onClick={() => setActiveView('profile')}
              disabled={isSubmitting || !!successMessage}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              id="create-business-submit-btn"
              type="submit"
              disabled={isSubmitting || !businessName.trim() || !!successMessage}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-[#16C784] hover:bg-[#13af74] rounded-xl shadow-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating Business...</span>
                </>
              ) : (
                <span>Create Business</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
