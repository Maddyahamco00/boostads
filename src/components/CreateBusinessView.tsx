'use client';

import React, { useState, useMemo } from 'react';
import { Building2, ArrowLeft, Loader2, CheckCircle2, AlertCircle, Tag, Check, MapPin, Search, ChevronDown, ChevronRight, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { businessApi, ApiError } from '../lib/api';
import { NIGERIAN_STATES, CategoryTreeNode } from '../types';

export const CreateBusinessView: React.FC = () => {
  const { currentUser, setActiveView, setCurrentUser, refreshData, categories, categoryTree } = useApp();

  const [businessName, setBusinessName] = useState('');
  const [businessDescription, setBusinessDescription] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState('');
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [categorySearch, setCategorySearch] = useState('');
  const [expandedSectorIds, setExpandedSectorIds] = useState<Set<string>>(new Set());
  const [locationState, setLocationState] = useState('');
  const [locationCity, setLocationCity] = useState('');
  const [locationAddress, setLocationAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Top-level categories for primary category selection (Epic 3 Task 3.1.4)
  const topLevelCategories = useMemo(() => {
    return categories
      .filter(c => !c.parentId && c.active !== false && c.status !== 'inactive')
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [categories]);

  // Dynamically populated subcategories for selected primary category (Epic 3 Task 3.1.4)
  const availableSubcategories = useMemo(() => {
    if (!selectedCategoryId) return [];
    const parent = categories.find(c => c.id === selectedCategoryId || c.slug === selectedCategoryId);
    if (!parent) return [];

    const options: { id: string; name: string }[] = [];
    const seenNames = new Set<string>();

    // 1. Child Category entities
    categories
      .filter(c => (c.parentId === parent.id || c.parentId === parent.slug) && c.active !== false && c.status !== 'inactive')
      .forEach(c => {
        if (!seenNames.has(c.name.toLowerCase())) {
          seenNames.add(c.name.toLowerCase());
          options.push({ id: c.id, name: c.name });
        }
      });

    // 2. Subcategory tags defined on parent
    (parent.subcategories || []).forEach(tag => {
      if (!seenNames.has(tag.toLowerCase())) {
        seenNames.add(tag.toLowerCase());
        options.push({ id: tag.toLowerCase().replace(/[^a-z0-9]+/g, '-'), name: tag });
      }
    });

    return options.sort((a, b) => a.name.localeCompare(b.name));
  }, [selectedCategoryId, categories]);

  // Map of category ID to breadcrumb path (e.g. "Construction › HVAC Services")
  const categoryBreadcrumbs = useMemo(() => {
    const map = new Map<string, string>();
    const catMap = new Map<string, any>();
    categories.forEach(c => catMap.set(c.id, c));

    categories.forEach(c => {
      const parts: string[] = [c.name];
      let curr = c;
      let depthGuard = 0;
      while (curr.parentId && depthGuard < 5) {
        depthGuard++;
        const parent = catMap.get(curr.parentId);
        if (parent) {
          parts.unshift(parent.name);
          curr = parent;
        } else {
          break;
        }
      }
      map.set(c.id, parts.join(' › '));
    });
    return map;
  }, [categories]);

  // Hierarchical display tree
  const displayTree = useMemo(() => {
    if (categoryTree && categoryTree.length > 0) {
      return categoryTree;
    }
    const rootNodes: any[] = [];
    const childrenMap = new Map<string, any[]>();

    categories.forEach(cat => {
      if (cat.parentId) {
        const arr = childrenMap.get(cat.parentId) || [];
        arr.push(cat);
        childrenMap.set(cat.parentId, arr);
      }
    });

    categories.forEach(cat => {
      if (!cat.parentId) {
        rootNodes.push({
          ...cat,
          children: childrenMap.get(cat.id) || []
        });
      }
    });
    return rootNodes;
  }, [categoryTree, categories]);

  const toggleSectorExpanded = (sectorId: string) => {
    setExpandedSectorIds(prev => {
      const next = new Set(prev);
      if (next.has(sectorId)) next.delete(sectorId);
      else next.add(sectorId);
      return next;
    });
  };

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
        categoryId: selectedCategoryId || undefined,
        category: selectedCategoryId || undefined,
        subcategoryId: selectedSubcategoryId || undefined,
        subcategory: selectedSubcategoryId || undefined,
        categoryIds: selectedCategoryId
          ? [selectedCategoryId, ...selectedCategoryIds.filter(id => id !== selectedCategoryId)]
          : (selectedCategoryIds.length > 0 ? selectedCategoryIds : undefined),
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

          {/* Primary Category & Subcategory Selection (Epic 3 Feature 3.1 Task 3.1.4) */}
          <div className="p-4 bg-slate-50/80 border border-slate-200/90 rounded-2xl space-y-3.5">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-emerald-600" />
                <span>Primary Category & Subcategory</span>
              </label>
              <span className="text-xs text-slate-500 font-medium">Task 3.1.4</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label htmlFor="business-category-select" className="block text-xs font-semibold text-slate-700 mb-1">
                  Primary Category <span className="text-red-500">*</span>
                </label>
                <select
                  id="business-category-select"
                  name="categoryId"
                  value={selectedCategoryId}
                  onChange={(e) => {
                    const newCat = e.target.value;
                    setSelectedCategoryId(newCat);
                    // Reset subcategory immediately when category changes to prevent invalid combinations
                    setSelectedSubcategoryId('');
                    if (categoryError) setCategoryError(null);
                  }}
                  disabled={isSubmitting || !!successMessage}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#16C784] text-slate-900 transition-all cursor-pointer shadow-2xs font-medium"
                >
                  <option value="">Select a Category...</option>
                  {topLevelCategories.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="business-subcategory-select" className="block text-xs font-semibold text-slate-700 mb-1">
                  Subcategory <span className="text-xs font-normal text-slate-400">(Optional)</span>
                </label>
                <select
                  id="business-subcategory-select"
                  name="subcategoryId"
                  value={selectedSubcategoryId}
                  onChange={(e) => {
                    setSelectedSubcategoryId(e.target.value);
                    if (categoryError) setCategoryError(null);
                  }}
                  disabled={isSubmitting || !!successMessage || !selectedCategoryId || availableSubcategories.length === 0}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#16C784] text-slate-900 transition-all cursor-pointer disabled:bg-slate-100 disabled:opacity-60 disabled:cursor-not-allowed shadow-2xs font-medium"
                >
                  {!selectedCategoryId ? (
                    <option value="">Select a category first</option>
                  ) : availableSubcategories.length === 0 ? (
                    <option value="">No subcategories available</option>
                  ) : (
                    <>
                      <option value="">None / All subcategories</option>
                      {availableSubcategories.map(sub => (
                        <option key={sub.id} value={sub.name}>
                          {sub.name}
                        </option>
                      ))}
                    </>
                  )}
                </select>
              </div>
            </div>

            {selectedCategoryId && (
              <p className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
                <Check className="w-3.5 h-3.5 shrink-0" />
                <span>
                  Selected: <strong>{categories.find(c => c.id === selectedCategoryId)?.name}</strong>
                  {selectedSubcategoryId ? <> › <strong>{selectedSubcategoryId}</strong></> : ' (General)'}
                </span>
              </p>
            )}
          </div>

          {/* Hierarchical Categories Selection (Epic 3 Feature 3.1 Task 3.1.2) */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-emerald-600" />
                <span>Business Sectors & Subcategories</span>
                <span className="text-xs font-normal text-slate-400">(Optional, up to 5)</span>
              </label>
              <span className="text-xs font-medium text-slate-500">
                {selectedCategoryIds.length}/5 selected
              </span>
            </div>

            {categoryError && (
              <p className="mb-2 text-xs text-red-600 font-medium">{categoryError}</p>
            )}

            {/* Selected Categories with Breadcrumbs */}
            {selectedCategoryIds.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2.5 p-2.5 bg-emerald-50/70 border border-emerald-200/80 rounded-xl">
                {selectedCategoryIds.map(id => {
                  const cat = categories.find(c => c.id === id);
                  if (!cat) return null;
                  const breadcrumb = categoryBreadcrumbs.get(id) || cat.name;
                  return (
                    <span 
                      key={id}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-white border border-emerald-300 text-emerald-800 shadow-2xs"
                    >
                      <span>{breadcrumb}</span>
                      <button
                        type="button"
                        onClick={() => handleToggleCategory(id)}
                        className="text-emerald-500 hover:text-red-500 cursor-pointer transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}

            {/* Search Filter for Fast Finding */}
            <div className="relative mb-3">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={categorySearch}
                onChange={(e) => setCategorySearch(e.target.value)}
                placeholder="Filter categories or subcategories (e.g. HVAC, Roofing, Dental)..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16C784] focus:bg-white text-slate-800"
              />
            </div>

            {/* Hierarchical Browser or Filtered List */}
            {categorySearch.trim() ? (
              <div className="flex flex-wrap gap-2 max-h-56 overflow-y-auto p-1">
                {categories
                  .filter(cat => cat.active !== false && (
                    cat.name.toLowerCase().includes(categorySearch.toLowerCase()) ||
                    cat.description?.toLowerCase().includes(categorySearch.toLowerCase()) ||
                    cat.subcategories?.some(s => s.toLowerCase().includes(categorySearch.toLowerCase()))
                  ))
                  .map(cat => {
                    const isSelected = selectedCategoryIds.includes(cat.id);
                    const breadcrumb = categoryBreadcrumbs.get(cat.id) || cat.name;
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
                        <span>{breadcrumb}</span>
                      </button>
                    );
                  })}
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {displayTree
                  .filter(sector => sector.status !== 'INACTIVE')
                  .map(sector => {
                    const hasChildren = sector.children && sector.children.length > 0;
                    const isExpanded = expandedSectorIds.has(sector.id);
                    const isSectorSelected = selectedCategoryIds.includes(sector.id);

                    return (
                      <div key={sector.id} className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                        <div className="flex items-center justify-between p-2.5 bg-slate-50 hover:bg-slate-100/80 transition-colors">
                          <button
                            type="button"
                            id={`create-biz-cat-${sector.id}`}
                            onClick={() => handleToggleCategory(sector.id)}
                            disabled={isSubmitting || !!successMessage}
                            className={`inline-flex items-center gap-2 px-2.5 py-1 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                              isSectorSelected
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                                : 'bg-white border-slate-200 text-slate-800 hover:border-slate-300'
                            }`}
                          >
                            {isSectorSelected && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                            <span>{sector.name}</span>
                          </button>

                          {hasChildren && (
                            <button
                              type="button"
                              onClick={() => toggleSectorExpanded(sector.id)}
                              className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-slate-800 px-2 py-1 rounded cursor-pointer"
                            >
                              <span>{sector.children.length} subcategories</span>
                              {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                            </button>
                          )}
                        </div>

                        {hasChildren && isExpanded && (
                          <div className="p-3 bg-white border-t border-slate-100 flex flex-wrap gap-2">
                            {sector.children.map((child: any) => {
                              const isChildSelected = selectedCategoryIds.includes(child.id);
                              return (
                                <button
                                  key={child.id}
                                  type="button"
                                  id={`create-biz-cat-${child.id}`}
                                  onClick={() => handleToggleCategory(child.id)}
                                  disabled={isSubmitting || !!successMessage}
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                                    isChildSelected
                                      ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-semibold'
                                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                                  }`}
                                >
                                  {isChildSelected && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                                  <span>{child.name}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}

            <p className="mt-2 text-xs text-slate-400">
              Select primary sectors and specific subcategories that best represent your services. You can update your specialties anytime.
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
