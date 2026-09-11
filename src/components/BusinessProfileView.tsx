'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { 
  ShieldCheck, 
  MapPin, 
  Phone, 
  Mail, 
  Globe, 
  Clock, 
  ArrowLeft, 
  Share2, 
  Check, 
  ExternalLink, 
  Building2, 
  AlertCircle,
  Calendar
} from 'lucide-react';
import { 
  PublicBusinessProfile, 
  DAYS_OF_WEEK, 
  formatOpeningHourDisplay, 
  OpeningHour 
} from '../types';

export interface BusinessProfileViewProps {
  initialBusiness?: PublicBusinessProfile | null;
  slug?: string;
  isStandalonePage?: boolean;
}

export const BusinessProfileView: React.FC<BusinessProfileViewProps> = ({
  initialBusiness,
  slug,
  isStandalonePage = false
}) => {
  const { 
    selectedBusinessId, 
    businesses, 
    setActiveView, 
    categories 
  } = useApp();

  const [business, setBusiness] = useState<PublicBusinessProfile | null>(initialBusiness || null);
  const [isLoading, setIsLoading] = useState<boolean>(!initialBusiness);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<boolean>(false);

  const targetIdentifier = slug || selectedBusinessId;

  useEffect(() => {
    if (initialBusiness) {
      setBusiness(initialBusiness);
      setIsLoading(false);
      return;
    }

    if (!targetIdentifier) {
      // Fallback to first business in context if available in SPA mode
      if (businesses.length > 0) {
        const fallbackBiz = businesses[0];
        setBusiness({
          id: fallbackBiz.id,
          slug: fallbackBiz.slug,
          name: fallbackBiz.name,
          tagline: fallbackBiz.tagline,
          description: fallbackBiz.description,
          logoUrl: fallbackBiz.logoUrl,
          coverImageUrl: fallbackBiz.coverImageUrl,
          category: fallbackBiz.category,
          categoryLabel: fallbackBiz.categoryLabel,
          categories: fallbackBiz.categories,
          location: fallbackBiz.location ? {
            city: fallbackBiz.location.city,
            state: fallbackBiz.location.state,
            country: fallbackBiz.location.country,
            address: fallbackBiz.location.isServiceAreaOnly ? undefined : fallbackBiz.location.address,
            lga: fallbackBiz.location.lga,
            postalCode: fallbackBiz.location.isServiceAreaOnly ? undefined : fallbackBiz.location.postalCode,
            serviceAreaKm: fallbackBiz.location.serviceAreaKm,
            isServiceAreaOnly: fallbackBiz.location.isServiceAreaOnly,
            lat: fallbackBiz.location.lat,
            lng: fallbackBiz.location.lng,
          } : undefined,
          openingHours: fallbackBiz.openingHours,
          phone: fallbackBiz.phone,
          email: fallbackBiz.email,
          website: fallbackBiz.website,
          isVerified: Boolean(fallbackBiz.isVerified),
          createdAt: fallbackBiz.createdAt
        });
        setIsLoading(false);
      } else {
        setIsLoading(false);
        setErrorMessage('No business profile specified.');
      }
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    fetch(`/api/businesses/public/${encodeURIComponent(targetIdentifier)}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Business profile not found.');
        }
        setBusiness(data.business);
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Unable to load business profile.';
        setErrorMessage(msg);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [targetIdentifier, initialBusiness, businesses]);

  const handleShare = async () => {
    if (!business) return;
    const shareUrl = typeof window !== 'undefined' 
      ? `${window.location.origin}/business/${encodeURIComponent(business.slug || business.id)}`
      : '';

    if (navigator.clipboard && shareUrl) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setCopyFeedback(true);
        setTimeout(() => setCopyFeedback(false), 2500);
      } catch {
        // Fallback if clipboard API restricted
      }
    }
  };

  const handleBack = () => {
    if (isStandalonePage) {
      if (typeof window !== 'undefined' && window.history.length > 1) {
        window.history.back();
      } else {
        window.location.href = '/';
      }
    } else {
      setActiveView('discover');
    }
  };

  // Determine current day for opening hours highlight
  const currentDayName = DAYS_OF_WEEK[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];
  const todayHours = business?.openingHours?.find(h => h.day.toLowerCase() === currentDayName.toLowerCase());

  if (isLoading) {
    return (
      <div id="public-business-loading" className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-slate-500">
        <div className="w-10 h-10 border-3 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Loading business profile...</p>
      </div>
    );
  }

  if (errorMessage || !business) {
    return (
      <div id="public-business-not-found" className="max-w-3xl mx-auto px-4 py-20 text-center">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight mb-2">
          Business Profile Not Found
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto mb-6">
          {errorMessage || 'The business profile you are looking for does not exist or is currently unavailable on Boost Market.'}
        </p>
        <button
          id="public-business-return-btn"
          onClick={handleBack}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors shadow-sm cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Discovery Feed</span>
        </button>
      </div>
    );
  }

  const categoryNames = business.categories && business.categories.length > 0
    ? business.categories.map(cId => categories.find(c => c.id === cId)?.name || cId)
    : business.categoryLabel || business.category ? [business.categoryLabel || business.category!] : [];

  return (
    <div id="public-business-page" className="min-h-screen pb-20 text-slate-900 dark:text-slate-100 transition-colors">
      
      {/* Top Navigation Bar */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 pb-2">
        <div className="flex items-center justify-between gap-4">
          <button
            id="public-business-back-btn"
            onClick={handleBack}
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer py-1"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Discovery Feed</span>
          </button>

          <button
            id="public-business-share-btn"
            onClick={handleShare}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors cursor-pointer"
            title="Copy link to public profile"
          >
            {copyFeedback ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-600">Copied URL</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5 text-slate-500" />
                <span>Share Profile</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 mt-2">
        <div className="rounded-3xl overflow-hidden border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          
          {/* Cover Photo */}
          <div className="relative w-full h-44 sm:h-64 md:h-72 bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 overflow-hidden">
            {business.coverImageUrl ? (
              <img
                id="public-business-cover"
                src={business.coverImageUrl}
                alt={`${business.name} Cover`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div 
                id="public-business-cover-placeholder" 
                className="w-full h-full flex items-center justify-center text-slate-400 dark:text-slate-600"
              >
                <Building2 className="w-12 h-12 opacity-30" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
          </div>

          {/* Business Identity Header */}
          <div className="px-6 sm:px-8 pb-8 pt-0 relative">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-12 sm:-mt-16 mb-6">
              
              {/* Logo & Core Identity */}
              <div className="flex items-end gap-4">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl border-4 border-white dark:border-slate-900 shadow-md bg-white dark:bg-slate-800 shrink-0 overflow-hidden flex items-center justify-center">
                  {business.logoUrl ? (
                    <img
                      id="public-business-logo"
                      src={business.logoUrl}
                      alt={`${business.name} Logo`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-2xl font-black text-slate-400 dark:text-slate-500">
                      {business.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>

                <div className="mb-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 
                      id="public-business-name" 
                      className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight"
                    >
                      {business.name}
                    </h1>

                    {/* Verification badge ONLY if verified is genuinely true */}
                    {business.isVerified && (
                      <span 
                        id="public-business-verified-badge"
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>Verified Business</span>
                      </span>
                    )}
                  </div>

                  {business.tagline && (
                    <p id="public-business-tagline" className="text-sm font-medium text-slate-600 dark:text-slate-300 mt-1">
                      {business.tagline}
                    </p>
                  )}

                  {/* Categories */}
                  {categoryNames.length > 0 && (
                    <div id="public-business-categories" className="flex flex-wrap items-center gap-1.5 mt-2">
                      {categoryNames.map((label, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                        >
                          {label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Public Contact Quick-Action */}
              {(business.phone || business.email || business.website) && (
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {business.phone && (
                    <a
                      id="public-business-quick-phone"
                      href={`tel:${business.phone}`}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-sm"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>Call Business</span>
                    </a>
                  )}
                  {business.email && (
                    <a
                      id="public-business-quick-email"
                      href={`mailto:${business.email}`}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-colors"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>Send Email</span>
                    </a>
                  )}
                </div>
              )}
            </div>

            <div className="border-t border-slate-100 dark:border-slate-800/60 pt-6">
              
              {/* Business Description Section */}
              {business.description && (
                <div id="public-business-description-section" className="mb-8">
                  <h2 className="text-xs uppercase tracking-wider font-bold text-slate-400 dark:text-slate-500 mb-2">
                    About This Business
                  </h2>
                  <p className="text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                    {business.description}
                  </p>
                </div>
              )}

              {/* Business Details Grid: Location, Hours, Contact */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                
                {/* 1. Location */}
                <div id="public-business-location-card" className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 flex flex-col">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Location
                    </h3>
                  </div>

                  {business.location ? (
                    <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1.5 flex-1">
                      {business.location.isServiceAreaOnly ? (
                        <div className="p-2.5 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900/40">
                          <p className="font-semibold">Service Area Only</p>
                          <p className="mt-0.5">
                            Serving {business.location.city}, {business.location.state}
                            {business.location.serviceAreaKm ? ` within ${business.location.serviceAreaKm} km` : ''}
                          </p>
                        </div>
                      ) : (
                        <>
                          {business.location.address && (
                            <p className="font-medium text-slate-800 dark:text-slate-200">
                              {business.location.address}
                            </p>
                          )}
                          <p>
                            {business.location.city}, {business.location.state}
                          </p>
                          <p className="text-slate-500 dark:text-slate-400">
                            {business.location.country} {business.location.postalCode ? `• ${business.location.postalCode}` : ''}
                          </p>
                        </>
                      )}

                      {/* Map External Search Link */}
                      <div className="pt-2">
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                            [business.location.address, business.location.city, business.location.state, business.location.country]
                              .filter(Boolean)
                              .join(', ')
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 hover:underline font-semibold"
                        >
                          <span>Open in Google Maps</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">No physical location specified.</p>
                  )}
                </div>

                {/* 2. Opening Hours */}
                <div id="public-business-hours-card" className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 flex flex-col">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 flex items-center justify-center shrink-0">
                        <Clock className="w-4 h-4" />
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        Opening Hours
                      </h3>
                    </div>

                    {todayHours && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        todayHours.isOpen 
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' 
                          : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                      }`}>
                        {todayHours.isOpen ? 'Open Today' : 'Closed Today'}
                      </span>
                    )}
                  </div>

                  {business.openingHours && business.openingHours.length > 0 ? (
                    <div className="text-xs space-y-1 flex-1">
                      {DAYS_OF_WEEK.map(day => {
                        const h = business.openingHours?.find(oh => oh.day.toLowerCase() === day.toLowerCase());
                        const isToday = day.toLowerCase() === currentDayName.toLowerCase();
                        return (
                          <div 
                            key={day} 
                            className={`flex items-center justify-between py-1 px-1.5 rounded ${
                              isToday ? 'bg-white dark:bg-slate-700/60 font-semibold text-slate-900 dark:text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            <span className="w-24 shrink-0">{day}</span>
                            <span className="text-right truncate">
                              {h ? formatOpeningHourDisplay(h) : 'Closed'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">No opening hours configured.</p>
                  )}
                </div>

                {/* 3. Business Contact Information */}
                <div id="public-business-contact-card" className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 flex flex-col">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-cyan-100 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-400 flex items-center justify-center shrink-0">
                      <Phone className="w-4 h-4" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Business Contact
                    </h3>
                  </div>

                  {business.phone || business.email || business.website ? (
                    <div className="text-xs space-y-3 flex-1">
                      {business.phone && (
                        <div>
                          <span className="text-[11px] font-semibold text-slate-400 block mb-0.5">Phone Number</span>
                          <a
                            id="public-business-phone-link"
                            href={`tel:${business.phone}`}
                            className="font-medium text-slate-800 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center gap-1.5"
                          >
                            <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{business.phone}</span>
                          </a>
                        </div>
                      )}

                      {business.email && (
                        <div>
                          <span className="text-[11px] font-semibold text-slate-400 block mb-0.5">Official Email</span>
                          <a
                            id="public-business-email-link"
                            href={`mailto:${business.email}`}
                            className="font-medium text-slate-800 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center gap-1.5 break-all"
                          >
                            <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{business.email}</span>
                          </a>
                        </div>
                      )}

                      {business.website && (
                        <div>
                          <span className="text-[11px] font-semibold text-slate-400 block mb-0.5">Official Website</span>
                          <a
                            id="public-business-website-link"
                            href={business.website.startsWith('http') ? business.website : `https://${business.website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1.5 break-all"
                          >
                            <Globe className="w-3.5 h-3.5 shrink-0" />
                            <span>{business.website.replace(/^https?:\/\//i, '')}</span>
                            <ExternalLink className="w-3 h-3 shrink-0 ml-0.5" />
                          </a>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">No contact details published.</p>
                  )}
                </div>

              </div>

            </div>

          </div>

          {/* Platform Identity Footer */}
          <div className="bg-slate-50 dark:bg-slate-950/40 border-t border-slate-100 dark:border-slate-800/60 px-6 sm:px-8 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-400">
            <span>Boost Market Business Presence</span>
            <span>Discover more local businesses on Boost Market</span>
          </div>

        </div>
      </div>

    </div>
  );
};
