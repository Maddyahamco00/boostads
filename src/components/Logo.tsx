import React from 'react';

interface LogoProps {
  variant?: 'full' | 'horizontal' | 'icon' | 'badge';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showTagline?: boolean;
  className?: string;
  onClick?: () => void;
  withGlow?: boolean;
  adminBadge?: boolean;
}

export const BoostSymbol: React.FC<{ size?: number; className?: string }> = ({ size = 32, className = '' }) => {
  return (
    <svg 
      viewBox="0 0 100 100" 
      width={size} 
      height={size} 
      className={`shrink-0 overflow-visible ${className}`}
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="bm-sym-lime-green" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#A3FF12" />
          <stop offset="50%" stopColor="#16C784" />
          <stop offset="100%" stopColor="#14B8A6" />
        </linearGradient>

        <linearGradient id="bm-sym-lime-top" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#C4FF45" />
          <stop offset="100%" stopColor="#16C784" />
        </linearGradient>

        <linearGradient id="bm-sym-teal-bot" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#16C784" />
          <stop offset="100%" stopColor="#14B8A6" />
        </linearGradient>

        <linearGradient id="bm-sym-glow-stroke" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#A3FF12" stopOpacity="0.95" />
          <stop offset="50%" stopColor="#16C784" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#14B8A6" stopOpacity="0.95" />
        </linearGradient>
      </defs>

      {/* Speed Distribution Dots (Network Signal / Distribution) */}
      <circle cx="20" cy="24" r="5.5" fill="#A3FF12" />
      <circle cx="10" cy="42" r="5" fill="#A3FF12" />
      <circle cx="20" cy="60" r="4.5" fill="#16C784" />
      <circle cx="34" cy="84" r="5.5" fill="#14B8A6" />

      {/* Streamlined Speed Capsules */}
      <rect x="32" y="19" width="22" height="10" rx="5" fill="url(#bm-sym-lime-top)" />
      <rect x="22" y="37" width="36" height="10" rx="5" fill="#16C784" />
      <rect x="30" y="55" width="28" height="10" rx="5" fill="url(#bm-sym-lime-green)" />
      <rect x="28" y="73" width="18" height="10" rx="5" fill="url(#bm-sym-teal-bot)" />

      {/* Main Stylized 'B' Structure */}
      {/* Top Lobe */}
      <path 
        d="M 48 19 L 66 19 C 78 19 86 26 86 38 C 86 48 80 54 68 56 L 48 56 Z" 
        fill="url(#bm-sym-lime-top)" 
      />
      {/* Top Inner Hole */}
      <path 
        d="M 56 27 L 66 27 C 72 27 77 31 77 38 C 77 45 72 48 66 48 L 56 48 Z" 
        fill="#071A17" 
      />

      {/* Bottom Lobe */}
      <path 
        d="M 48 48 L 70 48 C 84 48 92 56 92 69 C 92 82 80 88 66 88 L 48 88 Z" 
        fill="url(#bm-sym-teal-bot)" 
      />
      {/* Bottom Inner Hole */}
      <path 
        d="M 56 56 L 67 56 C 75 56 81 61 81 69 C 81 77 75 80 67 80 L 56 80 Z" 
        fill="#071A17" 
      />

      {/* Dynamic Highlight Ribbon on Spine */}
      <path 
        d="M 66 19 C 79 19 86 26 86 38 C 86 46 81 52 73 54 C 85 57 92 64 92 73 C 92 84 81 88 66 88" 
        stroke="url(#bm-sym-glow-stroke)" 
        strokeWidth="2" 
        strokeLinecap="round" 
        fill="none" 
      />
    </svg>
  );
};

