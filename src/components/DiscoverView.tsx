'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { 
  PlusCircle, 
  ArrowRight, 
  Sparkles, 
  Flame, 
  MapPin, 
  TrendingUp, 
  ShieldCheck, 
  SlidersHorizontal, 
  Search, 
  Eye, 
  Users, 
  Zap, 
  CheckCircle2, 
  Store, 
  MessageSquare, 
  Layers, 
  Target, 
  BarChart3, 
  ChevronRight,
  ChevronLeft,
  ExternalLink,
  DollarSign,
  Loader2,
  AlertCircle,
  X,
  Package,
  Tag,
  Briefcase,
  Clock
} from 'lucide-react';
import { AdvertisementCard } from './AdvertisementCard';
import { Advertisement, Business, PublicBusinessProfile, PublicProductProfile, Product, PublicServiceProfile, Service, PublicAdvertisementProfile } from '../types';
import { businessApi, productApi, serviceApi, advertisementApi } from '../lib/api';

export const DiscoverView: React.FC = () => {
  const { 
    advertisements, 
    businesses, 
    categories, 
    categoryTree,
    currentLocation, 
    searchQuery, 
    setSearchQuery, 
    selectedCategory, 
    setSelectedCategory, 
    setIsCreateAdModalOpen,
    setActiveView,
    viewBusinessDetail
  } = useApp();

  // Feed Filter States
  const [feedTab, setFeedTab] = useState<'all' | 'promoted' | 'nearby' | 'trending' | 'advertisements' | 'businesses' | 'products' | 'services'>('all');
  const [selectedRadiusKm, setSelectedRadiusKm] = useState<number>(25);

  // Top-level categories (roots) for primary filter bar
  const topLevelCategories = useMemo(() => {
    return categories.filter(c => !c.parentId && c.active !== false);
  }, [categories]);

  // Find active category node if one is selected
  const activeCategoryObject = useMemo(() => {
    if (!selectedCategory || selectedCategory === 'all') return null;
    const q = selectedCategory.toLowerCase();
    return categories.find(c => 
      c.id.toLowerCase() === q || 
      c.slug.toLowerCase() === q || 
      c.name.toLowerCase() === q
    ) || null;
  }, [selectedCategory, categories]);

  // Find root parent sector of currently selected category
  const activeRootSector = useMemo(() => {
    if (!activeCategoryObject) return null;
    let curr = activeCategoryObject;
    let guard = 0;
    while (curr.parentId && guard < 5) {
      guard++;
      const p = categories.find(c => c.id === curr.parentId);
      if (p) curr = p;
      else break;
    }
    return curr;
  }, [activeCategoryObject, categories]);

  // Subcategories belonging to the active root sector
  const activeSectorSubcategories = useMemo(() => {
    if (!activeRootSector) return [];
    return categories.filter(c => c.parentId === activeRootSector.id && c.active !== false);
  }, [activeRootSector, categories]);

  // Matching Category Identifiers (Hierarchical: includes parent AND all its descendants!)
  const matchingCategoryIdentifiers = useMemo(() => {
    if (!selectedCategory || selectedCategory === 'all') return null;

    const ids = new Set<string>();
    const query = selectedCategory.toLowerCase();

    const targetCat = categories.find(c => 
      c.id.toLowerCase() === query || 
      c.slug.toLowerCase() === query || 
      c.name.toLowerCase() === query
    );

    if (!targetCat) {
      ids.add(query);
      return ids;
    }

    ids.add(targetCat.id.toLowerCase());
    ids.add(targetCat.slug.toLowerCase());
    ids.add(targetCat.name.toLowerCase());

    const addDescendants = (parentId: string) => {
      const children = categories.filter(c => c.parentId === parentId);
      for (const child of children) {
        ids.add(child.id.toLowerCase());
        ids.add(child.slug.toLowerCase());
        ids.add(child.name.toLowerCase());
        addDescendants(child.id);
      }
    };
    addDescendants(targetCat.id);

    return ids;
  }, [selectedCategory, categories]);

  // Filter advertisements based on search, tab, hierarchical category, and location
  const filteredAds = useMemo(() => {
    return advertisements.filter(ad => {
      // Hierarchical Category Match
      if (matchingCategoryIdentifiers) {
        const adCat = ad.category?.toLowerCase();
        const bizCat = ad.businessCategory?.toLowerCase();
        const matches = (adCat && matchingCategoryIdentifiers.has(adCat)) ||
                        (bizCat && matchingCategoryIdentifiers.has(bizCat));
        if (!matches) return false;
      }

      // Search Query Match
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const textMatch = ad.title?.toLowerCase().includes(q) ||
                          ad.description?.toLowerCase().includes(q) ||
                          ad.businessName?.toLowerCase().includes(q) ||
                          ad.tags?.some(t => t.toLowerCase().includes(q));
        if (!textMatch) return false;
      }

      // Tab Match
      if (feedTab === 'promoted') {
        return ad.isBoosted === true;
      }
      if (feedTab === 'nearby') {
        return ad.location?.city?.toLowerCase() === currentLocation?.city?.toLowerCase();
      }
      if (feedTab === 'trending') {
        return (ad.viewsCount || 0) > 100 || ad.isBoosted;
      }

      return true;
    }).sort((a, b) => {
      if (a.isBoosted && !b.isBoosted) return -1;
      if (!a.isBoosted && b.isBoosted) return 1;
      return (b.viewsCount || 0) - (a.viewsCount || 0);
    });
  }, [advertisements, matchingCategoryIdentifiers, searchQuery, feedTab, currentLocation]);

  // Filtered businesses with hierarchical category matching
  const filteredBusinesses = useMemo(() => {
    return businesses.filter(b => {
      if (matchingCategoryIdentifiers) {
        const bCat = b.category?.toLowerCase();
        const hasMatch = (bCat && matchingCategoryIdentifiers.has(bCat)) ||
                         (b.categories && b.categories.some((cid: string) => matchingCategoryIdentifiers.has(cid.toLowerCase()))) ||
                         (b.subcategories && b.subcategories.some((sub: string) => matchingCategoryIdentifiers.has(sub.toLowerCase())));
        if (!hasMatch) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return b.name.toLowerCase().includes(q) || b.description.toLowerCase().includes(q);
      }
      return true;
    });
  }, [businesses, matchingCategoryIdentifiers, searchQuery]);

  const scrollToFeed = () => {
    const el = document.getElementById('advertising-feed');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleOpenBusiness = (bizId: string) => {
    viewBusinessDetail(bizId);
  };

  // Dedicated Business Search State (Epic 3 Feature 3.2 Task 3.2.1)
  const [businessSearchInput, setBusinessSearchInput] = useState<string>('');
  const [businessSearchResults, setBusinessSearchResults] = useState<PublicBusinessProfile[] | null>(null);
  const [businessSearchTotal, setBusinessSearchTotal] = useState<number>(0);
  const [businessSearchPage, setBusinessSearchPage] = useState<number>(1);
  const [businessSearchTotalPages, setBusinessSearchTotalPages] = useState<number>(1);
  const [isBusinessSearchLoading, setIsBusinessSearchLoading] = useState<boolean>(false);
  const [businessSearchError, setBusinessSearchError] = useState<string | null>(null);
  const [hasExecutedBusinessSearch, setHasExecutedBusinessSearch] = useState<boolean>(false);

  const executeBusinessSearch = async (query: string, page: number = 1) => {
    const trimmed = query.trim();
    if (!trimmed) {
      setBusinessSearchResults(null);
      setHasExecutedBusinessSearch(false);
      setBusinessSearchError(null);
      return;
    }

    setIsBusinessSearchLoading(true);
    setBusinessSearchError(null);
    setHasExecutedBusinessSearch(true);

    try {
      const res = await businessApi.search(trimmed, { page, limit: 12 });
      if (res.success) {
        setBusinessSearchResults(res.businesses);
        setBusinessSearchTotal(res.total);
        setBusinessSearchPage(res.page);
        setBusinessSearchTotalPages(res.totalPages);
      }
    } catch (err: any) {
      setBusinessSearchError(err?.message || 'Failed to complete business search. Please try again.');
      setBusinessSearchResults([]);
    } finally {
      setIsBusinessSearchLoading(false);
    }
  };

  const handleClearBusinessSearch = () => {
    setBusinessSearchInput('');
    setBusinessSearchResults(null);
    setHasExecutedBusinessSearch(false);
    setBusinessSearchError(null);
  };

  // Dedicated Product Search State (Epic 3 Feature 3.2 Task 3.2.2)
  const [productSearchInput, setProductSearchInput] = useState<string>('');
  const [productSearchResults, setProductSearchResults] = useState<PublicProductProfile[] | null>(null);
  const [allCatalogProducts, setAllCatalogProducts] = useState<PublicProductProfile[]>([]);
  const [productSearchTotal, setProductSearchTotal] = useState<number>(0);
  const [productSearchPage, setProductSearchPage] = useState<number>(1);
  const [productSearchTotalPages, setProductSearchTotalPages] = useState<number>(1);
  const [isProductSearchLoading, setIsProductSearchLoading] = useState<boolean>(false);
  const [productSearchError, setProductSearchError] = useState<string | null>(null);
  const [hasExecutedProductSearch, setHasExecutedProductSearch] = useState<boolean>(false);

  // Load initial product catalog when on products tab
  useEffect(() => {
    if (feedTab === 'products' && allCatalogProducts.length === 0 && !hasExecutedProductSearch) {
      let isMounted = true;
      setIsProductSearchLoading(true);
      fetch('/api/products')
        .then(res => res.json())
        .then(data => {
          if (isMounted && data.success && Array.isArray(data.products)) {
            const mapped: PublicProductProfile[] = data.products.map((p: Product) => {
              const biz = businesses.find(b => b.id === p.businessId);
              return {
                id: p.id,
                businessId: p.businessId,
                name: p.name,
                description: p.description,
                price: p.price,
                currency: p.currency,
                imageUrls: p.imageUrls,
                category: p.category,
                inStock: p.inStock,
                sku: p.sku,
                createdAt: p.createdAt,
                business: biz ? {
                  id: biz.id,
                  name: biz.name,
                  slug: biz.slug,
                  logoUrl: biz.logoUrl,
                  category: biz.category,
                  categoryId: biz.categoryId,
                  categoryLabel: biz.categoryLabel,
                  subcategoryId: biz.subcategoryId,
                  subcategoryName: biz.subcategoryName,
                  location: biz.location ? {
                    city: biz.location.city,
                    state: biz.location.state,
                    country: biz.location.country,
                    lga: biz.location.lga
                  } : undefined,
                  isVerified: biz.isVerified
                } : undefined
              };
            });
            setAllCatalogProducts(mapped);
          }
        })
        .catch(() => {})
        .finally(() => {
          if (isMounted) setIsProductSearchLoading(false);
        });
      return () => { isMounted = false; };
    }
  }, [feedTab, allCatalogProducts.length, hasExecutedProductSearch, businesses]);

  const executeProductSearch = async (query: string, page: number = 1) => {
    const trimmed = query.trim();
    if (!trimmed) {
      setProductSearchResults(null);
      setHasExecutedProductSearch(false);
      setProductSearchError(null);
      return;
    }

    setIsProductSearchLoading(true);
    setProductSearchError(null);
    setHasExecutedProductSearch(true);

    try {
      const res = await productApi.search(trimmed, { page, limit: 12 });
      if (res.success) {
        setProductSearchResults(res.products);
        setProductSearchTotal(res.total);
        setProductSearchPage(res.page);
        setProductSearchTotalPages(res.totalPages);
      }
    } catch (err: any) {
      setProductSearchError(err?.message || 'Failed to complete product search. Please try again.');
      setProductSearchResults([]);
    } finally {
      setIsProductSearchLoading(false);
    }
  };

  const handleClearProductSearch = () => {
    setProductSearchInput('');
    setProductSearchResults(null);
    setHasExecutedProductSearch(false);
    setProductSearchError(null);
  };

  const displayedProducts = useMemo(() => {
    if (hasExecutedProductSearch) {
      return productSearchResults || [];
    }
    if (matchingCategoryIdentifiers && allCatalogProducts.length > 0) {
      return allCatalogProducts.filter(p => {
        const catStr = (p.category || '').toLowerCase();
        for (const id of matchingCategoryIdentifiers) {
          if (catStr.includes(id)) return true;
        }
        return false;
      });
    }
    return allCatalogProducts;
  }, [hasExecutedProductSearch, productSearchResults, allCatalogProducts, matchingCategoryIdentifiers]);

  // Dedicated Service Search State (Epic 3 Feature 3.2 Task 3.2.3)
  const [serviceSearchInput, setServiceSearchInput] = useState<string>('');
  const [serviceSearchResults, setServiceSearchResults] = useState<PublicServiceProfile[] | null>(null);
  const [allCatalogServices, setAllCatalogServices] = useState<PublicServiceProfile[]>([]);
  const [serviceSearchTotal, setServiceSearchTotal] = useState<number>(0);
  const [serviceSearchPage, setServiceSearchPage] = useState<number>(1);
  const [serviceSearchTotalPages, setServiceSearchTotalPages] = useState<number>(1);
  const [isServiceSearchLoading, setIsServiceSearchLoading] = useState<boolean>(false);
  const [serviceSearchError, setServiceSearchError] = useState<string | null>(null);
  const [hasExecutedServiceSearch, setHasExecutedServiceSearch] = useState<boolean>(false);

  // Load initial service catalog when on services tab
  useEffect(() => {
    if (feedTab === 'services' && allCatalogServices.length === 0 && !hasExecutedServiceSearch) {
      let isMounted = true;
      setIsServiceSearchLoading(true);
      fetch('/api/services')
        .then(res => res.json())
        .then(data => {
          if (isMounted && data.success && Array.isArray(data.services)) {
            const mapped: PublicServiceProfile[] = data.services.map((s: Service) => {
              const biz = businesses.find(b => b.id === s.businessId);
              return {
                id: s.id,
                businessId: s.businessId,
                name: s.name,
                description: s.description,
                startingPrice: s.startingPrice,
                currency: s.currency,
                durationUnit: s.durationUnit,
                imageUrls: s.imageUrls,
                category: s.category,
                categoryId: s.categoryId,
                subcategoryId: s.subcategoryId,
                subcategoryName: s.subcategoryName,
                deliveryMode: s.deliveryMode,
                createdAt: s.createdAt,
                business: biz ? {
                  id: biz.id,
                  name: biz.name,
                  slug: biz.slug,
                  logoUrl: biz.logoUrl,
                  category: biz.category,
                  categoryId: biz.categoryId,
                  categoryLabel: biz.categoryLabel,
                  subcategoryId: biz.subcategoryId,
                  subcategoryName: biz.subcategoryName,
                  location: biz.location ? {
                    city: biz.location.city,
                    state: biz.location.state,
                    country: biz.location.country,
                    lga: biz.location.lga
                  } : undefined,
                  isVerified: biz.isVerified
                } : undefined
              };
            });
            setAllCatalogServices(mapped);
          }
        })
        .catch(() => {})
        .finally(() => {
          if (isMounted) setIsServiceSearchLoading(false);
        });
      return () => { isMounted = false; };
    }
  }, [feedTab, allCatalogServices.length, hasExecutedServiceSearch, businesses]);

  const executeServiceSearch = async (query: string, page: number = 1) => {
    const trimmed = query.trim();
    if (!trimmed) {
      setServiceSearchResults(null);
      setHasExecutedServiceSearch(false);
      setServiceSearchError(null);
      return;
    }

    setIsServiceSearchLoading(true);
    setServiceSearchError(null);
    setHasExecutedServiceSearch(true);

    try {
      const res = await serviceApi.search(trimmed, { page, limit: 12 });
      if (res.success) {
        setServiceSearchResults(res.services);
        setServiceSearchTotal(res.total);
        setServiceSearchPage(res.page);
        setServiceSearchTotalPages(res.totalPages);
      }
    } catch (err: any) {
      setServiceSearchError(err?.message || 'Failed to complete service search. Please try again.');
      setServiceSearchResults([]);
    } finally {
      setIsServiceSearchLoading(false);
    }
  };

  const handleClearServiceSearch = () => {
    setServiceSearchInput('');
    setServiceSearchResults(null);
    setHasExecutedServiceSearch(false);
    setServiceSearchError(null);
  };

  const displayedServices = useMemo(() => {
    if (hasExecutedServiceSearch) {
      return serviceSearchResults || [];
    }
    if (matchingCategoryIdentifiers && allCatalogServices.length > 0) {
      return allCatalogServices.filter(s => {
        const catStr = (s.category || '').toLowerCase();
        for (const id of matchingCategoryIdentifiers) {
          if (catStr.includes(id)) return true;
        }
        return false;
      });
    }
    return allCatalogServices;
  }, [hasExecutedServiceSearch, serviceSearchResults, matchingCategoryIdentifiers, allCatalogServices]);

  // Dedicated Advertisement Search State (Epic 3 Feature 3.2 Task 3.2.4)
  const [adSearchInput, setAdSearchInput] = useState<string>('');
  const [adSearchResults, setAdSearchResults] = useState<PublicAdvertisementProfile[] | null>(null);
  const [adSearchTotal, setAdSearchTotal] = useState<number>(0);
  const [adSearchPage, setAdSearchPage] = useState<number>(1);
  const [adSearchTotalPages, setAdSearchTotalPages] = useState<number>(1);
  const [isAdSearchLoading, setIsAdSearchLoading] = useState<boolean>(false);
  const [adSearchError, setAdSearchError] = useState<string | null>(null);
  const [hasExecutedAdSearch, setHasExecutedAdSearch] = useState<boolean>(false);

  const executeAdSearch = async (query: string, page: number = 1) => {
    const trimmed = query.trim();
    if (!trimmed) {
      setAdSearchResults(null);
      setHasExecutedAdSearch(false);
      setAdSearchError(null);
      return;
    }

    setIsAdSearchLoading(true);
    setAdSearchError(null);
    setHasExecutedAdSearch(true);

    try {
      const res = await advertisementApi.search(trimmed, { page, limit: 12 });
      if (res.success) {
        setAdSearchResults(res.advertisements);
        setAdSearchTotal(res.total);
        setAdSearchPage(res.page);
        setAdSearchTotalPages(res.totalPages);
      }
    } catch (err: any) {
      setAdSearchError(err?.message || 'Failed to complete advertisement search. Please try again.');
      setAdSearchResults([]);
    } finally {
      setIsAdSearchLoading(false);
    }
  };

  const handleClearAdSearch = () => {
    setAdSearchInput('');
    setAdSearchResults(null);
    setHasExecutedAdSearch(false);
    setAdSearchError(null);
  };

  return (
    <div id="discover-view-container" className="min-h-screen pb-24 text-slate-900 dark:text-slate-100 transition-colors">
      
      {/* 1. HERO SECTION: High-Impact Business Advertising Proposition */}
      <section className="relative overflow-hidden pt-12 sm:pt-20 pb-16 sm:pb-24 px-4 sm:px-6 lg:px-8 border-b border-slate-200/80 dark:border-slate-800/80">
        
        {/* Subtle Ambient Background Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full overflow-hidden pointer-events-none -z-10">
          <div className="absolute top-[-10%] left-[20%] w-[500px] h-[500px] rounded-full bg-indigo-500/10 dark:bg-indigo-600/15 blur-3xl" />
          <div className="absolute top-[20%] right-[15%] w-[450px] h-[450px] rounded-full bg-cyan-500/10 dark:bg-cyan-500/15 blur-3xl" />
          <div className="absolute bottom-[-10%] left-[40%] w-[600px] h-[300px] rounded-full bg-purple-500/10 dark:bg-purple-600/15 blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            
            {/* Left Column: Core Value Message & Action */}
            <div className="lg:col-span-7 space-y-6 sm:space-y-8 text-center lg:text-left">
              
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold tracking-wide glass-pill text-indigo-700 dark:text-cyan-300">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-cyan-400" />
                <span>The Premier Business Advertising Network</span>
              </div>

              {/* Main Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.08] text-slate-900 dark:text-white">
                Put Your Business in Front of the <span className="brand-gradient-text">Right People.</span>
              </h1>

              {/* Supporting Subtitle */}
              <p className="text-base sm:text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                Create, promote, and manage high-impact business advertisements. Distribute locally or across social platforms to connect with ready-to-buy customers.
              </p>

              {/* Primary & Secondary Call to Actions */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 sm:gap-4 pt-2">
                <button
                  id="hero-advertise-btn"
                  onClick={() => setIsCreateAdModalOpen(true)}
                  className="btn-advertise w-full sm:w-auto px-7 py-3.5 rounded-2xl text-base font-bold flex items-center justify-center gap-2.5 shadow-lg cursor-pointer"
                >
                  <PlusCircle className="w-5 h-5" />
                  <span>Advertise Your Business</span>
                </button>

                <button
                  id="hero-explore-btn"
                  onClick={scrollToFeed}
                  className="w-full sm:w-auto px-7 py-3.5 rounded-2xl text-base font-bold glass-card hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-white flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <span>Explore Advertisements</span>
                  <ArrowRight className="w-4 h-4 text-indigo-500" />
                </button>
              </div>

              {/* Quick Proof Metrics Strip */}
              <div className="pt-6 border-t border-slate-200/80 dark:border-slate-800 grid grid-cols-3 gap-4 max-w-lg mx-auto lg:mx-0">
                <div>
                  <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">250K+</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">Ad Impressions</div>
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-black text-indigo-600 dark:text-cyan-400">18.5K+</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">Customer Leads</div>
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">99.4%</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">Local Delivery</div>
                </div>
              </div>

            </div>

            {/* Right Column: Live Interactive Advertisement Showcase */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="relative w-full max-w-md">
                
                {/* Floating Signal Ping */}
                <div className="absolute -top-3 -right-3 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-600 text-white text-xs font-bold shadow-lg animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-cyan-300" />
                  <span>Live Ad Stream</span>
                </div>

                {/* Showcased Active Advertisement */}
                {advertisements.length > 0 ? (
                  <div className="transform hover:-rotate-1 transition-transform duration-300">
                    <AdvertisementCard 
                      ad={advertisements[0]} 
                      featured={true} 
                      onViewBusiness={handleOpenBusiness}
                    />
                  </div>
                ) : (
                  <div className="glass-card p-6 rounded-3xl text-center">
                    <p className="text-sm text-slate-500">Loading live advertisements...</p>
                  </div>
                )}

                {/* Floating Reach Badge Card */}
                <div className="absolute -bottom-5 -left-4 sm:-left-6 z-20 glass-panel p-3 sm:p-4 rounded-2xl shadow-xl flex items-center gap-3 border border-white/40 dark:border-slate-700/80">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-cyan-400 flex items-center justify-center text-white shrink-0">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">Hyper-Local Radius</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">Targeted in {currentLocation.city}</div>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 2. HOW BOOST MARKET WORKS: Strategic Advertising Journey */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 border-b border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/30">
        <div className="max-w-7xl mx-auto">
          
          <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold glass-pill text-indigo-600 dark:text-cyan-400 mb-3">
              <span>The Advertising Engine</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              From Creation to Measurable Customer Results
            </h2>
            <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-slate-300">
              Businesses register on Boost Market to advertise products, services, and offers directly to ready customers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6 relative">
            
            {/* Step 1 */}
            <div className="glass-card p-6 rounded-2xl flex flex-col justify-between relative group hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors">
              <div>
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-cyan-400 flex items-center justify-center font-black text-sm mb-4">
                  01
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1.5">
                  Business Registers
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  Establish your verified business profile, location, contact, and catalog showcase.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="glass-card p-6 rounded-2xl flex flex-col justify-between relative group hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors">
              <div>
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-cyan-400 flex items-center justify-center font-black text-sm mb-4">
                  02
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1.5">
                  Create Advertisement
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  Upload visual media, craft compelling headlines, offers, and direct WhatsApp / call CTAs.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="glass-card p-6 rounded-2xl flex flex-col justify-between relative group border-indigo-400/50 dark:border-indigo-500/50 shadow-md">
              <div>
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center font-black text-sm mb-4">
                  03
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1.5">
                  Boost & Distribute
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  Supercharge reach across Boost Market feeds, Facebook, Instagram, Google, and your local city.
                </p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="glass-card p-6 rounded-2xl flex flex-col justify-between relative group hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors">
              <div>
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-cyan-400 flex items-center justify-center font-black text-sm mb-4">
                  04
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1.5">
                  People Discover
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  Audience discovers verified ads nearby, compares promotions, and reviews credentials.
                </p>
              </div>
            </div>

            {/* Step 5 */}
            <div className="glass-card p-6 rounded-2xl flex flex-col justify-between relative group hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors">
              <div>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black text-sm mb-4">
                  05
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1.5">
                  Business Gets Results
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  Receive direct WhatsApp messages, phone calls, walk-in visits, and tracked sales.
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 3. DISCOVERY & ADVERTISING FEED: Primary Interactive Center */}
      <section id="advertising-feed" className="py-14 sm:py-18 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        
        {/* Feed Header Controls */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-slate-200/80 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Active Advertising Marketplace
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight mt-1">
              Explore Live Advertisements & Offers
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Showing active campaigns in <span className="font-semibold text-slate-800 dark:text-slate-200">{currentLocation.city}</span> and nationwide.
            </p>
          </div>

          {/* Feed Filter Segmented Controls */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 glass-pill rounded-2xl self-start md:self-auto">
            <button
              onClick={() => setFeedTab('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                feedTab === 'all'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All Ads ({advertisements.length})
            </button>

            <button
              onClick={() => setFeedTab('promoted')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                feedTab === 'promoted'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>Promoted First</span>
            </button>

            <button
              onClick={() => setFeedTab('nearby')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                feedTab === 'nearby'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Nearby ({currentLocation.city})</span>
            </button>

            <button
              onClick={() => setFeedTab('trending')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                feedTab === 'trending'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Trending</span>
            </button>

            <button
              id="feed-tab-advertisements"
              onClick={() => setFeedTab('advertisements')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                feedTab === 'advertisements'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Search Ads</span>
            </button>

            <button
              onClick={() => setFeedTab('businesses')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                feedTab === 'businesses'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Store className="w-3.5 h-3.5" />
              <span>Businesses ({businesses.length})</span>
            </button>

            <button
              id="feed-tab-products"
              onClick={() => setFeedTab('products')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                feedTab === 'products'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Products</span>
            </button>

            <button
              id="feed-tab-services"
              onClick={() => setFeedTab('services')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                feedTab === 'services'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>Services</span>
            </button>
          </div>
        </div>

        {/* Category Filter Pills (Hierarchical: Root Sectors + Nested Subcategories) */}
        <div className="pt-4 pb-2 space-y-2.5">
          {/* Primary Level: All Categories + Top-Level Industry Sectors */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold shadow-xs'
                  : 'glass-pill text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800'
              }`}
            >
              All Categories
            </button>

            {topLevelCategories.map((c) => {
              const isDirectlySelected = selectedCategory === c.id || selectedCategory === c.slug;
              const isDescendantSelected = activeRootSector?.id === c.id;
              const isActive = isDirectlySelected || isDescendantSelected;

              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedCategory(c.id)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-indigo-600 text-white font-bold shadow-xs'
                      : 'glass-pill text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800'
                  }`}
                >
                  <span>{c.iconName === 'Layers' ? '📂' : (c.iconName || '🏷️')}</span>
                  <span>{c.name}</span>
                </button>
              );
            })}
          </div>

          {/* Secondary Level: Subcategories under Active Sector (Epic 3 Feature 3.1 Task 3.1.2) */}
          {activeRootSector && activeSectorSubcategories.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pl-1 py-1.5 bg-slate-100/60 dark:bg-slate-800/40 rounded-xl px-3 border border-slate-200/60 dark:border-slate-700/60">
              <span className="text-[11px] font-bold text-slate-400 whitespace-nowrap uppercase tracking-wider">
                {activeRootSector.name} Specialties:
              </span>

              {/* All in Sector Pill */}
              <button
                type="button"
                onClick={() => setSelectedCategory(activeRootSector.id)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  selectedCategory === activeRootSector.id || selectedCategory === activeRootSector.slug
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-white'
                }`}
              >
                All {activeRootSector.name} ({activeSectorSubcategories.length + 1})
              </button>

              {/* Child Subcategories */}
              {activeSectorSubcategories.map((sub) => {
                const isSelected = selectedCategory === sub.id || selectedCategory === sub.slug;
                return (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => setSelectedCategory(sub.id)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1 ${
                      isSelected
                        ? 'bg-emerald-600 text-white'
                        : 'bg-white/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-white'
                    }`}
                  >
                    <span>{sub.name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* FEED CONTENT: Service Catalog, Product Catalog, Business Profiles, or Advertisement Cards */}
        {feedTab === 'advertisements' ? (
          /* Advertisement Catalog & Search Showcase Tab (Epic 3 Feature 3.2 Task 3.2.4) */
          <div id="advertisement-search-section" className="space-y-8">
            {/* Search Header & Input */}
            <div className="glass-panel p-6 sm:p-8 rounded-2xl">
              <div className="max-w-2xl">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  Search advertisements
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Discover live promotional campaigns, verified deals, and product &amp; service discounts from local businesses.
                </p>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    executeAdSearch(adSearchInput, 1);
                  }}
                  className="mt-5 flex flex-col sm:flex-row gap-3"
                >
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="ad-search-input"
                      type="text"
                      value={adSearchInput}
                      onChange={(e) => setAdSearchInput(e.target.value)}
                      placeholder="Search advertisements by title, description, business, or category..."
                      className="w-full pl-10 pr-9 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                    {adSearchInput && (
                      <button
                        type="button"
                        onClick={handleClearAdSearch}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded cursor-pointer"
                        title="Clear search query"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={isAdSearchLoading || !adSearchInput.trim()}
                    className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap shadow-xs"
                  >
                    {isAdSearchLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Searching...</span>
                      </>
                    ) : (
                      <>
                        <Search className="w-4 h-4" />
                        <span>Search Ads</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>

            {/* Error Message if search failed */}
            {adSearchError && (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-sm flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <span>{adSearchError}</span>
                </div>
                <button
                  onClick={() => executeAdSearch(adSearchInput, adSearchPage)}
                  className="px-3 py-1 bg-rose-600 text-white rounded-lg text-xs font-semibold hover:bg-rose-700 cursor-pointer"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Active Search Result Feedback */}
            {hasExecutedAdSearch && !isAdSearchLoading && !adSearchError && (
              <div className="flex items-center justify-between flex-wrap gap-2 text-sm text-slate-500 dark:text-slate-400 px-1">
                <p>
                  Found <span className="font-bold text-slate-900 dark:text-white">{adSearchTotal}</span> {adSearchTotal === 1 ? 'advertisement' : 'advertisements'} for &ldquo;<span className="text-indigo-600 dark:text-indigo-400 font-medium">{adSearchInput}</span>&rdquo;
                </p>
                <button
                  onClick={handleClearAdSearch}
                  className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  Clear search &amp; view all
                </button>
              </div>
            )}

            {/* Loading Indicator */}
            {isAdSearchLoading && (
              <div className="py-16 text-center">
                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-3" />
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  Searching live advertisements across verified businesses...
                </p>
              </div>
            )}

            {/* Empty State */}
            {!isAdSearchLoading && (adSearchResults || (hasExecutedAdSearch ? [] : filteredAds)).length === 0 && (
              <div className="text-center py-16 px-4 glass-panel rounded-2xl max-w-lg mx-auto">
                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3 text-slate-400">
                  <Search className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                  No advertisements found
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-5">
                  {hasExecutedAdSearch
                    ? `We couldn't find any advertisements matching "${adSearchInput}". Try checking spelling or using broader search terms like 'fashion', 'tech', or 'special offer'.`
                    : 'There are currently no active public advertisements matching your filters.'}
                </p>
                {hasExecutedAdSearch && (
                  <button
                    onClick={handleClearAdSearch}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                  >
                    Clear Search Query
                  </button>
                )}
              </div>
            )}

            {/* Advertisements Grid */}
            {!isAdSearchLoading && (adSearchResults || (hasExecutedAdSearch ? [] : filteredAds)).length > 0 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7">
                  {(adSearchResults || filteredAds).map((ad, idx) => (
                    <AdvertisementCard 
                      key={ad.id} 
                      ad={ad} 
                      business={businesses.find(b => b.id === ad.businessId)}
                      onViewBusiness={handleOpenBusiness}
                      featured={idx === 0 && !hasExecutedAdSearch}
                    />
                  ))}
                </div>

                {/* Pagination Controls */}
                {hasExecutedAdSearch && adSearchTotalPages > 1 && (
                  <div className="flex items-center justify-center gap-3 pt-6 border-t border-slate-200/80 dark:border-slate-800/80">
                    <button
                      onClick={() => executeAdSearch(adSearchInput, adSearchPage - 1)}
                      disabled={adSearchPage <= 1 || isAdSearchLoading}
                      className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span>Previous</span>
                    </button>
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      Page {adSearchPage} of {adSearchTotalPages}
                    </span>
                    <button
                      onClick={() => executeAdSearch(adSearchInput, adSearchPage + 1)}
                      disabled={adSearchPage >= adSearchTotalPages || isAdSearchLoading}
                      className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <span>Next</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : feedTab === 'services' ? (
          /* Service Catalog & Search Showcase Tab (Epic 3 Feature 3.2 Task 3.2.3) */
          <div id="service-search-section" className="space-y-8">
            {/* Search Header & Input */}
            <div className="glass-panel p-6 sm:p-8 rounded-2xl">
              <div className="max-w-2xl">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  Search services
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Discover professional services, technical consulting, repairs, and bespoke packages from verified businesses.
                </p>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    executeServiceSearch(serviceSearchInput, 1);
                  }}
                  className="mt-5 flex flex-col sm:flex-row gap-3"
                >
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="service-search-input"
                      type="text"
                      value={serviceSearchInput}
                      onChange={(e) => setServiceSearchInput(e.target.value)}
                      placeholder="Search services by name, description, category, or business..."
                      className="w-full pl-10 pr-9 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                    {serviceSearchInput && (
                      <button
                        type="button"
                        onClick={handleClearServiceSearch}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded cursor-pointer"
                        title="Clear search query"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={isServiceSearchLoading || !serviceSearchInput.trim()}
                    className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap shadow-xs"
                  >
                    {isServiceSearchLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Searching...</span>
                      </>
                    ) : (
                      <>
                        <Search className="w-4 h-4" />
                        <span>Search Services</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>

            {/* Error Message if search failed */}
            {serviceSearchError && (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-sm flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <span>{serviceSearchError}</span>
                </div>
                <button
                  onClick={() => executeServiceSearch(serviceSearchInput, serviceSearchPage)}
                  className="px-3 py-1 bg-rose-600 text-white rounded-lg text-xs font-semibold hover:bg-rose-700 cursor-pointer"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Active Search Result Feedback */}
            {hasExecutedServiceSearch && !isServiceSearchLoading && !serviceSearchError && (
              <div className="flex items-center justify-between flex-wrap gap-2 text-sm text-slate-500 dark:text-slate-400 px-1">
                <p>
                  Found <span className="font-bold text-slate-900 dark:text-white">{serviceSearchTotal}</span> {serviceSearchTotal === 1 ? 'service' : 'services'} for &ldquo;<span className="text-indigo-600 dark:text-indigo-400 font-medium">{serviceSearchInput}</span>&rdquo;
                </p>
                <button
                  onClick={handleClearServiceSearch}
                  className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  Clear search &amp; view all services
                </button>
              </div>
            )}

            {/* Loading Indicator */}
            {isServiceSearchLoading && (
              <div className="py-16 text-center">
                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-3" />
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  Searching services across verified businesses...
                </p>
              </div>
            )}

            {/* Empty State */}
            {!isServiceSearchLoading && displayedServices.length === 0 && (
              <div className="text-center py-16 px-4 glass-panel rounded-2xl max-w-lg mx-auto">
                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3 text-slate-400">
                  <Briefcase className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                  {hasExecutedServiceSearch ? 'No services found' : 'No services in this category'}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-5">
                  {hasExecutedServiceSearch
                    ? `We couldn't find any services matching "${serviceSearchInput}". Try checking spelling or using broader search terms like 'mechanic', 'consulting', or 'marketing'.`
                    : 'There are currently no active public services matching the selected category.'}
                </p>
                {hasExecutedServiceSearch && (
                  <button
                    onClick={handleClearServiceSearch}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                  >
                    Clear Search Query
                  </button>
                )}
              </div>
            )}

            {/* Service Grid */}
            {!isServiceSearchLoading && displayedServices.length > 0 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7">
                  {displayedServices.map((service) => {
                    const primaryImage = service.imageUrls?.[0] || 'https://images.unsplash.com/photo-1551650975-87deedd944c3?w=600&auto=format&fit=crop&q=80';
                    const categoryDisplay = service.subcategoryName || service.categoryName || service.category || 'Services';
                    const businessName = service.business?.name || 'Verified Merchant';
                    const businessLocation = service.business?.location ? `${service.business.location.city}, ${service.business.location.state}` : null;
                    const deliveryModeLabel = service.deliveryMode === 'remote' ? 'Remote Delivery' : service.deliveryMode === 'on-premise' ? 'On-Premise' : 'At Client Location';

                    return (
                      <div
                        key={service.id}
                        id={`service-card-${service.id}`}
                        className="glass-panel overflow-hidden rounded-2xl flex flex-col group hover:shadow-lg transition-all duration-300 border border-slate-200/80 dark:border-slate-800/80"
                      >
                        {/* Service Thumbnail */}
                        <div className="relative aspect-16/10 w-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <img
                            src={primaryImage}
                            alt={service.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            loading="lazy"
                          />
                          <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-white/95 dark:bg-slate-900/95 text-slate-800 dark:text-slate-200 shadow-xs backdrop-blur-sm">
                              {categoryDisplay}
                            </span>
                            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-600/90 text-white shadow-xs backdrop-blur-sm">
                              {deliveryModeLabel}
                            </span>
                          </div>
                        </div>

                        {/* Service Details */}
                        <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between">
                          <div className="space-y-2">
                            {/* Price / Rate & Duration */}
                            <div className="flex items-baseline justify-between gap-2">
                              <span className="text-lg font-black text-indigo-600 dark:text-indigo-400">
                                {service.startingPrice > 0 ? (
                                  <>
                                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400 mr-1">from</span>
                                    {service.currency === 'NGN' ? '₦' : service.currency + ' '}
                                    {service.startingPrice.toLocaleString()}
                                  </>
                                ) : (
                                  'Price on Inquiry'
                                )}
                              </span>
                              {service.durationUnit && (
                                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  <span>{service.durationUnit}</span>
                                </span>
                              )}
                            </div>

                            {/* Title */}
                            <h3 className="text-base font-bold text-slate-900 dark:text-white line-clamp-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                              {service.name}
                            </h3>

                            {/* Description */}
                            {service.description && (
                              <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                                {service.description}
                              </p>
                            )}
                          </div>

                          {/* Owning Business Footer */}
                          <div
                            onClick={() => service.business && viewBusinessDetail(service.business.id)}
                            className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between cursor-pointer group/biz"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/50 dark:border-indigo-800/50 flex items-center justify-center shrink-0 overflow-hidden">
                                {service.business?.logoUrl ? (
                                  <img src={service.business.logoUrl} alt={businessName} className="w-full h-full object-cover" />
                                ) : (
                                  <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">
                                    {businessName.charAt(0)}
                                  </span>
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1">
                                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate group-hover/biz:text-indigo-600 dark:group-hover/biz:text-indigo-400 transition-colors">
                                    {businessName}
                                  </span>
                                  {service.business?.isVerified && (
                                    <span title="Verified Business">
                                      <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                                    </span>
                                  )}
                                </div>
                                {businessLocation && (
                                  <p className="text-[11px] text-slate-400 truncate flex items-center gap-0.5">
                                    <MapPin className="w-2.5 h-2.5 shrink-0" />
                                    <span>{businessLocation}</span>
                                  </p>
                                )}
                              </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pagination Controls */}
                {hasExecutedServiceSearch && serviceSearchTotalPages > 1 && (
                  <div className="pt-6 flex items-center justify-center gap-3">
                    <button
                      onClick={() => executeServiceSearch(serviceSearchInput, serviceSearchPage - 1)}
                      disabled={serviceSearchPage <= 1 || isServiceSearchLoading}
                      className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span>Previous</span>
                    </button>
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      Page {serviceSearchPage} of {serviceSearchTotalPages}
                    </span>
                    <button
                      onClick={() => executeServiceSearch(serviceSearchInput, serviceSearchPage + 1)}
                      disabled={serviceSearchPage >= serviceSearchTotalPages || isServiceSearchLoading}
                      className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <span>Next</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : feedTab === 'products' ? (
          /* Product Catalog & Search Showcase Tab (Epic 3 Feature 3.2 Task 3.2.2) */
          <div id="product-search-section" className="space-y-8">
            {/* Search Header & Input */}
            <div className="glass-panel p-6 sm:p-8 rounded-2xl">
              <div className="max-w-2xl">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  Search products
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Discover publicly listed products, equipment, and goods from verified businesses across Boost Market.
                </p>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    executeProductSearch(productSearchInput, 1);
                  }}
                  className="mt-5 flex flex-col sm:flex-row gap-3"
                >
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="product-search-input"
                      type="text"
                      value={productSearchInput}
                      onChange={(e) => setProductSearchInput(e.target.value)}
                      placeholder="Search products by name, description, category, or business..."
                      className="w-full pl-10 pr-9 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                    {productSearchInput && (
                      <button
                        type="button"
                        onClick={handleClearProductSearch}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded cursor-pointer"
                        title="Clear search query"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={isProductSearchLoading || !productSearchInput.trim()}
                    className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap shadow-xs"
                  >
                    {isProductSearchLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Searching...</span>
                      </>
                    ) : (
                      <>
                        <Search className="w-4 h-4" />
                        <span>Search</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>

            {/* State 1: Loading State */}
            {isProductSearchLoading && (
              <div className="py-16 text-center glass-panel rounded-2xl p-8 max-w-md mx-auto">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600 dark:text-cyan-400 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Searching products...</h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Checking product names, descriptions, categories, and business listings.
                </p>
              </div>
            )}

            {/* State 2: Error State */}
            {!isProductSearchLoading && productSearchError && (
              <div className="py-12 text-center glass-panel rounded-2xl p-8 max-w-md mx-auto border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20">
                <AlertCircle className="w-8 h-8 text-rose-600 dark:text-rose-400 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Search Error</h3>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                  {productSearchError}
                </p>
                <div className="mt-4 flex items-center justify-center gap-2">
                  <button
                    onClick={() => executeProductSearch(productSearchInput, productSearchPage)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors cursor-pointer"
                  >
                    Retry Search
                  </button>
                  <button
                    onClick={handleClearProductSearch}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                  >
                    Clear Search
                  </button>
                </div>
              </div>
            )}

            {/* State 3: No Results Found State */}
            {!isProductSearchLoading && !productSearchError && hasExecutedProductSearch && (productSearchResults?.length === 0) && (
              <div className="py-16 text-center glass-panel rounded-2xl p-8 max-w-md mx-auto">
                <Package className="w-10 h-10 text-slate-400 dark:text-slate-500 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">No products found</h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  We couldn&apos;t find any products matching &quot;{productSearchInput}&quot;. Try searching by category, alternative keywords, or brand name.
                </p>
                <button
                  onClick={handleClearProductSearch}
                  className="mt-4 px-4 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  Clear search
                </button>
              </div>
            )}

            {/* State 4: Results Found or Initial Products */}
            {!isProductSearchLoading && !productSearchError && (
              (!hasExecutedProductSearch && displayedProducts.length > 0) || 
              (hasExecutedProductSearch && productSearchResults && productSearchResults.length > 0)
            ) && (
              <div className="space-y-4">
                {/* Result header count */}
                <div className="flex items-center justify-between px-1">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {hasExecutedProductSearch 
                      ? `Found ${productSearchTotal} matching product${productSearchTotal === 1 ? '' : 's'}`
                      : `Product Catalog (${displayedProducts.length} items)`}
                  </p>
                  {hasExecutedProductSearch && (
                    <button
                      onClick={handleClearProductSearch}
                      className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                    >
                      Clear search
                    </button>
                  )}
                </div>

                {/* Product Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {displayedProducts.map((prod) => {
                    const businessObj = businesses.find(b => b.id === prod.businessId);
                    const businessName = prod.business?.name || businessObj?.name || 'Verified Business';
                    const isVerified = prod.business?.isVerified ?? businessObj?.isVerified;
                    const businessLocation = prod.business?.location ? 
                      `${prod.business.location.city}, ${prod.business.location.state}` : 
                      (businessObj?.location ? `${businessObj.location.city}, ${businessObj.location.state}` : null);
                    const imageUrl = (prod.imageUrls && prod.imageUrls.length > 0 && prod.imageUrls[0]) || 
                      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80';

                    return (
                      <div
                        key={prod.id}
                        className="glass-card rounded-2xl overflow-hidden hover:border-indigo-400 dark:hover:border-indigo-500 transition-all flex flex-col justify-between group shadow-sm"
                      >
                        <div>
                          {/* Image & Badges */}
                          <div className="h-44 w-full relative bg-slate-100 dark:bg-slate-900 overflow-hidden">
                            <img
                              src={imageUrl}
                              alt={prod.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                            <div className="absolute top-2.5 right-2.5">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                prod.inStock 
                                  ? 'bg-emerald-600/90 text-white' 
                                  : 'bg-slate-700/90 text-slate-200'
                              }`}>
                                {prod.inStock ? 'In Stock' : 'Out of Stock'}
                              </span>
                            </div>
                            <div className="absolute bottom-2.5 left-2.5">
                              <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-900/80 text-white backdrop-blur-xs">
                                {prod.category || 'General'}
                              </span>
                            </div>
                          </div>

                          {/* Content */}
                          <div className="p-4 sm:p-5">
                            <div className="flex items-baseline justify-between gap-2 mb-1.5">
                              <span className="text-base font-black text-indigo-600 dark:text-cyan-400">
                                ₦{prod.price?.toLocaleString()} <span className="text-xs font-semibold text-slate-400">{prod.currency || 'NGN'}</span>
                              </span>
                              {prod.subcategoryName && (
                                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 truncate max-w-[100px]">
                                  {prod.subcategoryName}
                                </span>
                              )}
                            </div>

                            <h3 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1 group-hover:text-indigo-600 dark:group-hover:text-cyan-400 transition-colors">
                              {prod.name}
                            </h3>

                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                              {prod.description || 'Quality product listed on Boost Market.'}
                            </p>
                          </div>
                        </div>

                        {/* Owning Business Footer */}
                        <div 
                          onClick={() => handleOpenBusiness(prod.businessId)}
                          className="px-4 py-3 bg-slate-50/80 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-bold text-indigo-600 dark:text-cyan-400 shrink-0">
                              {businessName.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate flex items-center gap-1">
                                <span className="truncate">{businessName}</span>
                                {isVerified && <CheckCircle2 className="w-3 h-3 text-indigo-600 dark:text-cyan-400 shrink-0" />}
                              </p>
                              {businessLocation && (
                                <p className="text-[10px] text-slate-400 truncate flex items-center gap-0.5">
                                  <MapPin className="w-2.5 h-2.5 shrink-0" />
                                  <span>{businessLocation}</span>
                                </p>
                              )}
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pagination Controls */}
                {hasExecutedProductSearch && productSearchTotalPages > 1 && (
                  <div className="pt-6 flex items-center justify-center gap-3">
                    <button
                      onClick={() => executeProductSearch(productSearchInput, productSearchPage - 1)}
                      disabled={productSearchPage <= 1 || isProductSearchLoading}
                      className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span>Previous</span>
                    </button>
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      Page {productSearchPage} of {productSearchTotalPages}
                    </span>
                    <button
                      onClick={() => executeProductSearch(productSearchInput, productSearchPage + 1)}
                      disabled={productSearchPage >= productSearchTotalPages || isProductSearchLoading}
                      className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <span>Next</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : feedTab !== 'businesses' ? (
          <div>
            {filteredAds.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7">
                {filteredAds.map((ad, idx) => (
                  <AdvertisementCard 
                    key={ad.id} 
                    ad={ad} 
                    business={businesses.find(b => b.id === ad.businessId)}
                    onViewBusiness={handleOpenBusiness}
                    featured={idx === 0 && feedTab === 'all'}
                  />
                ))}
              </div>
            ) : (
              <div className="glass-card rounded-3xl p-12 text-center max-w-md mx-auto my-8">
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-cyan-400 flex items-center justify-center mx-auto mb-4">
                  <Search className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">No advertisements found</h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-2">
                  No campaigns matched your current search or category filters. Try clearing your filters or be the first to advertise here!
                </p>
                <button
                  onClick={() => {
                    setSelectedCategory('all');
                    setSearchQuery('');
                    setFeedTab('all');
                  }}
                  className="mt-5 px-5 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  Clear All Filters
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Business Directory & Search Showcase Tab (Epic 3 Feature 3.2 Task 3.2.1) */
          <div className="space-y-8">
            {/* Search Header & Input */}
            <div className="glass-panel p-6 sm:p-8 rounded-2xl">
              <div className="max-w-2xl">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  Search businesses
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Discover registered, verified local and regional businesses by name, description, category, subcategory, or location.
                </p>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    executeBusinessSearch(businessSearchInput, 1);
                  }}
                  className="mt-5 flex flex-col sm:flex-row gap-3"
                >
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="business-search-input"
                      type="text"
                      value={businessSearchInput}
                      onChange={(e) => setBusinessSearchInput(e.target.value)}
                      placeholder="Search businesses by name, description, category, or subcategory..."
                      className="w-full pl-10 pr-9 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                    {businessSearchInput && (
                      <button
                        type="button"
                        onClick={handleClearBusinessSearch}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded cursor-pointer"
                        title="Clear search query"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={isBusinessSearchLoading || !businessSearchInput.trim()}
                    className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap shadow-xs"
                  >
                    {isBusinessSearchLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Searching...</span>
                      </>
                    ) : (
                      <>
                        <Search className="w-4 h-4" />
                        <span>Search</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>

            {/* State 1: Loading State */}
            {isBusinessSearchLoading && (
              <div className="py-16 text-center glass-panel rounded-2xl p-8 max-w-md mx-auto">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600 dark:text-cyan-400 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Searching businesses...</h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Checking business names, descriptions, categories, and locations.
                </p>
              </div>
            )}

            {/* State 2: Error State */}
            {!isBusinessSearchLoading && businessSearchError && (
              <div className="py-12 text-center glass-panel rounded-2xl p-8 max-w-md mx-auto border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20">
                <AlertCircle className="w-8 h-8 text-rose-600 dark:text-rose-400 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Search Error</h3>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                  {businessSearchError}
                </p>
                <div className="mt-4 flex items-center justify-center gap-2">
                  <button
                    onClick={() => executeBusinessSearch(businessSearchInput, businessSearchPage)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors cursor-pointer"
                  >
                    Retry Search
                  </button>
                  <button
                    onClick={handleClearBusinessSearch}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                  >
                    Clear Search
                  </button>
                </div>
              </div>
            )}

            {/* State 3: No Results Found */}
            {!isBusinessSearchLoading && !businessSearchError && hasExecutedBusinessSearch && businessSearchResults && businessSearchResults.length === 0 && (
              <div className="py-16 text-center glass-panel rounded-2xl p-8 max-w-md mx-auto">
                <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-center justify-center mx-auto text-amber-600 dark:text-amber-400 mb-4">
                  <Store className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">No businesses found</h3>
                <p className="mt-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                  We couldn&apos;t find any businesses matching &quot;{businessSearchInput}&quot;. Try searching by industry, keyword, or location.
                </p>
                <button
                  onClick={handleClearBusinessSearch}
                  className="mt-5 px-5 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  View All Businesses
                </button>
              </div>
            )}

            {/* State 4: Results Found or Initial State */}
            {!isBusinessSearchLoading && !businessSearchError && (!hasExecutedBusinessSearch || (businessSearchResults && businessSearchResults.length > 0)) && (
              <div className="space-y-6">
                {/* Result header count */}
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400">
                    {hasExecutedBusinessSearch ? (
                      <>
                        Found <span className="text-indigo-600 dark:text-cyan-400 font-bold">{businessSearchTotal}</span> {businessSearchTotal === 1 ? 'business' : 'businesses'} matching &quot;{businessSearchInput}&quot;
                      </>
                    ) : (
                      <>
                        Showing <span className="text-indigo-600 dark:text-cyan-400 font-bold">{filteredBusinesses.length}</span> registered {filteredBusinesses.length === 1 ? 'business' : 'businesses'}
                      </>
                    )}
                  </span>
                  {hasExecutedBusinessSearch && (
                    <button
                      onClick={handleClearBusinessSearch}
                      className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                    >
                      Clear search
                    </button>
                  )}
                </div>

                {/* Business Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7">
                  {(hasExecutedBusinessSearch ? (businessSearchResults || []) : filteredBusinesses).map((biz) => {
                    const categoryObj = categories.find(c => c.id === biz.categoryId || c.slug === biz.category);
                    const categoryDisplayName = categoryObj?.name || biz.categoryLabel || biz.category || 'General';
                    const subcategoryDisplayName = biz.subcategoryName || biz.subcategory || (biz.subcategories && biz.subcategories[0]);

                    return (
                      <div 
                        key={biz.id}
                        onClick={() => handleOpenBusiness(biz.id)}
                        className="glass-card rounded-2xl overflow-hidden cursor-pointer group hover:border-indigo-400 dark:hover:border-indigo-500 transition-all flex flex-col justify-between"
                      >
                        <div>
                          <div className="h-32 w-full relative bg-slate-900">
                            <img 
                              src={biz.coverImageUrl || 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=600&auto=format&fit=crop&q=80'} 
                              alt={biz.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                            
                            <div className="absolute -bottom-5 left-4 w-14 h-14 rounded-xl overflow-hidden border-2 border-white dark:border-slate-800 bg-white shadow-md flex items-center justify-center">
                              {biz.logoUrl ? (
                                <img src={biz.logoUrl} alt={biz.name} className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-base font-black text-indigo-600 dark:text-cyan-400">
                                  {biz.name.charAt(0).toUpperCase()}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="pt-7 p-5">
                            <div className="flex items-center justify-between gap-2">
                              <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-cyan-400 transition-colors flex items-center gap-1.5 truncate">
                                <span className="truncate">{biz.name}</span>
                                {biz.isVerified && <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-cyan-400 shrink-0" />}
                              </h3>
                              <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 capitalize shrink-0 truncate max-w-[120px]">
                                {categoryDisplayName}
                              </span>
                            </div>

                            {subcategoryDisplayName && (
                              <div className="mt-1">
                                <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-cyan-400">
                                  {subcategoryDisplayName}
                                </span>
                              </div>
                            )}

                            <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300 line-clamp-2">
                              {biz.description || 'No description provided.'}
                            </p>

                            {biz.location && (biz.location.city || biz.location.state) && (
                              <div className="mt-3.5 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                                <MapPin className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                                <span className="truncate">
                                  {[biz.location.city, biz.location.state].filter(Boolean).join(', ')}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="px-5 pb-5 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                          <div className="text-xs text-slate-500">
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              {advertisements.filter(a => a.businessId === biz.id).length}
                            </span> Active Ads
                          </div>
                          <button className="text-xs font-bold text-indigo-600 dark:text-cyan-400 hover:underline flex items-center gap-1">
                            <span>View Business</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pagination Controls */}
                {hasExecutedBusinessSearch && businessSearchTotalPages > 1 && (
                  <div className="pt-6 flex items-center justify-center gap-3">
                    <button
                      onClick={() => executeBusinessSearch(businessSearchInput, businessSearchPage - 1)}
                      disabled={businessSearchPage <= 1 || isBusinessSearchLoading}
                      className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span>Previous</span>
                    </button>
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      Page {businessSearchPage} of {businessSearchTotalPages}
                    </span>
                    <button
                      onClick={() => executeBusinessSearch(businessSearchInput, businessSearchPage + 1)}
                      disabled={businessSearchPage >= businessSearchTotalPages || isBusinessSearchLoading}
                      className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <span>Next</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      </section>

      {/* 4. VALUE COMPARISON / BENEFITS SECTION */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 border-y border-slate-200/80 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-900/40">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-center">
          
          {/* For Businesses */}
          <div className="glass-panel p-8 sm:p-10 rounded-3xl relative overflow-hidden">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-600 dark:text-cyan-400 mb-4">
              <BarChart3 className="w-3.5 h-3.5" />
              <span>For Business Advertisers</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-4">
              Why Businesses Grow on Boost Market
            </h3>
            <ul className="space-y-4 text-sm sm:text-base text-slate-600 dark:text-slate-300">
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-indigo-600 dark:text-cyan-400 shrink-0 mt-0.5" />
                <span><strong>Targeted Hyper-Local Distribution:</strong> Put promotions directly in front of active customers in your city, district, or nationwide.</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-indigo-600 dark:text-cyan-400 shrink-0 mt-0.5" />
                <span><strong>Zero Middleman Commissions:</strong> Customers message you directly on WhatsApp or call you. You keep 100% of your earnings.</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-indigo-600 dark:text-cyan-400 shrink-0 mt-0.5" />
                <span><strong>Multi-Platform Ad Boost:</strong> Syndicate your campaign across Facebook, Instagram, Google, and local networks in 1 click.</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-indigo-600 dark:text-cyan-400 shrink-0 mt-0.5" />
                <span><strong>Transparent Real-Time Analytics:</strong> Monitor views, reach, clicks, inquiries, and conversion metrics on your dashboard.</span>
              </li>
            </ul>

            <div className="mt-8">
              <button
                onClick={() => setIsCreateAdModalOpen(true)}
                className="btn-advertise px-6 py-3 rounded-xl text-sm font-bold flex items-center gap-2 cursor-pointer"
              >
                <span>Launch Your Advertisement</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Campaign Boost Placements Overview */}
          <div className="glass-card p-8 sm:p-10 rounded-3xl border-indigo-400/40 dark:border-indigo-500/40 shadow-xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 mb-4">
              <Zap className="w-3.5 h-3.5" />
              <span>Promotion Engine</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-2">
              Multi-Channel Placement
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-6">
              When you boost your advertisement on Boost Market, your offerings are systematically distributed across high-intent discovery points.
            </p>

            <div className="space-y-3.5">
              <div className="p-3.5 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 text-xs font-bold">
                  01
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">Discovery Spotlight</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Premium prominence at the top of city-wide feeds and category explorer grids.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-cyan-600 text-white flex items-center justify-center shrink-0 text-xs font-bold">
                  02
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">Local Search Priority</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    High priority score ranking when customers search by keyword, category, or city.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 text-xs font-bold">
                  03
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">Direct WhatsApp Inquiries</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Instant lead connection straight to your verified WhatsApp and telephone line.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Real-Time Performance Tracking</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                Live In Merchant Dashboard
              </span>
            </div>
          </div>

        </div>
      </section>

      {/* 5. BOTTOM CALL TO ACTION BANNER */}
      <section className="pt-16 sm:pt-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="glass-card rounded-3xl p-8 sm:p-14 text-center relative overflow-hidden border-indigo-500/30 shadow-2xl">
          
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-64 h-64 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-2xl mx-auto space-y-4">
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
              Ready to Accelerate Your Business Growth?
            </h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300">
              Launch your first advertisement in minutes. Reach targeted buyers in {currentLocation.city} and turn discovery into measurable revenue.
            </p>

            <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => setIsCreateAdModalOpen(true)}
                className="btn-advertise px-8 py-3.5 rounded-2xl text-base font-bold shadow-lg flex items-center gap-2 cursor-pointer"
              >
                <PlusCircle className="w-5 h-5" />
                <span>Start Advertising Today</span>
              </button>
            </div>
          </div>

        </div>
      </section>

    </div>
  );
};
