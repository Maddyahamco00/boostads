'use client';

import React, { useState } from 'react';
import { 
  Flame, 
  MapPin, 
  Phone, 
  MessageSquare, 
  Share2, 
  Heart, 
  Eye, 
  ExternalLink, 
  CheckCircle2, 
  Sparkles,
  ArrowUpRight,
  Bookmark
} from 'lucide-react';
import { Advertisement, Business } from '../types';
import { useApp } from '../context/AppContext';

interface AdvertisementCardProps {
  ad: Advertisement;
  business?: Business;
  onViewBusiness?: (businessId: string) => void;
  featured?: boolean;
}

export const AdvertisementCard: React.FC<AdvertisementCardProps> = ({ 
  ad, 
  business, 
  onViewBusiness,
  featured = false 
}) => {
  const { setActiveView, viewBusinessDetail, currentLocation } = useApp();
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [likesCount, setLikesCount] = useState(Math.floor((ad.clicksCount || 12) * 1.5) + (ad.isBoosted ? 24 : 5));
  const [copied, setCopied] = useState(false);

  const isBoosted = ad.isBoosted || featured;
  const primaryMedia = ad.mediaUrls?.[0] || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&auto=format&fit=crop&q=80';

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLiked) {
      setLikesCount(prev => prev - 1);
      setIsLiked(false);
    } else {
      setLikesCount(prev => prev + 1);
      setIsLiked(true);
    }
  };

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsSaved(!isSaved);
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareData = {
      title: ad.title,
      text: `${ad.title} by ${ad.businessName} on Boost Market`,
      url: typeof window !== 'undefined' ? `${window.location.origin}/?ad=${ad.id}` : ''
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // User cancelled or unsupported
      }
    } else if (navigator.clipboard) {
      await navigator.clipboard.writeText(shareData.url || window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleOpenBusiness = () => {
    if (onViewBusiness) {
      onViewBusiness(ad.businessId);
    } else {
      viewBusinessDetail(ad.businessId);
    }
  };

  const handleWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    const phone = ad.contactWhatsApp || business?.whatsapp || '+2348039876543';
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const message = encodeURIComponent(`Hello ${ad.businessName}, I saw your advertisement "${ad.title}" on Boost Market and would like to inquire.`);
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank', 'noopener,noreferrer');
  };

  const handleCall = (e: React.MouseEvent) => {
    e.stopPropagation();
    const phone = ad.contactPhone || business?.phone || '+2348039876543';
    window.open(`tel:${phone}`, '_self');
  };

  return (
    <article 
      id={`ad-card-${ad.id}`}
      onClick={handleOpenBusiness}
      className={`group relative flex flex-col rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 ${
        isBoosted
          ? 'glass-card border-indigo-400/40 dark:border-indigo-500/40 shadow-lg shadow-indigo-500/5 hover:shadow-indigo-500/15'
          : 'glass-card hover:border-slate-300 dark:hover:border-slate-700'
      }`}
    >
      {/* Top Promoted Aura / Gradient Accent */}
      {isBoosted && (
        <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400" />
      )}

      {/* Card Header: Business Identity & Verification */}
      <div className="p-4 flex items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80 bg-white/50 dark:bg-slate-900/40">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 shrink-0">
            <img 
              src={ad.businessLogo || business?.logoUrl || 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=100&auto=format&fit=crop&q=80'} 
              alt={ad.businessName}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                {ad.businessName}
              </h3>
              <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 dark:text-cyan-400 shrink-0" />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 capitalize truncate">
              {ad.category || ad.businessCategory || 'Business'}
            </p>
          </div>
        </div>

        {/* Promotion Status Badge */}
        {isBoosted ? (
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-xs">
            <Sparkles className="w-3 h-3 text-cyan-200" />
            <span>Promoted</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800">
            <span>Verified Ad</span>
          </div>
        )}
      </div>

      {/* Main Visual Media Container */}
      <div className="relative w-full aspect-video sm:aspect-4/3 bg-slate-950 overflow-hidden">
        <img 
          src={primaryMedia} 
          alt={ad.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        
        {/* Soft Glass Dark Gradient Overlay for Legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-black/20 pointer-events-none" />

        {/* Price / Offer Tag Floating Overlay */}
        {ad.price ? (
          <div className="absolute bottom-3 left-3 px-3 py-1.5 rounded-xl bg-slate-900/90 backdrop-blur-md border border-white/20 text-white shadow-lg">
            <span className="text-xs text-slate-300 font-medium">From </span>
            <span className="text-sm font-extrabold text-cyan-300">
              {ad.currency || '₦'}{Number(ad.price).toLocaleString()}
            </span>
          </div>
        ) : (
          <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-lg bg-indigo-600/90 backdrop-blur-md border border-white/20 text-white text-xs font-semibold shadow-md flex items-center gap-1">
            <Flame className="w-3 h-3 text-amber-300" />
            <span>Special Promotion</span>
          </div>
        )}

        {/* Quick Action Floating Controls (Like & Save) */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
          <button 
            type="button"
            onClick={handleLike}
            className={`p-2 rounded-full backdrop-blur-md border transition-all duration-200 cursor-pointer ${
              isLiked 
                ? 'bg-rose-500 text-white border-rose-400 shadow-md scale-110' 
                : 'bg-slate-900/60 text-white/90 border-white/20 hover:bg-slate-900/90 hover:text-white'
            }`}
            title="Like this advertisement"
          >
            <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
          </button>
          <button 
            type="button"
            onClick={handleSave}
            className={`p-2 rounded-full backdrop-blur-md border transition-all duration-200 cursor-pointer ${
              isSaved 
                ? 'bg-indigo-600 text-white border-indigo-400 shadow-md' 
                : 'bg-slate-900/60 text-white/90 border-white/20 hover:bg-slate-900/90 hover:text-white'
            }`}
            title="Save for later"
          >
            <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
          </button>
        </div>

        {/* Views & Reach Metric Badge */}
        <div className="absolute top-3 left-3 flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-900/70 backdrop-blur-md text-[11px] font-medium text-slate-200 border border-white/10">
          <Eye className="w-3 h-3 text-cyan-400" />
          <span>{Number(ad.viewsCount || 140).toLocaleString()} views</span>
        </div>
      </div>

      {/* Advertisement Content & Information */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Ad Title */}
          <h4 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-snug tracking-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-2">
            {ad.title}
          </h4>

          {/* Description */}
          <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
            {ad.description}
          </p>

          {/* Location & Tags */}
          <div className="mt-3.5 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
              <MapPin className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
              <span>{ad.location?.city || currentLocation?.city || 'Nigeria'}</span>
            </div>

            {ad.tags && ad.tags.slice(0, 2).map((t, idx) => (
              <span 
                key={idx} 
                className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[11px] text-slate-600 dark:text-slate-300 font-medium"
              >
                #{t}
              </span>
            ))}
          </div>
        </div>

        {/* Footer Actions: Primary WhatsApp / Phone / Share & Detail */}
        <div className="mt-5 pt-3.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
          
          {/* Direct WhatsApp CTA */}
          <button
            type="button"
            onClick={handleWhatsApp}
            className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 transition-all shadow-xs hover:shadow-emerald-600/20 cursor-pointer"
            title="Chat directly with advertiser on WhatsApp"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>WhatsApp</span>
          </button>

          {/* Call Button */}
          <button
            type="button"
            onClick={handleCall}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
            title="Call advertiser"
          >
            <Phone className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </button>

          {/* Share Button */}
          <button
            type="button"
            onClick={handleShare}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer relative"
            title="Share advertisement"
          >
            <Share2 className="w-4 h-4 text-slate-500" />
            {copied && (
              <span className="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-slate-900 text-white text-[10px] font-bold whitespace-nowrap shadow-md">
                Link Copied!
              </span>
            )}
          </button>

          {/* View Details Link */}
          <button
            type="button"
            onClick={handleOpenBusiness}
            className="py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
          >
            <span>View</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-slate-500" />
          </button>
        </div>
      </div>
    </article>
  );
};