export const Logo: React.FC<LogoProps> = ({
  variant = 'horizontal',
  size = 'md',
  showTagline = false,
  className = '',
  onClick,
  withGlow = false,
  adminBadge = false
}) => {
  const iconPixelSize = {
    xs: 20,
    sm: 26,
    md: 34,
    lg: 44,
    xl: 64
  }[size];

  // 1. ICON ONLY VARIANT
  if (variant === 'icon') {
    return (
      <div 
        onClick={onClick}
        className={`inline-flex items-center justify-center relative ${onClick ? 'cursor-pointer' : ''} ${className}`}
        title="Boost Market"
      >
        <div className={`relative flex items-center justify-center rounded-xl p-1.5 bg-[#071A17] border border-[#16C784]/30 shadow-xs ${withGlow ? 'shadow-[0_0_16px_rgba(22,199,132,0.4)]' : ''}`}>
          <BoostSymbol size={iconPixelSize} />
        </div>
      </div>
    );
  }

  // 2. FULL 3D GLASSMORPHIC TILE (Matches Prototype Reference file_0000000084f4820a8c55c8e89e59ab16.png)
  if (variant === 'badge') {
    return (
      <div 
        onClick={onClick}
        className={`relative inline-flex flex-col items-center justify-center text-center select-none ${onClick ? 'cursor-pointer' : ''} ${className}`}
      >
        {/* Luminous Ambient Glow */}
        <div className="absolute -inset-2 bg-gradient-to-b from-[#A3FF12]/25 via-[#16C784]/20 to-[#14B8A6]/25 rounded-3xl blur-2xl opacity-75 pointer-events-none" />

        {/* Outer Translucent Glass Container */}
        <div className="relative w-full max-w-[360px] p-8 sm:p-10 rounded-[32px] bg-[#071A17]/95 backdrop-blur-2xl border border-[#16C784]/40 shadow-[0_20px_50px_rgba(0,0,0,0.8)] flex flex-col items-center overflow-hidden">
          {/* Subtle Diagonal Glass Highlight */}
          <div className="absolute -top-10 -left-10 w-48 h-48 bg-white/5 rounded-full blur-xl pointer-events-none" />
          <div className="absolute top-0 inset-x-8 h-px bg-gradient-to-r from-transparent via-[#A3FF12]/60 to-transparent" />
          
          {/* Symbol Centerpiece */}
          <div className="mb-6 relative">
            <div className="absolute inset-0 bg-[#16C784]/25 blur-xl rounded-full" />
            <BoostSymbol size={size === 'xl' ? 96 : size === 'lg' ? 80 : 68} className="relative z-10" />
          </div>

          {/* BOOST MARKET Wordmark */}
          <div className="flex items-center justify-center gap-2.5 tracking-tight mb-2">
            <span className="text-3xl sm:text-4xl font-black text-white tracking-tight font-sans drop-shadow-sm">
              BOOST
            </span>
            <span className="text-3xl sm:text-4xl font-black text-[#16C784] tracking-tight font-sans drop-shadow-sm">
              MARKET
            </span>
          </div>

          {/* Subtitle with Flanking Rules */}
          <div className="w-full pt-3 mt-1 flex items-center justify-center gap-3">
            <span className="h-[1.5px] w-6 sm:w-8 bg-[#A3FF12]/80 rounded-full" />
            <span className="text-[11px] sm:text-xs font-semibold text-slate-200 tracking-wide">
              AI-Powered Advertising Agent
            </span>
            <span className="h-[1.5px] w-6 sm:w-8 bg-[#A3FF12]/80 rounded-full" />
          </div>

          {adminBadge && (
            <div className="mt-3 px-3 py-0.5 rounded-full bg-[#16C784]/20 border border-[#16C784]/40 text-[#A3FF12] text-[10px] font-bold tracking-wider uppercase">
              Super Admin Console
            </div>
          )}
        </div>
      </div>
    );
  }

  // 3. HORIZONTAL LOGO (For Headers, Navbars, Footers, Modals)
  return (
    <div 
      onClick={onClick}
      className={`inline-flex items-center gap-3 select-none ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {/* Icon Emblem with Glass Frame */}
      <div className="relative flex items-center justify-center p-1.5 sm:p-2 rounded-xl bg-[#071A17] border border-[#16C784]/30 shadow-xs shrink-0">
        <BoostSymbol size={iconPixelSize} />
      </div>

      {/* Brand Text */}
      <div className="flex flex-col">
        <div className="flex items-center gap-1.5 leading-none">
          <span className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight font-sans">
            BOOST
          </span>
          <span className="text-lg sm:text-xl font-black text-[#16C784] tracking-tight font-sans">
            MARKET
          </span>
          {adminBadge && (
            <span className="ml-1.5 px-2 py-0.5 rounded-md bg-[#071A17] text-[#A3FF12] text-[10px] font-extrabold border border-[#16C784]/40 tracking-wider">
              ADMIN
            </span>
          )}
        </div>
        {showTagline && (
          <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 tracking-wide mt-1">
            AI-Powered Advertising Agent
          </span>
        )}
      </div>
    </div>
  );
};
