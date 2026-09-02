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
        <linearGradient id="sym-lime-green" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#A3FF12" />
          <stop offset="45%" stopColor="#16C784" />
          <stop offset="100%" stopColor="#14B8A6" />
        </linearGradient>

        <linearGradient id="sym-lime-top" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#D4FF5E" />
          <stop offset="100%" stopColor="#16C784" />
        </linearGradient>

        <linearGradient id="sym-teal-bot" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#16C784" />
          <stop offset="100%" stopColor="#0F766E" />
        </linearGradient>

        <linearGradient id="sym-glow-stroke" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#A3FF12" stopOpacity="0.8" />
          <stop offset="50%" stopColor="#16C784" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#14B8A6" stopOpacity="0.8" />
        </linearGradient>
      </defs>

      {/* Speed Dots (Left Side) */}
      <circle cx="20" cy="24" r="5" fill="#A3FF12" />
      <circle cx="10" cy="42" r="4.5" fill="#A3FF12" />
      <circle cx="20" cy="60" r="4" fill="#16C784" />
      <circle cx="34" cy="84" r="5" fill="#14B8A6" />

      {/* Streamlined Speed Capsules */}
      <rect x="32" y="19" width="22" height="10" rx="5" fill="url(#sym-lime-top)" />
      <rect x="22" y="37" width="36" height="10" rx="5" fill="#16C784" />
      <rect x="30" y="55" width="28" height="10" rx="5" fill="url(#sym-lime-green)" />
      <rect x="28" y="73" width="18" height="10" rx="5" fill="url(#sym-teal-bot)" />

      {/* Main Stylized 'B' Structure */}
      {/* Top Lobe */}
      <path 
        d="M 48 19 L 66 19 C 78 19 86 26 86 38 C 86 48 80 54 68 56 L 48 56 Z" 
        fill="url(#sym-lime-top)" 
      />
      {/* Top Inner Hole */}
      <path 
        d="M 56 27 L 66 27 C 72 27 77 31 77 38 C 77 45 72 48 66 48 L 56 48 Z" 
        fill="#071A17" 
      />

      {/* Bottom Lobe */}
      <path 
        d="M 48 48 L 70 48 C 84 48 92 56 92 69 C 92 82 80 88 66 88 L 48 88 Z" 
        fill="url(#sym-teal-bot)" 
      />
      {/* Bottom Inner Hole */}
      <path 
        d="M 56 56 L 67 56 C 75 56 81 61 81 69 C 81 77 75 80 67 80 L 56 80 Z" 
        fill="#071A17" 
      />

      {/* Dynamic 3D Highlight Stroke on Backbone */}
      <path 
        d="M 66 19 C 79 19 86 26 86 38 C 86 46 81 52 73 54 C 85 57 92 64 92 73 C 92 84 81 88 66 88" 
        stroke="url(#sym-glow-stroke)" 
        strokeWidth="1.5" 
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
  // Size mapping for Icon / Symbols
  const iconPixelSize = {
    xs: 20,
    sm: 26,
    md: 34,
    lg: 44,
    xl: 64
  }[size];

  // 1. ICON ONLY VARIANT (For small spaces, mobile navigation, favicon representation)
  if (variant === 'icon') {
    return (
      <div 
        onClick={onClick}
        className={`inline-flex items-center justify-center relative ${onClick ? 'cursor-pointer' : ''} ${className}`}
        title="Boost Market"
      >
        <div className={`relative flex items-center justify-center rounded-xl p-1.5 bg-[#071A17] border border-[#16C784]/40 shadow-sm ${withGlow ? 'shadow-[0_0_15px_rgba(22,199,132,0.3)]' : ''}`}>
          <BoostSymbol size={iconPixelSize} />
        </div>
      </div>
    );
  }

  // 2. FULL GLASSMORPHIC BADGE (Identical to Official Brand Reference Image)
  if (variant === 'badge') {
    return (
      <div 
        onClick={onClick}
        className={`relative inline-flex flex-col items-center justify-center text-center select-none ${onClick ? 'cursor-pointer' : ''} ${className}`}
      >
        {/* Luminous Brand Ambient Glow */}
        <div className="absolute -inset-1 bg-gradient-to-b from-[#A3FF12]/20 via-[#16C784]/20 to-[#14B8A6]/20 rounded-3xl blur-xl opacity-80" />

        {/* Outer Glass Card Container */}
        <div className="relative w-full max-w-[340px] px-8 py-7 rounded-3xl bg-[#071A17]/95 backdrop-blur-xl border border-[#16C784]/30 shadow-2xl shadow-black/60 flex flex-col items-center">
          
          {/* Top Subtle Inner Glass Highlight */}
          <div className="absolute top-0 inset-x-8 h-px bg-gradient-to-r from-transparent via-[#A3FF12]/50 to-transparent" />
          
          {/* Symbol in Center */}
          <div className="mb-4 relative">
            <div className="absolute inset-0 bg-[#16C784]/30 blur-lg rounded-full" />
            <BoostSymbol size={size === 'xl' ? 90 : size === 'lg' ? 76 : 64} className="relative z-10" />
          </div>

          {/* Typography: BOOST MARKET */}
          <div className="flex items-center justify-center gap-2.5 tracking-tight mb-2">
            <span className="text-2xl sm:text-3xl font-black text-white tracking-tight drop-shadow-sm font-sans">
              BOOST
            </span>
            <span className="text-2xl sm:text-3xl font-black text-[#A3FF12] tracking-tight drop-shadow-sm font-sans">
              MARKET
            </span>
          </div>

          {/* Tagline / Subtitle */}
          {showTagline && (
            <div className="w-full pt-3 mt-1 border-t border-[#16C784]/20 flex items-center justify-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#A3FF12] shadow-[0_0_6px_#A3FF12]" />
              <span className="text-[11px] font-semibold text-[#14B8A6] tracking-wider uppercase">
                AI-Powered Advertising Agent
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#14B8A6] shadow-[0_0_6px_#14B8A6]" />
            </div>
          )}

          {adminBadge && (
            <div className="mt-2.5 px-2.5 py-0.5 rounded-full bg-[#16C784]/15 border border-[#16C784]/40 text-[#A3FF12] text-[10px] font-bold tracking-wider uppercase">
              Super Admin Console
            </div>
          )}
        </div>
      </div>
    );
  }

  // 3. HORIZONTAL LOGO (For Headers, Top Navbars, Footers, Modals)
  return (
    <div 
      onClick={onClick}
      className={`inline-flex items-center gap-3 select-none ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {/* Icon Emblem with Glass Pill Frame */}
      <div className="relative flex items-center justify-center p-1.5 rounded-xl bg-[#071A17] border border-[#16C784]/35 shadow-xs shrink-0">
        <BoostSymbol size={iconPixelSize} />
      </div>

      {/* Brand Text */}
      <div className="flex flex-col">
        <div className="flex items-center gap-1.5 leading-none">
          <span className="text-lg sm:text-xl font-black text-gray-900 tracking-tight font-sans">
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
          <span className="text-[10px] font-semibold text-[#14B8A6] tracking-wide mt-1">
            AI-Powered Advertising Agent
          </span>
        )}
      </div>
    </div>
  );
};
