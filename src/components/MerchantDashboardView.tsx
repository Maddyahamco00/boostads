'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { 
  DollarSign, 
  Plus, 
  ShoppingBag, 
  Wrench, 
  Image as ImageIcon, 
  Building2, 
  ShieldCheck, 
  ExternalLink,
  Users,
  Megaphone,
  Flame,
  Eye,
  MousePointer,
  TrendingUp,
  MessageSquare,
  Sparkles,
  BarChart3,
  CreditCard,
  CheckCircle2,
  Phone,
  Mail,
  Globe,
  ArrowUpRight,
  Camera,
  Trash2,
  Loader2,
  AlertCircle,
  Check,
  Tag,
  X,
  Search,
  MapPin,
  Navigation,
  Clock,
  Calendar,
  Copy
} from 'lucide-react';
import { AdvertisementCard } from './AdvertisementCard';
import { businessApi } from '../lib/api';
import { NIGERIAN_STATES, LocationCoordinates, DAYS_OF_WEEK, OpeningHour, TimePeriod, formatOpeningHourDisplay, formatTime12h } from '../types';

export const MerchantDashboardView: React.FC = () => {
  const { 
    currentUser, 
    businesses, 
    advertisements, 
    categories,
    campaigns,
    leads,
    setIsCreateAdModalOpen,
    setActiveView,
    viewBusinessDetail,
    refreshData
  } = useApp();

  const userBiz = businesses.find(b => b.ownerId === currentUser.id) || businesses[0];
  const isOwner = Boolean(userBiz && (userBiz.ownerId === currentUser.id || currentUser.role === 'SUPER_ADMIN'));

  const userAds = advertisements.filter(a => a.businessId === userBiz?.id);
  const userCampaigns = campaigns.filter(c => c.businessId === userBiz?.id || currentUser.role === 'SUPER_ADMIN');
  const userLeads = leads.filter(l => l.businessId === userBiz?.id || currentUser.role === 'SUPER_ADMIN');

  const [activeTab, setActiveTab] = useState<'overview' | 'ads' | 'leads' | 'products' | 'services' | 'bank_payouts'>('overview');

  // Business Logo Management States (Epic 2 Feature 2.2 Task 2.2.2)
  const logoFileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isRemovingLogo, setIsRemovingLogo] = useState(false);
  const [logoMessage, setLogoMessage] = useState<{ text: string; isError: boolean } | null>(null);

  // Business Cover Image Management States (Epic 2 Feature 2.2 Task 2.2.3)
  const coverFileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isRemovingCover, setIsRemovingCover] = useState(false);
  const [coverMessage, setCoverMessage] = useState<{ text: string; isError: boolean } | null>(null);

  // Business Description Management States (Epic 2 Feature 2.2 Task 2.2.4)
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [descriptionInput, setDescriptionInput] = useState(userBiz?.description || '');
  const [isSavingDescription, setIsSavingDescription] = useState(false);
  const [descriptionMessage, setDescriptionMessage] = useState<{ text: string; isError: boolean } | null>(null);

  useEffect(() => {
    if (!isEditingDescription) {
      setDescriptionInput(userBiz?.description || '');
    }
  }, [userBiz?.description, isEditingDescription]);

  // Business Categories Management States (Epic 2 Feature 2.2 Task 2.2.5)
  const [isEditingCategories, setIsEditingCategories] = useState(false);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [categorySearchQuery, setCategorySearchQuery] = useState('');
  const [isSavingCategories, setIsSavingCategories] = useState(false);
  const [categoriesMessage, setCategoriesMessage] = useState<{ text: string; isError: boolean } | null>(null);

  useEffect(() => {
    if (!isEditingCategories && userBiz) {
      if (Array.isArray(userBiz.categories) && userBiz.categories.length > 0) {
        setSelectedCategoryIds(userBiz.categories);
      } else if (userBiz.category) {
        setSelectedCategoryIds([userBiz.category]);
      } else {
        setSelectedCategoryIds([]);
      }
    }
  }, [userBiz?.categories, userBiz?.category, isEditingCategories]);

  // Business Location Management States (Epic 2 Feature 2.2 Task 2.2.6)
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [locationAddress, setLocationAddress] = useState('');
  const [locationCity, setLocationCity] = useState('');
  const [locationState, setLocationState] = useState('');
  const [locationCountry, setLocationCountry] = useState('Nigeria');
  const [locationLga, setLocationLga] = useState('');
  const [locationPostalCode, setLocationPostalCode] = useState('');
  const [locationLat, setLocationLat] = useState<string>('');
  const [locationLng, setLocationLng] = useState<string>('');
  const [isServiceAreaOnly, setIsServiceAreaOnly] = useState(false);
  const [serviceAreaKm, setServiceAreaKm] = useState<string>('');
  const [isSavingLocation, setIsSavingLocation] = useState(false);
  const [locationMessage, setLocationMessage] = useState<{ text: string; isError: boolean } | null>(null);

  useEffect(() => {
    if (!isEditingLocation && userBiz?.location) {
      setLocationAddress(userBiz.location.address || '');
      setLocationCity(userBiz.location.city || '');
      setLocationState(userBiz.location.state || '');
      setLocationCountry(userBiz.location.country || 'Nigeria');
      setLocationLga(userBiz.location.lga || '');
      setLocationPostalCode(userBiz.location.postalCode || '');
      setLocationLat(typeof userBiz.location.lat === 'number' ? String(userBiz.location.lat) : '');
      setLocationLng(typeof userBiz.location.lng === 'number' ? String(userBiz.location.lng) : '');
      setIsServiceAreaOnly(!!userBiz.location.isServiceAreaOnly);
      setServiceAreaKm(typeof userBiz.location.serviceAreaKm === 'number' ? String(userBiz.location.serviceAreaKm) : '');
    } else if (!isEditingLocation && !userBiz?.location) {
      setLocationAddress('');
      setLocationCity('');
      setLocationState('');
      setLocationCountry('Nigeria');
      setLocationLga('');
      setLocationPostalCode('');
      setLocationLat('');
      setLocationLng('');
      setIsServiceAreaOnly(false);
      setServiceAreaKm('');
    }
  }, [userBiz?.location, isEditingLocation]);

  // Business Opening Hours Management States (Epic 2 Feature 2.2 Task 2.2.7)
  const defaultWeeklySchedule = (): OpeningHour[] => [
    { day: 'Monday', isOpen: true, periods: [{ open: '09:00', close: '17:00' }] },
    { day: 'Tuesday', isOpen: true, periods: [{ open: '09:00', close: '17:00' }] },
    { day: 'Wednesday', isOpen: true, periods: [{ open: '09:00', close: '17:00' }] },
    { day: 'Thursday', isOpen: true, periods: [{ open: '09:00', close: '17:00' }] },
    { day: 'Friday', isOpen: true, periods: [{ open: '09:00', close: '17:00' }] },
    { day: 'Saturday', isOpen: true, periods: [{ open: '10:00', close: '16:00' }] },
    { day: 'Sunday', isOpen: false, periods: [] }
  ];

  const [isEditingHours, setIsEditingHours] = useState(false);
  const [hoursSchedule, setHoursSchedule] = useState<OpeningHour[]>(defaultWeeklySchedule());
  const [isSavingHours, setIsSavingHours] = useState(false);
  const [hoursMessage, setHoursMessage] = useState<{ text: string; isError: boolean } | null>(null);

  useEffect(() => {
    if (!isEditingHours) {
      if (Array.isArray(userBiz?.openingHours) && userBiz.openingHours.length > 0) {
        const currentMap = new Map(userBiz.openingHours.map(item => [item.day, item]));
        const populated: OpeningHour[] = DAYS_OF_WEEK.map(day => {
          const existing = currentMap.get(day);
          if (existing) {
            return {
              day,
              isOpen: existing.isOpen,
              hours: existing.hours || '',
              periods: existing.periods && existing.periods.length > 0
                ? existing.periods.map(p => ({ ...p }))
                : (existing.isOpen ? [{ open: '09:00', close: '17:00' }] : [])
            };
          }
          return { day, isOpen: false, periods: [] };
        });
        setHoursSchedule(populated);
      } else {
        setHoursSchedule(defaultWeeklySchedule());
      }
    }
  }, [userBiz?.openingHours, isEditingHours]);

  const toggleDayOpen = (dayIndex: number) => {
    setHoursSchedule(prev => {
      const next = [...prev];
      const target = { ...next[dayIndex] };
      target.isOpen = !target.isOpen;
      if (target.isOpen && (!target.periods || target.periods.length === 0)) {
        target.periods = [{ open: '09:00', close: '17:00' }];
      } else if (!target.isOpen) {
        target.periods = [];
      }
      next[dayIndex] = target;
      return next;
    });
  };

  const updatePeriod = (
    dayIndex: number,
    periodIndex: number,
    field: 'open' | 'close' | 'crossMidnight',
    value: any
  ) => {
    setHoursSchedule(prev => {
      const next = [...prev];
      const target = { ...next[dayIndex] };
      const nextPeriods = (target.periods || []).map((p, idx) => {
        if (idx === periodIndex) {
          return { ...p, [field]: value };
        }
        return p;
      });
      target.periods = nextPeriods;
      next[dayIndex] = target;
      return next;
    });
  };

  const addPeriod = (dayIndex: number) => {
    setHoursSchedule(prev => {
      const next = [...prev];
      const target = { ...next[dayIndex] };
      const periods = target.periods ? [...target.periods] : [];
      if (periods.length < 2) {
        periods.push({ open: '18:00', close: '21:00' });
      }
      target.periods = periods;
      next[dayIndex] = target;
      return next;
    });
  };

  const removePeriod = (dayIndex: number, periodIndex: number) => {
    setHoursSchedule(prev => {
      const next = [...prev];
      const target = { ...next[dayIndex] };
      const nextPeriods = (target.periods || []).filter((_, idx) => idx !== periodIndex);
      target.periods = nextPeriods;
      if (nextPeriods.length === 0) {
        target.isOpen = false;
      }
      next[dayIndex] = target;
      return next;
    });
  };

  const copyMondayToWeekdays = () => {
    setHoursSchedule(prev => {
      const monday = prev.find(d => d.day === 'Monday');
      if (!monday) return prev;
      return prev.map(d => {
        if (['Tuesday', 'Wednesday', 'Thursday', 'Friday'].includes(d.day)) {
          return {
            ...d,
            isOpen: monday.isOpen,
            periods: (monday.periods || []).map(p => ({ ...p }))
          };
        }
        return d;
      });
    });
    setHoursMessage({ text: 'Monday schedule copied to Tuesday through Friday.', isError: false });
  };

  // Form states for adding product/service
  const [newProdName, setNewProdName] = useState('');
  const [newProdPrice, setNewProdPrice] = useState('');
  const [newProdDesc, setNewProdDesc] = useState('');
  const [newProdImg, setNewProdImg] = useState('https://images.unsplash.com/photo-1549298916-b41d501d3772?w=600&auto=format&fit=crop&q=80');

  const [newServName, setNewServName] = useState('');
  const [newServPrice, setNewServPrice] = useState('');
  const [newServDesc, setNewServDesc] = useState('');

  const [bankName, setBankName] = useState('Guaranty Trust Bank (GTBank)');
  const [accountNumber, setAccountNumber] = useState('0123456789');
  const [accountName, setAccountName] = useState(userBiz?.name || 'Boost Market Merchant');
  const [bankSaved, setBankSaved] = useState(false);

  const totalAdViews = userAds.reduce((acc, curr) => acc + (curr.viewsCount || 0), 0) || 1420;
  const totalAdClicks = userAds.reduce((acc, curr) => acc + (curr.clicksCount || 0), 0) || 168;

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName || !newProdPrice || !userBiz) return;
    try {
      await fetch('/api/products/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: userBiz.id,
          name: newProdName,
          description: newProdDesc || 'High quality product on Boost Market',
          price: Number(newProdPrice),
          category: userBiz.categoryLabel || userBiz.category,
          imageUrls: [newProdImg],
          inStock: true
        })
      });
      setNewProdName('');
      setNewProdPrice('');
      setNewProdDesc('');
      refreshData();
    } catch (err) {
      console.error('Failed to add product:', err);
    }
  };

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newServName || !newServPrice || !userBiz) return;
    try {
      await fetch('/api/services/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: userBiz.id,
          name: newServName,
          description: newServDesc || 'Professional service',
          startingPrice: Number(newServPrice),
          category: userBiz.categoryLabel || userBiz.category,
          imageUrls: ['https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop&q=80'],
          durationUnit: 'service',
          deliveryMode: 'on_premise'
        })
      });
      setNewServName('');
      setNewServPrice('');
      setNewServDesc('');
      refreshData();
    } catch (err) {
      console.error('Failed to add service:', err);
    }
  };

  const handleSaveBank = (e: React.FormEvent) => {
    e.preventDefault();
    setBankSaved(true);
    setTimeout(() => setBankSaved(false), 3000);
  };

  // Business Logo Handlers (Epic 2 Task 2.2.2)
  const handleLogoFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userBiz) return;

    setLogoMessage(null);

    // Format check
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setLogoMessage({
        text: 'Invalid file format. Only JPEG, PNG, and WebP images are permitted.',
        isError: true
      });
      if (logoFileInputRef.current) logoFileInputRef.current.value = '';
      return;
    }

    // Size check (5MB)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setLogoMessage({
        text: `File is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Maximum allowed size is 5MB.`,
        isError: true
      });
      if (logoFileInputRef.current) logoFileInputRef.current.value = '';
      return;
    }

    setIsUploadingLogo(true);
    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Failed to read image file'));
      });
      reader.readAsDataURL(file);
      const base64Data = await base64Promise;

      const res = await businessApi.uploadLogo(userBiz.id, {
        image: base64Data,
        filename: file.name
      });

      if (res.success && res.logoUrl) {
        setLogoMessage({
          text: 'Business logo updated successfully.',
          isError: false
        });
        await refreshData();
      } else {
        setLogoMessage({
          text: res.message || 'Failed to update business logo.',
          isError: true
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to upload business logo.';
      setLogoMessage({
        text: msg,
        isError: true
      });
    } finally {
      setIsUploadingLogo(false);
      if (logoFileInputRef.current) logoFileInputRef.current.value = '';
    }
  };

  const handleRemoveLogo = async () => {
    if (!userBiz) return;
    setLogoMessage(null);
    setIsRemovingLogo(true);

    try {
      const res = await businessApi.removeLogo(userBiz.id);
      if (res.success) {
        setLogoMessage({
          text: 'Business logo removed successfully.',
          isError: false
        });
        await refreshData();
      } else {
        setLogoMessage({
          text: res.message || 'Failed to remove business logo.',
          isError: true
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to remove business logo.';
      setLogoMessage({
        text: msg,
        isError: true
      });
    } finally {
      setIsRemovingLogo(false);
    }
  };

  // Business Cover Image Handlers (Epic 2 Task 2.2.3)
  const handleCoverFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userBiz) return;

    setCoverMessage(null);

    // Format check
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setCoverMessage({
        text: 'Invalid file format. Only JPEG, PNG, and WebP images are permitted.',
        isError: true
      });
      if (coverFileInputRef.current) coverFileInputRef.current.value = '';
      return;
    }

    // Size check (5MB)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setCoverMessage({
        text: `File is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Maximum allowed size is 5MB.`,
        isError: true
      });
      if (coverFileInputRef.current) coverFileInputRef.current.value = '';
      return;
    }

    setIsUploadingCover(true);
    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Failed to read image file'));
      });
      reader.readAsDataURL(file);
      const base64Data = await base64Promise;

      const res = await businessApi.uploadCover(userBiz.id, {
        image: base64Data,
        filename: file.name
      });

      if (res.success && res.coverUrl) {
        setCoverMessage({
          text: 'Business cover image updated successfully.',
          isError: false
        });
        await refreshData();
      } else {
        setCoverMessage({
          text: res.message || 'Failed to update business cover image.',
          isError: true
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to upload business cover image.';
      setCoverMessage({
        text: msg,
        isError: true
      });
    } finally {
      setIsUploadingCover(false);
      if (coverFileInputRef.current) coverFileInputRef.current.value = '';
    }
  };

  const handleRemoveCover = async () => {
    if (!userBiz) return;
    setCoverMessage(null);
    setIsRemovingCover(true);

    try {
      const res = await businessApi.removeCover(userBiz.id);
      if (res.success) {
        setCoverMessage({
          text: 'Business cover image removed successfully.',
          isError: false
        });
        await refreshData();
      } else {
        setCoverMessage({
          text: res.message || 'Failed to remove business cover image.',
          isError: true
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to remove business cover image.';
      setCoverMessage({
        text: msg,
        isError: true
      });
    } finally {
      setIsRemovingCover(false);
    }
  };

  // Business Description Handler (Epic 2 Task 2.2.4)
  const handleSaveDescription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userBiz) return;
    setDescriptionMessage(null);
    setIsSavingDescription(true);

    try {
      const res = await businessApi.updateDescription(userBiz.id, {
        description: descriptionInput
      });

      if (res.success) {
        setDescriptionMessage({
          text: res.message || 'Business description saved successfully.',
          isError: false
        });
        setIsEditingDescription(false);
        await refreshData();
      } else {
        setDescriptionMessage({
          text: res.message || 'Failed to update business description.',
          isError: true
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update business description.';
      setDescriptionMessage({
        text: msg,
        isError: true
      });
    } finally {
      setIsSavingDescription(false);
    }
  };

  // Business Categories Handlers (Epic 2 Task 2.2.5)
  const handleToggleCategory = (catId: string) => {
    setCategoriesMessage(null);
    if (selectedCategoryIds.includes(catId)) {
      setSelectedCategoryIds(prev => prev.filter(id => id !== catId));
    } else {
      if (selectedCategoryIds.length >= 5) {
        setCategoriesMessage({
          text: 'Maximum of 5 categories allowed per business.',
          isError: true
        });
        return;
      }
      setSelectedCategoryIds(prev => [...prev, catId]);
    }
  };

  const handleSaveCategories = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!userBiz) return;
    setCategoriesMessage(null);
    setIsSavingCategories(true);

    try {
      const res = await businessApi.updateCategories(userBiz.id, {
        categoryIds: selectedCategoryIds
      });

      if (res.success) {
        setCategoriesMessage({
          text: res.message || 'Business categories updated successfully.',
          isError: false
        });
        setIsEditingCategories(false);
        await refreshData();
      } else {
        setCategoriesMessage({
          text: res.message || 'Failed to update business categories.',
          isError: true
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update business categories.';
      setCategoriesMessage({
        text: msg,
        isError: true
      });
    } finally {
      setIsSavingCategories(false);
    }
  };

  // Business Location Handlers (Epic 2 Task 2.2.6)
  const handleSaveLocation = async () => {
    if (!userBiz) return;
    setLocationMessage(null);

    const trimmedCity = locationCity.trim();
    const trimmedState = locationState.trim();
    const trimmedCountry = locationCountry.trim() || 'Nigeria';

    if (!trimmedCity) {
      setLocationMessage({ text: 'City/town is required.', isError: true });
      return;
    }
    if (!trimmedState) {
      setLocationMessage({ text: 'State/region is required.', isError: true });
      return;
    }

    let latNum: number | undefined = undefined;
    let lngNum: number | undefined = undefined;

    if (locationLat.trim() !== '') {
      const parsed = parseFloat(locationLat.trim());
      if (isNaN(parsed) || !isFinite(parsed) || parsed < -90 || parsed > 90) {
        setLocationMessage({ text: 'Latitude must be a valid number between -90 and +90.', isError: true });
        return;
      }
      latNum = parsed;
    }

    if (locationLng.trim() !== '') {
      const parsed = parseFloat(locationLng.trim());
      if (isNaN(parsed) || !isFinite(parsed) || parsed < -180 || parsed > 180) {
        setLocationMessage({ text: 'Longitude must be a valid number between -180 and +180.', isError: true });
        return;
      }
      lngNum = parsed;
    }

    let radiusNum: number | undefined = undefined;
    if (serviceAreaKm.trim() !== '') {
      const parsed = parseFloat(serviceAreaKm.trim());
      if (isNaN(parsed) || parsed < 0 || parsed > 1000) {
        setLocationMessage({ text: 'Service area radius must be between 0 and 1000 km.', isError: true });
        return;
      }
      radiusNum = parsed;
    }

    setIsSavingLocation(true);
    try {
      const payload: Partial<LocationCoordinates> = {
        address: locationAddress.trim() || undefined,
        city: trimmedCity,
        state: trimmedState,
        country: trimmedCountry,
        lga: locationLga.trim() || undefined,
        postalCode: locationPostalCode.trim() || undefined,
        lat: latNum,
        lng: lngNum,
        isServiceAreaOnly,
        serviceAreaKm: radiusNum
      };

      const res = await businessApi.updateLocation(userBiz.id, payload);
      if (res.success && res.business) {
        setIsEditingLocation(false);
        setLocationMessage({ text: res.message || 'Business location updated successfully.', isError: false });
        await refreshData();
      } else {
        setLocationMessage({ text: (res as any).error || res.message || 'Failed to update business location.', isError: true });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred while updating location.';
      setLocationMessage({ text: msg, isError: true });
    } finally {
      setIsSavingLocation(false);
    }
  };

  const handleClearLocation = async () => {
    if (!userBiz) return;
    if (!window.confirm('Are you sure you want to remove the business location?')) return;
    setIsSavingLocation(true);
    setLocationMessage(null);
    try {
      const res = await businessApi.clearLocation(userBiz.id);
      if (res.success && res.business) {
        setIsEditingLocation(false);
        setLocationMessage({ text: res.message || 'Business location removed.', isError: false });
        await refreshData();
      } else {
        setLocationMessage({ text: (res as any).error || res.message || 'Failed to remove location.', isError: true });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred while removing location.';
      setLocationMessage({ text: msg, isError: true });
    } finally {
      setIsSavingLocation(false);
    }
  };

  const handleSaveHours = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userBiz) return;
    setHoursMessage(null);

    // Validate client-side
    for (const d of hoursSchedule) {
      if (d.isOpen) {
        if (!d.periods || d.periods.length === 0) {
          setHoursMessage({ text: `Please specify opening hours for ${d.day}, or set it to Closed.`, isError: true });
          return;
        }
        for (const p of d.periods) {
          if (!p.open || !p.close) {
            setHoursMessage({ text: `Opening and closing times are required for ${d.day}.`, isError: true });
            return;
          }
          if (p.open === p.close) {
            setHoursMessage({ text: `Opening and closing times cannot be identical on ${d.day}.`, isError: true });
            return;
          }
          if (!p.crossMidnight && p.open >= p.close) {
            setHoursMessage({ text: `Closing time must be after opening time for ${d.day} (or check 'Overnight').`, isError: true });
            return;
          }
        }
      }
    }

    setIsSavingHours(true);
    try {
      const res = await businessApi.updateOpeningHours(userBiz.id, hoursSchedule);
      if (res.success && res.business) {
        setIsEditingHours(false);
        setHoursMessage({ text: res.message || 'Opening hours updated successfully.', isError: false });
        await refreshData();
      } else {
        setHoursMessage({ text: (res as any).error || res.message || 'Failed to update opening hours.', isError: true });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred while updating opening hours.';
      setHoursMessage({ text: msg, isError: true });
    } finally {
      setIsSavingHours(false);
    }
  };

  const handleClearHours = async () => {
    if (!userBiz) return;
    if (!window.confirm('Are you sure you want to remove all business opening hours?')) return;
    setIsSavingHours(true);
    setHoursMessage(null);
    try {
      const res = await businessApi.clearOpeningHours(userBiz.id);
      if (res.success && res.business) {
        setIsEditingHours(false);
        setHoursMessage({ text: res.message || 'Opening hours removed.', isError: false });
        await refreshData();
      } else {
        setHoursMessage({ text: (res as any).error || res.message || 'Failed to remove opening hours.', isError: true });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred while removing opening hours.';
      setHoursMessage({ text: msg, isError: true });
    } finally {
      setIsSavingHours(false);
    }
  };

  // Business Contact Information State (Epic 2 Feature 2.2 Task 2.2.8)
  const [isEditingContact, setIsEditingContact] = useState(false);
  const [contactPhoneInput, setContactPhoneInput] = useState('');
  const [contactEmailInput, setContactEmailInput] = useState('');
  const [contactWebsiteInput, setContactWebsiteInput] = useState('');
  const [isSavingContact, setIsSavingContact] = useState(false);
  const [contactMessage, setContactMessage] = useState<{ text: string; isError: boolean } | null>(null);

  useEffect(() => {
    if (!isEditingContact && userBiz) {
      setContactPhoneInput(userBiz.phone || '');
      setContactEmailInput(userBiz.email || '');
      setContactWebsiteInput(userBiz.website || '');
    }
  }, [userBiz?.phone, userBiz?.email, userBiz?.website, isEditingContact]);

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userBiz) return;
    setContactMessage(null);
    setIsSavingContact(true);

    try {
      const res = await businessApi.updateContactInfo(userBiz.id, {
        phone: contactPhoneInput.trim(),
        email: contactEmailInput.trim(),
        website: contactWebsiteInput.trim()
      });

      if (res.success) {
        setContactMessage({
          text: res.message || 'Business contact information saved successfully.',
          isError: false
        });
        setIsEditingContact(false);
        await refreshData();
      } else {
        setContactMessage({
          text: (res as any).error || res.message || 'Failed to update business contact information.',
          isError: true
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update business contact information.';
      setContactMessage({
        text: msg,
        isError: true
      });
    } finally {
      setIsSavingContact(false);
    }
  };

  const handleClearContact = async () => {
    if (!userBiz) return;
    setContactMessage(null);
    setIsSavingContact(true);

    try {
      const res = await businessApi.clearContactInfo(userBiz.id);
      if (res.success) {
        setContactMessage({
          text: res.message || 'Business contact information cleared successfully.',
          isError: false
        });
        setContactPhoneInput('');
        setContactEmailInput('');
        setContactWebsiteInput('');
        setIsEditingContact(false);
        await refreshData();
      } else {
        setContactMessage({
          text: (res as any).error || res.message || 'Failed to clear business contact information.',
          isError: true
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to clear business contact information.';
      setContactMessage({
        text: msg,
        isError: true
      });
    } finally {
      setIsSavingContact(false);
    }
  };

  return (
    <div id="merchant-dashboard-view" className="min-h-screen pb-20 text-slate-900 dark:text-slate-100 transition-colors">
      
      {/* Business Cover Banner (Epic 2 Task 2.2.3) */}
      <div className="relative w-full h-44 sm:h-56 md:h-64 bg-slate-100 dark:bg-slate-800/80 overflow-hidden border-b border-slate-200/80 dark:border-slate-800 group">
        {userBiz?.coverImageUrl ? (
          <img
            id="business-cover-image"
            src={userBiz.coverImageUrl}
            alt={`${userBiz?.name || 'Business'} Cover`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div 
            id="business-cover-placeholder"
            className="w-full h-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900/60 text-slate-400 dark:text-slate-500 select-none"
          >
            <ImageIcon className="w-10 h-10 mb-1.5 opacity-40 stroke-1" />
            <span className="text-xs font-medium text-slate-400 dark:text-slate-500">No cover image uploaded</span>
          </div>
        )}

        {/* Cover Management Controls (Owner only) */}
        {isOwner && (
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <input
              ref={coverFileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleCoverFileSelect}
              className="hidden"
              id="business-cover-file-input"
            />
            <button
              type="button"
              id="upload-business-cover-btn"
              onClick={() => coverFileInputRef.current?.click()}
              disabled={isUploadingCover || isRemovingCover}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white/95 hover:bg-white dark:bg-slate-900/95 dark:hover:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-sm border border-slate-200/80 dark:border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              {isUploadingCover ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600 dark:text-cyan-400" />
                  <span>Uploading Cover...</span>
                </>
              ) : (
                <>
                  <Camera className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                  <span>{userBiz?.coverImageUrl ? 'Change Cover' : 'Upload Cover'}</span>
                </>
              )}
            </button>

            {userBiz?.coverImageUrl && (
              <button
                type="button"
                id="remove-business-cover-btn"
                onClick={handleRemoveCover}
                disabled={isUploadingCover || isRemovingCover}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white/95 hover:bg-rose-50 dark:bg-slate-900/95 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 shadow-sm border border-rose-200 dark:border-rose-900/50 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                {isRemovingCover ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Removing...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove</span>
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {/* Cover Feedback Notification Banner */}
        {coverMessage && (
          <div
            id="business-cover-feedback"
            className={`absolute bottom-3 left-4 right-4 sm:left-auto sm:right-4 max-w-md px-3 py-2 rounded-lg text-xs font-medium shadow-md border flex items-center gap-2 ${
              coverMessage.isError
                ? 'bg-rose-50 text-rose-800 dark:bg-rose-950 dark:text-rose-200 border-rose-200 dark:border-rose-800'
                : 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800'
            }`}
          >
            {coverMessage.isError ? (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
            ) : (
              <Check className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            )}
            <span className="flex-1">{coverMessage.text}</span>
            <button
              type="button"
              onClick={() => setCoverMessage(null)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold px-1"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Top Banner / Merchant Identity */}
      <div className="glass-panel border-b border-slate-200/80 dark:border-slate-800 px-4 py-6 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="relative group shrink-0 w-16 h-16">
              <img
                src={userBiz?.logoUrl || 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=200&auto=format&fit=crop&q=80'}
                alt={userBiz?.name || 'Business'}
                className="w-16 h-16 rounded-2xl object-cover border-2 border-slate-200 dark:border-slate-700 shadow-sm bg-slate-100 dark:bg-slate-800"
              />
              {isOwner && (
                <button
                  type="button"
                  onClick={() => logoFileInputRef.current?.click()}
                  disabled={isUploadingLogo || isRemovingLogo}
                  aria-label="Upload new business logo"
                  className="absolute inset-0 bg-black/40 hover:bg-black/60 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white"
                  title="Upload new logo"
                >
                  {isUploadingLogo ? (
                    <Loader2 className="w-5 h-5 animate-spin text-white" />
                  ) : (
                    <Camera className="w-5 h-5 text-white" />
                  )}
                </button>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  {userBiz?.name || 'Business Advertising Hub'}
                </h1>
                <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-cyan-400" />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {(userBiz?.categories && userBiz.categories.length > 0)
                  ? userBiz.categories.map(cId => categories.find(c => c.id === cId)?.name || cId).join(', ')
                  : (userBiz?.categoryLabel || userBiz?.category || 'General Business')}
                {userBiz?.location?.city ? ` • ${userBiz.location.city}, ${userBiz.location.state}` : ''}
              </p>

              {/* Logo Management Actions */}
              {isOwner && (
                <div className="flex items-center gap-2 mt-2">
                  <input
                    ref={logoFileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleLogoFileSelect}
                    className="hidden"
                    id="business-logo-file-input"
                  />
                  <button
                    type="button"
                    id="upload-business-logo-btn"
                    onClick={() => logoFileInputRef.current?.click()}
                    disabled={isUploadingLogo || isRemovingLogo}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isUploadingLogo ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600 dark:text-cyan-400" />
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <>
                        <Camera className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                        <span>{userBiz?.logoUrl ? 'Change Logo' : 'Upload Logo'}</span>
                      </>
                    )}
                  </button>

                  {userBiz?.logoUrl && (
                    <button
                      type="button"
                      id="remove-business-logo-btn"
                      onClick={handleRemoveLogo}
                      disabled={isUploadingLogo || isRemovingLogo}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1"
                    >
                      {isRemovingLogo ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>Removing...</span>
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-3 h-3" />
                          <span>Remove</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}

              {logoMessage && (
                <div
                  id="business-logo-feedback"
                  className={`mt-2 text-xs px-2.5 py-1 rounded-md inline-flex items-center gap-1.5 ${
                    logoMessage.isError
                      ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-900'
                      : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900'
                  }`}
                >
                  {logoMessage.isError ? (
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  ) : (
                    <Check className="w-3.5 h-3.5 shrink-0" />
                  )}
                  <span>{logoMessage.text}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <a
              id="view-public-page-btn"
              href={`/business/${encodeURIComponent(userBiz?.slug || userBiz?.id || '')}`}
              onClick={(e) => {
                if (userBiz?.id) {
                  e.preventDefault();
                  viewBusinessDetail(userBiz.id);
                }
              }}
              className="px-4 py-2.5 rounded-xl glass-card text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>View Public Page</span>
            </a>

            <button
              onClick={() => setIsCreateAdModalOpen(true)}
              className="btn-advertise px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-md cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Advertisement</span>
            </button>
          </div>
        </div>
      </div>

      {/* Business Description Section (Epic 2 Feature 2.2 Task 2.2.4) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-5">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between gap-4 mb-2">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-600 dark:text-cyan-400" />
              <span>About the Business</span>
            </h2>
            {isOwner && !isEditingDescription && (
              <button
                type="button"
                id="edit-business-description-btn"
                onClick={() => {
                  setDescriptionInput(userBiz?.description || '');
                  setIsEditingDescription(true);
                  setDescriptionMessage(null);
                }}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
              >
                {userBiz?.description ? 'Edit Description' : 'Add Description'}
              </button>
            )}
          </div>

          {/* Description Message Notification */}
          {descriptionMessage && (
            <div
              id="business-description-feedback"
              className={`mb-3 text-xs px-3 py-2 rounded-lg flex items-center gap-2 border ${
                descriptionMessage.isError
                  ? 'bg-rose-50 text-rose-800 dark:bg-rose-950/50 dark:text-rose-200 border-rose-200 dark:border-rose-800'
                  : 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800'
              }`}
            >
              {descriptionMessage.isError ? (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
              ) : (
                <Check className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              )}
              <span className="flex-1">{descriptionMessage.text}</span>
              <button
                type="button"
                onClick={() => setDescriptionMessage(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold"
              >
                ✕
              </button>
            </div>
          )}

          {isEditingDescription ? (
            <form onSubmit={handleSaveDescription} className="space-y-3">
              <div>
                <textarea
                  id="business-description-textarea"
                  rows={4}
                  maxLength={2000}
                  value={descriptionInput}
                  onChange={(e) => setDescriptionInput(e.target.value)}
                  placeholder="Describe your business, products, services, specialty, or history..."
                  disabled={isSavingDescription}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white transition-all resize-y"
                />
                <div className="flex justify-between items-center mt-1 text-xs text-slate-400">
                  <span>Formatting: Paragraphs and line breaks are safely preserved</span>
                  <span className={descriptionInput.length > 2000 ? 'text-rose-500 font-bold' : ''}>
                    {descriptionInput.length}/2000
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  id="cancel-business-description-btn"
                  onClick={() => {
                    setIsEditingDescription(false);
                    setDescriptionInput(userBiz?.description || '');
                    setDescriptionMessage(null);
                  }}
                  disabled={isSavingDescription}
                  className="px-3.5 py-1.5 text-xs font-medium rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  id="save-business-description-btn"
                  disabled={isSavingDescription || descriptionInput.length > 2000}
                  className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSavingDescription ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Description</span>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div>
              {userBiz?.description ? (
                <p id="business-description-display" className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                  {userBiz.description}
                </p>
              ) : (
                <p id="business-description-empty" className="text-sm text-slate-400 dark:text-slate-500 italic">
                  No business description provided yet.
                  {isOwner && ' Click "Add Description" above to tell customers about what makes your business special.'}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Business Categories Management Card (Epic 2 Feature 2.2 Task 2.2.5) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-5">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between gap-4 mb-2">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Tag className="w-4 h-4 text-indigo-600 dark:text-cyan-400" />
                <span>Business Categories</span>
              </h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
                {selectedCategoryIds.length}/5
              </span>
            </div>
            {isOwner && !isEditingCategories && (
              <button
                type="button"
                id="edit-business-categories-btn"
                onClick={() => {
                  setIsEditingCategories(true);
                  setCategoriesMessage(null);
                  setCategorySearchQuery('');
                }}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
              >
                {selectedCategoryIds.length > 0 ? 'Edit Categories' : 'Add Categories'}
              </button>
            )}
          </div>

          {/* Categories Feedback Notification */}
          {categoriesMessage && (
            <div
              id="business-categories-feedback"
              className={`mb-3 text-xs px-3 py-2 rounded-lg flex items-center gap-2 border ${
                categoriesMessage.isError
                  ? 'bg-rose-50 text-rose-800 dark:bg-rose-950/50 dark:text-rose-200 border-rose-200 dark:border-rose-800'
                  : 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800'
              }`}
            >
              {categoriesMessage.isError ? (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
              ) : (
                <Check className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              )}
              <span className="flex-1">{categoriesMessage.text}</span>
              <button
                type="button"
                onClick={() => setCategoriesMessage(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold"
              >
                ✕
              </button>
            </div>
          )}

          {isEditingCategories ? (
            <div className="space-y-4">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Select up to 5 controlled categories that classify your business. The first category acts as your primary category.
              </p>

              {/* Selected Categories Chips with Remove */}
              {selectedCategoryIds.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Selected Categories ({selectedCategoryIds.length}/5):
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedCategoryIds.map((catId, idx) => {
                      const catConfig = categories.find(c => c.id === catId);
                      const name = catConfig?.name || catId;
                      return (
                        <span
                          key={catId}
                          id={`selected-category-${catId}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200"
                        >
                          {idx === 0 && (
                            <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-indigo-200 dark:bg-indigo-800 text-indigo-800 dark:text-indigo-100">
                              Primary
                            </span>
                          )}
                          <span>{name}</span>
                          <button
                            type="button"
                            id={`remove-category-${catId}`}
                            onClick={() => handleToggleCategory(catId)}
                            className="p-0.5 text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-100 rounded transition-colors cursor-pointer"
                            title={`Remove ${name}`}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Search filter if there are many categories */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  id="category-search-input"
                  value={categorySearchQuery}
                  onChange={(e) => setCategorySearchQuery(e.target.value)}
                  placeholder="Filter available categories..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Available Categories Grid */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-3 bg-slate-50/50 dark:bg-slate-800/30 max-h-56 overflow-y-auto">
                <div className="flex flex-wrap gap-2">
                  {categories
                    .filter(cat => cat.active !== false)
                    .filter(cat => !categorySearchQuery || cat.name.toLowerCase().includes(categorySearchQuery.toLowerCase()))
                    .map((cat) => {
                      const isSelected = selectedCategoryIds.includes(cat.id);
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          id={`category-toggle-${cat.id}`}
                          onClick={() => handleToggleCategory(cat.id)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-600 border-indigo-600 text-white font-semibold shadow-xs'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                          <span>{cat.name}</span>
                        </button>
                      );
                    })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  id="cancel-business-categories-btn"
                  onClick={() => {
                    setIsEditingCategories(false);
                    if (userBiz?.categories) {
                      setSelectedCategoryIds(userBiz.categories);
                    } else if (userBiz?.category) {
                      setSelectedCategoryIds([userBiz.category]);
                    } else {
                      setSelectedCategoryIds([]);
                    }
                    setCategoriesMessage(null);
                  }}
                  disabled={isSavingCategories}
                  className="px-3.5 py-1.5 text-xs font-medium rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  id="save-business-categories-btn"
                  onClick={() => handleSaveCategories()}
                  disabled={isSavingCategories}
                  className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSavingCategories ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Categories</span>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div>
              {selectedCategoryIds.length > 0 ? (
                <div id="business-categories-display" className="flex flex-wrap gap-2 items-center">
                  {selectedCategoryIds.map((catId, idx) => {
                    const catConfig = categories.find(c => c.id === catId);
                    const name = catConfig?.name || catId;
                    return (
                      <span
                        key={catId}
                        id={`category-chip-${catId}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                      >
                        {idx === 0 && (
                          <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                            Primary
                          </span>
                        )}
                        <span>{name}</span>
                      </span>
                    );
                  })}
                </div>
              ) : (
                <p id="business-categories-empty" className="text-sm text-slate-400 dark:text-slate-500 italic">
                  No categories selected yet.
                  {isOwner && ' Click "Add Categories" above to associate your business with relevant categories.'}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Business Location Management Card (Epic 2 Feature 2.2 Task 2.2.6) */}
      <div id="business-location-card" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-5">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between gap-4 mb-2">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <MapPin className="w-4 h-4 text-indigo-600 dark:text-cyan-400" />
                <span>Business Location</span>
              </h2>
              {userBiz?.location && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 font-medium">
                  Configured
                </span>
              )}
            </div>
            {isOwner && !isEditingLocation && (
              <div className="flex items-center gap-2">
                {userBiz?.location && (
                  <button
                    type="button"
                    id="clear-business-location-btn"
                    onClick={() => handleClearLocation()}
                    disabled={isSavingLocation}
                    className="px-2.5 py-1.5 text-xs font-medium rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Remove
                  </button>
                )}
                <button
                  type="button"
                  id="edit-business-location-btn"
                  onClick={() => {
                    setIsEditingLocation(true);
                    setLocationMessage(null);
                  }}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                >
                  {userBiz?.location ? 'Edit Location' : 'Add Location'}
                </button>
              </div>
            )}
          </div>

          {/* Location Feedback Notification */}
          {locationMessage && (
            <div
              id="business-location-feedback"
              className={`mb-3 text-xs px-3 py-2 rounded-lg flex items-center gap-2 border ${
                locationMessage.isError
                  ? 'bg-rose-50 text-rose-800 dark:bg-rose-950/50 dark:text-rose-200 border-rose-200 dark:border-rose-800'
                  : 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800'
              }`}
            >
              {locationMessage.isError ? (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
              ) : (
                <Check className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              )}
              <span className="flex-1">{locationMessage.text}</span>
              <button
                type="button"
                onClick={() => setLocationMessage(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold"
              >
                ✕
              </button>
            </div>
          )}

          {isEditingLocation ? (
            <div className="space-y-4 pt-1">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Set your operating address or service area. Businesses across all Nigerian states and cities are supported.
              </p>

              {/* State & City Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="location-state-select" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    State / Region <span className="text-rose-500">*</span>
                  </label>
                  <select
                    id="location-state-select"
                    value={locationState}
                    onChange={(e) => setLocationState(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="">Select a Nigerian State...</option>
                    {NIGERIAN_STATES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="location-city-input" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    City / Town <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="location-city-input"
                    value={locationCity}
                    onChange={(e) => setLocationCity(e.target.value)}
                    placeholder="e.g. Ikeja, Wuse, Kaduna Central, Aba"
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Street Address & LGA */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="location-address-input" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Street Address (Optional)
                  </label>
                  <input
                    type="text"
                    id="location-address-input"
                    value={locationAddress}
                    onChange={(e) => setLocationAddress(e.target.value)}
                    placeholder="e.g. 14 Ahmadu Bello Way"
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label htmlFor="location-lga-input" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    LGA / District (Optional)
                  </label>
                  <input
                    type="text"
                    id="location-lga-input"
                    value={locationLga}
                    onChange={(e) => setLocationLga(e.target.value)}
                    placeholder="e.g. Kaduna North, Ikeja, Abuja Municipal"
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Postal Code & Country */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="location-postalcode-input" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Postal Code (Optional)
                  </label>
                  <input
                    type="text"
                    id="location-postalcode-input"
                    value={locationPostalCode}
                    onChange={(e) => setLocationPostalCode(e.target.value)}
                    placeholder="e.g. 800283"
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label htmlFor="location-country-input" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Country
                  </label>
                  <input
                    type="text"
                    id="location-country-input"
                    value={locationCountry}
                    onChange={(e) => setLocationCountry(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Coordinates (Optional) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label htmlFor="location-lat-input" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Latitude (-90 to +90, Optional)
                  </label>
                  <input
                    type="text"
                    id="location-lat-input"
                    value={locationLat}
                    onChange={(e) => setLocationLat(e.target.value)}
                    placeholder="e.g. 10.5105"
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label htmlFor="location-lng-input" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Longitude (-180 to +180, Optional)
                  </label>
                  <input
                    type="text"
                    id="location-lng-input"
                    value={locationLng}
                    onChange={(e) => setLocationLng(e.target.value)}
                    placeholder="e.g. 7.4165"
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Service Area Checkbox & Distance */}
              <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
                <label className="flex items-center gap-2 cursor-pointer mb-2">
                  <input
                    type="checkbox"
                    id="location-service-area-checkbox"
                    checked={isServiceAreaOnly}
                    onChange={(e) => setIsServiceAreaOnly(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                  />
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Service area only (online delivery / mobile services without public walk-in premises)
                  </span>
                </label>

                {isServiceAreaOnly && (
                  <div className="pl-6 pt-1 max-w-xs">
                    <label htmlFor="location-service-area-km-input" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Service Radius (km, Optional)
                    </label>
                    <input
                      type="number"
                      id="location-service-area-km-input"
                      min="1"
                      max="1000"
                      value={serviceAreaKm}
                      onChange={(e) => setServiceAreaKm(e.target.value)}
                      placeholder="e.g. 25"
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  id="cancel-business-location-btn"
                  onClick={() => {
                    setIsEditingLocation(false);
                    setLocationMessage(null);
                  }}
                  disabled={isSavingLocation}
                  className="px-3.5 py-1.5 text-xs font-medium rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  id="save-business-location-btn"
                  onClick={() => handleSaveLocation()}
                  disabled={isSavingLocation}
                  className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSavingLocation ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Location</span>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div>
              {userBiz?.location ? (
                <div id="business-location-display" className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                  <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span>
                      {[
                        userBiz.location.address,
                        userBiz.location.lga,
                        userBiz.location.city,
                        userBiz.location.state,
                        userBiz.location.country
                      ].filter(Boolean).join(', ')}
                    </span>
                  </div>

                  {userBiz.location.postalCode && (
                    <div className="text-slate-500 dark:text-slate-400">
                      Postal Code: {userBiz.location.postalCode}
                    </div>
                  )}

                  {typeof userBiz.location.lat === 'number' && typeof userBiz.location.lng === 'number' && (
                    <div className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <Navigation className="w-3 h-3 text-indigo-500" />
                      <span>GPS: {userBiz.location.lat.toFixed(5)}, {userBiz.location.lng.toFixed(5)}</span>
                    </div>
                  )}

                  {userBiz.location.isServiceAreaOnly && (
                    <div className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800">
                      Service Area Only{userBiz.location.serviceAreaKm ? ` (within ${userBiz.location.serviceAreaKm} km)` : ''}
                    </div>
                  )}
                </div>
              ) : (
                <p id="business-location-empty" className="text-sm text-slate-400 dark:text-slate-500 italic">
                  No location specified yet.
                  {isOwner && ' Click "Add Location" above to set where your business operates.'}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Business Opening Hours Card (Epic 2 Feature 2.2 Task 2.2.7) */}
      <div id="business-hours-card" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-5">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Business Hours
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Define your weekly operating schedule in local business time (24h format HH:mm)
                </p>
              </div>
            </div>

            {isOwner && !isEditingHours && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  id="edit-business-hours-btn"
                  onClick={() => {
                    setIsEditingHours(true);
                    setHoursMessage(null);
                  }}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 transition-colors cursor-pointer"
                >
                  Edit Hours
                </button>
                {userBiz?.openingHours && userBiz.openingHours.length > 0 && (
                  <button
                    type="button"
                    id="clear-business-hours-btn"
                    onClick={handleClearHours}
                    disabled={isSavingHours}
                    className="px-2.5 py-1.5 text-xs font-semibold rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer disabled:opacity-50"
                    title="Remove all opening hours"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>

          {hoursMessage && (
            <div
              id="business-hours-feedback"
              className={`mt-4 p-3 rounded-xl text-xs flex items-center gap-2 ${
                hoursMessage.isError
                  ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-900'
                  : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-900'
              }`}
            >
              {hoursMessage.isError ? (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
              ) : (
                <Check className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              )}
              <span>{hoursMessage.text}</span>
            </div>
          )}

          {isEditingHours ? (
            <form id="business-hours-edit-form" onSubmit={handleSaveHours} className="mt-5 space-y-4">
              <div className="flex items-center justify-between pb-2">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Toggle each day to set open/closed status and daily operating periods:
                </span>
                <button
                  type="button"
                  id="copy-monday-hours-btn"
                  onClick={copyMondayToWeekdays}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors cursor-pointer"
                  title="Copy Monday's schedule to Tuesday through Friday"
                >
                  <Copy className="w-3 h-3" />
                  <span>Copy Mon to Weekdays</span>
                </button>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                {hoursSchedule.map((dayItem, dayIdx) => {
                  const dayName = dayItem.day;
                  const isOpen = dayItem.isOpen;
                  const periods = dayItem.periods || [];

                  return (
                    <div
                      key={dayName}
                      id={`hours-row-${dayName.toLowerCase()}`}
                      className={`p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                        isOpen ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/50 dark:bg-slate-900/40'
                      }`}
                    >
                      {/* Day Name & Open/Closed Switch */}
                      <div className="flex items-center gap-3 w-40 shrink-0">
                        <button
                          type="button"
                          id={`toggle-day-${dayName.toLowerCase()}`}
                          onClick={() => toggleDayOpen(dayIdx)}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            isOpen ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
                          }`}
                          role="switch"
                          aria-checked={isOpen}
                        >
                          <span
                            aria-hidden="true"
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              isOpen ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                        <span className={`text-sm font-semibold ${isOpen ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400 dark:text-slate-500'}`}>
                          {dayName}
                        </span>
                      </div>

                      {/* Periods or Closed Label */}
                      <div className="flex-1 flex flex-col gap-2">
                        {isOpen ? (
                          periods.map((period, periodIdx) => (
                            <div key={periodIdx} className="flex flex-wrap items-center gap-2">
                              <div className="flex items-center gap-1.5">
                                <label className="sr-only">Opening time</label>
                                <input
                                  type="time"
                                  id={`time-${dayName.toLowerCase()}-${periodIdx}-open`}
                                  value={period.open}
                                  onChange={(e) => updatePeriod(dayIdx, periodIdx, 'open', e.target.value)}
                                  className="px-2.5 py-1 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
                                  required
                                />
                                <span className="text-xs text-slate-400 font-bold">–</span>
                                <label className="sr-only">Closing time</label>
                                <input
                                  type="time"
                                  id={`time-${dayName.toLowerCase()}-${periodIdx}-close`}
                                  value={period.close}
                                  onChange={(e) => updatePeriod(dayIdx, periodIdx, 'close', e.target.value)}
                                  className="px-2.5 py-1 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
                                  required
                                />
                              </div>

                              {/* Cross midnight indicator / toggle */}
                              <label className="inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 cursor-pointer ml-1">
                                <input
                                  type="checkbox"
                                  checked={!!period.crossMidnight}
                                  onChange={(e) => updatePeriod(dayIdx, periodIdx, 'crossMidnight', e.target.checked)}
                                  className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500"
                                />
                                <span>Overnight</span>
                              </label>

                              {/* Remove period if more than 1 period */}
                              {periods.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removePeriod(dayIdx, periodIdx)}
                                  className="p-1 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                                  title="Remove period"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Add 2nd period button */}
                              {periods.length === 1 && periodIdx === 0 && (
                                <button
                                  type="button"
                                  id={`add-period-${dayName.toLowerCase()}`}
                                  onClick={() => addPeriod(dayIdx)}
                                  className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-0.5 ml-2 cursor-pointer"
                                >
                                  <Plus className="w-3 h-3" />
                                  <span>Add Split Shift</span>
                                </button>
                              )}
                            </div>
                          ))
                        ) : (
                          <span className="text-xs font-medium text-slate-400 dark:text-slate-500 italic">
                            Closed
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Form Action Controls */}
              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  id="cancel-business-hours-btn"
                  onClick={() => {
                    setIsEditingHours(false);
                    setHoursMessage(null);
                  }}
                  disabled={isSavingHours}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="save-business-hours-btn"
                  disabled={isSavingHours}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSavingHours ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving Schedule...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Save Business Hours</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div id="business-hours-display" className="mt-4">
              {userBiz?.openingHours && userBiz.openingHours.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {userBiz.openingHours.map((dayItem) => {
                    const isOpen = dayItem.isOpen;
                    const displayHours = dayItem.hours || formatOpeningHourDisplay(dayItem);

                    return (
                      <div
                        key={dayItem.day}
                        id={`hours-display-${dayItem.day.toLowerCase()}`}
                        className={`p-3 rounded-xl border transition-colors ${
                          isOpen
                            ? 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800'
                            : 'bg-slate-50/30 dark:bg-slate-900/30 border-dashed border-slate-200/50 dark:border-slate-800/50 opacity-75'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            {dayItem.day}
                          </span>
                          <span
                            className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                              isOpen
                                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                            }`}
                          >
                            {isOpen ? 'Open' : 'Closed'}
                          </span>
                        </div>
                        <div className="text-xs font-medium text-slate-600 dark:text-slate-400">
                          {displayHours}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p id="business-hours-empty" className="text-sm text-slate-400 dark:text-slate-500 italic">
                  No opening hours defined yet.
                  {isOwner && ' Click "Edit Hours" above to define when your business is open and closed.'}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Business Contact Information Card (Epic 2 Feature 2.2 Task 2.2.8) */}
      <div id="business-contact-card" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-5">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Phone className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Business Contact Information
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Public customer-facing contact channels (phone, email, and website)
                </p>
              </div>
            </div>

            {isOwner && !isEditingContact && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  id="edit-business-contact-btn"
                  onClick={() => {
                    setIsEditingContact(true);
                    setContactMessage(null);
                    setContactPhoneInput(userBiz?.phone || '');
                    setContactEmailInput(userBiz?.email || '');
                    setContactWebsiteInput(userBiz?.website || '');
                  }}
                  className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  Edit Contact Info
                </button>
                {(userBiz?.phone || userBiz?.email || userBiz?.website) && (
                  <button
                    type="button"
                    id="clear-business-contact-btn"
                    onClick={handleClearContact}
                    disabled={isSavingContact}
                    className="px-2.5 py-1.5 text-xs font-semibold rounded-xl border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1"
                    title="Clear all contact details"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Feedback Message */}
          {contactMessage && (
            <div
              id="business-contact-message"
              className={`mt-4 p-3 rounded-xl text-xs font-medium flex items-center gap-2 ${
                contactMessage.isError
                  ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                  : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
              }`}
            >
              {contactMessage.isError ? (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              ) : (
                <Check className="w-4 h-4 shrink-0 text-emerald-500" />
              )}
              <span>{contactMessage.text}</span>
            </div>
          )}

          {isEditingContact ? (
            <form id="business-contact-edit-form" onSubmit={handleSaveContact} className="mt-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Business Phone */}
                <div>
                  <label htmlFor="business-contact-phone-input" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Business Phone Number
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Phone className="w-3.5 h-3.5" />
                    </div>
                    <input
                      type="tel"
                      id="business-contact-phone-input"
                      value={contactPhoneInput}
                      onChange={(e) => setContactPhoneInput(e.target.value)}
                      placeholder="e.g. 0803 123 4567 or +234 803 123 4567"
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                    Accepts Nigerian domestic and international E.164 formats.
                  </p>
                </div>

                {/* Business Email */}
                <div>
                  <label htmlFor="business-contact-email-input" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Business Contact Email
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-3.5 h-3.5" />
                    </div>
                    <input
                      type="email"
                      id="business-contact-email-input"
                      value={contactEmailInput}
                      onChange={(e) => setContactEmailInput(e.target.value)}
                      placeholder="e.g. contact@business.com"
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                    Public contact address for inquiries (distinct from your login email).
                  </p>
                </div>

                {/* Business Website */}
                <div>
                  <label htmlFor="business-contact-website-input" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Business Website
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Globe className="w-3.5 h-3.5" />
                    </div>
                    <input
                      type="text"
                      id="business-contact-website-input"
                      value={contactWebsiteInput}
                      onChange={(e) => setContactWebsiteInput(e.target.value)}
                      placeholder="e.g. https://mybusiness.com"
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                    Standard web URL (HTTP or HTTPS protocol required).
                  </p>
                </div>
              </div>

              {/* Form Action Controls */}
              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  id="cancel-business-contact-btn"
                  onClick={() => {
                    setIsEditingContact(false);
                    setContactMessage(null);
                  }}
                  disabled={isSavingContact}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="save-business-contact-btn"
                  disabled={isSavingContact}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSavingContact ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Contact Info</span>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div className="mt-4">
              {userBiz?.phone || userBiz?.email || userBiz?.website ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Phone Display */}
                  <div
                    id="contact-display-phone"
                    className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40"
                  >
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-1">
                      <Phone className="w-3.5 h-3.5 text-blue-500" />
                      <span className="text-[11px] font-semibold uppercase tracking-wider">Phone</span>
                    </div>
                    <div className="text-xs font-medium text-slate-800 dark:text-slate-200 break-all">
                      {userBiz.phone || <span className="text-slate-400 italic">Not specified</span>}
                    </div>
                  </div>

                  {/* Email Display */}
                  <div
                    id="contact-display-email"
                    className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40"
                  >
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-1">
                      <Mail className="w-3.5 h-3.5 text-blue-500" />
                      <span className="text-[11px] font-semibold uppercase tracking-wider">Contact Email</span>
                    </div>
                    <div className="text-xs font-medium text-slate-800 dark:text-slate-200 break-all">
                      {userBiz.email || <span className="text-slate-400 italic">Not specified</span>}
                    </div>
                  </div>

                  {/* Website Display */}
                  <div
                    id="contact-display-website"
                    className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40"
                  >
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-1">
                      <Globe className="w-3.5 h-3.5 text-blue-500" />
                      <span className="text-[11px] font-semibold uppercase tracking-wider">Website</span>
                    </div>
                    <div className="text-xs font-medium text-slate-800 dark:text-slate-200 break-all">
                      {userBiz.website ? (
                        <a
                          href={userBiz.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 inline-flex"
                        >
                          <span className="truncate">{userBiz.website}</span>
                          <ArrowUpRight className="w-3 h-3 shrink-0" />
                        </a>
                      ) : (
                        <span className="text-slate-400 italic">Not specified</span>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <p id="business-contact-empty" className="text-sm text-slate-400 dark:text-slate-500 italic">
                  No business contact information provided yet.
                  {isOwner && ' Click "Edit Contact Info" above to add your public phone, email, and website.'}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Primary Advertising Performance Metrics */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          
          <div className="glass-card p-5 rounded-2xl">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Total Ad Views</span>
              <Eye className="w-4 h-4 text-indigo-600 dark:text-cyan-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              {totalAdViews.toLocaleString()}
            </div>
            <div className="text-xs text-emerald-600 dark:text-emerald-400 font-bold mt-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              <span>+24.8% this week</span>
            </div>
          </div>

          <div className="glass-card p-5 rounded-2xl">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Ad Engagements</span>
              <MousePointer className="w-4 h-4 text-purple-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              {totalAdClicks.toLocaleString()}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-1">
              Clicks & Inquiries
            </div>
          </div>

          <div className="glass-card p-5 rounded-2xl">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Customer Leads</span>
              <Users className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              {userLeads.length || 14}
            </div>
            <div className="text-xs text-emerald-600 dark:text-emerald-400 font-bold mt-1">
              WhatsApp & Calls
            </div>
          </div>

          <div className="glass-card p-5 rounded-2xl">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Active Campaigns</span>
              <Megaphone className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              {userAds.filter(a => a.isBoosted).length || 2} Boosted
            </div>
            <div className="text-xs text-indigo-600 dark:text-cyan-400 font-bold mt-1">
              Multi-platform distribution
            </div>
          </div>

        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto pb-2 text-xs font-bold">
          
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-2.5 px-4 flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'overview'
                ? 'border-indigo-600 text-indigo-600 dark:text-cyan-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Advertising Overview</span>
          </button>

          <button
            onClick={() => setActiveTab('ads')}
            className={`pb-2.5 px-4 flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'ads'
                ? 'border-indigo-600 text-indigo-600 dark:text-cyan-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Flame className="w-4 h-4 text-amber-500" />
            <span>My Advertisements ({userAds.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('leads')}
            className={`pb-2.5 px-4 flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'leads'
                ? 'border-indigo-600 text-indigo-600 dark:text-cyan-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Users className="w-4 h-4 text-emerald-500" />
            <span>Direct Leads ({userLeads.length || 6})</span>
          </button>

          <button
            onClick={() => setActiveTab('products')}
            className={`pb-2.5 px-4 flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'products'
                ? 'border-indigo-600 text-indigo-600 dark:text-cyan-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Product Catalog</span>
          </button>

          <button
            onClick={() => setActiveTab('services')}
            className={`pb-2.5 px-4 flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'services'
                ? 'border-indigo-600 text-indigo-600 dark:text-cyan-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Wrench className="w-4 h-4" />
            <span>Services Menu</span>
          </button>

          <button
            onClick={() => setActiveTab('bank_payouts')}
            className={`pb-2.5 px-4 flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'bank_payouts'
                ? 'border-indigo-600 text-indigo-600 dark:text-cyan-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Payout Account</span>
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            
            {/* Quick Action Boost Banner */}
            <div className="glass-card rounded-3xl p-6 sm:p-8 border-indigo-400/40 dark:border-indigo-500/40 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="space-y-2 text-center md:text-left">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-cyan-400">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Boost Distribution Engine</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                  Reach 25,000+ Potential Customers in {userBiz?.location?.city || 'Your Area'}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-xl">
                  Boost your active advertisements across Boost Market feeds, Facebook, Instagram, and local search channels.
                </p>
              </div>

              <button
                onClick={() => setActiveView('campaigns')}
                className="btn-advertise px-6 py-3 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2 shadow-lg cursor-pointer whitespace-nowrap"
              >
                <Flame className="w-4 h-4 text-amber-300" />
                <span>Launch New Boost Campaign</span>
              </button>
            </div>

            {/* Active Advertisements Showcase */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Active Advertisements Performance
                </h3>
                <button
                  onClick={() => setIsCreateAdModalOpen(true)}
                  className="text-xs font-bold text-indigo-600 dark:text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Ad</span>
                </button>
              </div>

              {userAds.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {userAds.map(ad => (
                    <AdvertisementCard key={ad.id} ad={ad} business={userBiz} />
                  ))}
                </div>
              ) : (
                <div className="glass-card rounded-2xl p-10 text-center text-slate-400 text-xs">
                  <p>You have not published any advertisements yet.</p>
                  <button
                    onClick={() => setIsCreateAdModalOpen(true)}
                    className="mt-4 px-4 py-2 rounded-xl btn-advertise font-bold text-xs cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create Your First Ad</span>
                  </button>
                </div>
              )}
            </div>

          </div>
        )}

        {/* MY ADS TAB */}
        {activeTab === 'ads' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                All Published Advertisements ({userAds.length})
              </h3>
              <button
                onClick={() => setIsCreateAdModalOpen(true)}
                className="btn-advertise px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Post New Ad</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {userAds.map(ad => (
                <div key={ad.id} className="relative">
                  <AdvertisementCard ad={ad} business={userBiz} />
                  
                  {/* Action Bar for Merchant */}
                  <div className="mt-2 flex items-center justify-between p-2 rounded-xl glass-panel text-xs">
                    <span className="font-semibold text-slate-500">
                      Status: <span className="text-emerald-600 dark:text-emerald-400 font-bold">Active</span>
                    </span>
                    <button
                      onClick={() => setActiveView('campaigns')}
                      className="text-xs font-bold text-indigo-600 dark:text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Flame className="w-3.5 h-3.5 text-amber-500" />
                      <span>{ad.isBoosted ? 'Extend Boost' : 'Boost Ad'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* LEADS TAB */}
        {activeTab === 'leads' && (
          <div className="glass-card rounded-2xl overflow-hidden p-5">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">
              Direct Customer Inquiries & Leads
            </h3>
            
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {[
                { name: 'Alhaji Musa Ibrahim', phone: '+2348031122334', ad: 'Premium Computer Diagnostics', time: '10 mins ago', message: 'Hello, what is your pricing for engine scanning?' },
                { name: 'Chinedu Okafor', phone: '+2348029988776', ad: 'Full Transmission Overhaul', time: '2 hours ago', message: 'Can you service my Honda Accord tomorrow morning?' },
                { name: 'Fatima Bello', phone: '+2348095544332', ad: 'Special Diagnostic Promo', time: 'Yesterday', message: 'Do you offer home visit inspections in Kaduna?' }
              ].map((lead, idx) => (
                <div key={idx} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900 dark:text-white">{lead.name}</span>
                      <span className="text-[11px] text-slate-400 font-medium">{lead.time}</span>
                    </div>
                    <div className="text-xs text-indigo-600 dark:text-cyan-400 font-semibold mt-0.5">
                      Interested in: {lead.ad}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 italic">
                      "{lead.message}"
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <a
                      href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}?text=Hello%20${encodeURIComponent(lead.name)},%20thank%20you%20for%20your%20inquiry%20on%20Boost%20Market!`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Reply on WhatsApp</span>
                    </a>

                    <a
                      href={`tel:${lead.phone}`}
                      className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="Call Lead"
                    >
                      <Phone className="w-4 h-4 text-indigo-600" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PRODUCTS CATALOG TAB */}
        {activeTab === 'products' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-4 glass-card p-5 rounded-2xl self-start">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-3">Add Product to Catalog</h3>
              <form onSubmit={handleAddProduct} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">Product Name</label>
                  <input
                    type="text"
                    value={newProdName}
                    onChange={(e) => setNewProdName(e.target.value)}
                    placeholder="e.g. Bosch Diagnostic Scanner OBD2"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">Price (₦ NGN)</label>
                  <input
                    type="number"
                    value={newProdPrice}
                    onChange={(e) => setNewProdPrice(e.target.value)}
                    placeholder="45000"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">Description</label>
                  <textarea
                    rows={2}
                    value={newProdDesc}
                    onChange={(e) => setNewProdDesc(e.target.value)}
                    placeholder="Key specifications, warranty, compatibility..."
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl btn-advertise font-bold text-xs cursor-pointer shadow-md"
                >
                  Save Product
                </button>
              </form>
            </div>

            <div className="lg:col-span-8 glass-card p-5 rounded-2xl">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-4">Current Products</h3>
              <p className="text-xs text-slate-500">Products in your catalog can be featured in advertisements or ordered directly by customers.</p>
            </div>
          </div>
        )}

        {/* SERVICES TAB */}
        {activeTab === 'services' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-4 glass-card p-5 rounded-2xl self-start">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-3">Add Service Offering</h3>
              <form onSubmit={handleAddService} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">Service Name</label>
                  <input
                    type="text"
                    value={newServName}
                    onChange={(e) => setNewServName(e.target.value)}
                    placeholder="e.g. Complete Engine Overhaul & Tune-Up"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">Starting Price (₦ NGN)</label>
                  <input
                    type="number"
                    value={newServPrice}
                    onChange={(e) => setNewServPrice(e.target.value)}
                    placeholder="25000"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">Description</label>
                  <textarea
                    rows={2}
                    value={newServDesc}
                    onChange={(e) => setNewServDesc(e.target.value)}
                    placeholder="Scope of work, turnaround time, guarantee..."
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl btn-advertise font-bold text-xs cursor-pointer shadow-md"
                >
                  Save Service
                </button>
              </form>
            </div>

            <div className="lg:col-span-8 glass-card p-5 rounded-2xl">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-4">Service Offerings</h3>
              <p className="text-xs text-slate-500">Service listings allow clients to request quotes and book directly.</p>
            </div>
          </div>
        )}

        {/* BANK PAYOUTS TAB */}
        {activeTab === 'bank_payouts' && (
          <div className="max-w-xl glass-card rounded-2xl p-6">
            <h3 className="font-bold text-slate-900 dark:text-white text-base mb-2">Merchant Bank Account</h3>
            <p className="text-xs text-slate-500 mb-4">Receive direct bank settlements for client invoices, orders, and services.</p>
            
            <form onSubmit={handleSaveBank} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">Bank Name</label>
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">Account Number</label>
                <input
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">Account Name</label>
                <input
                  type="text"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl btn-advertise font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{bankSaved ? 'Bank Details Updated!' : 'Save Payout Details'}</span>
                </button>
              </div>
            </form>
          </div>
        )}

      </div>

    </div>
  );
};
