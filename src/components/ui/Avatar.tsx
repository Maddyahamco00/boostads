import React, { useState } from 'react';
import { User, Building2 } from 'lucide-react';

export interface AvatarProps {
  src?: string | null;
  name?: string;
  isBusiness?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  status?: 'online' | 'offline' | 'verified';
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  name,
  isBusiness = false,
  size = 'md',
  status,
  className = ''
}) => {
  const [hasError, setHasError] = useState(false);

  const sizeClasses = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-14 h-14 text-lg',
    xl: 'w-20 h-20 text-2xl'
  }[size];

  const getInitials = (str?: string) => {
    if (!str) return '';
    return str
      .split(' ')
      .slice(0, 2)
      .map(part => part.charAt(0).toUpperCase())
      .join('');
  };

  const initials = getInitials(name);

  return (
    <div className={`relative inline-flex shrink-0 ${className}`}>
      <div
        className={`rounded-full overflow-hidden flex items-center justify-center font-bold select-none border border-slate-200 dark:border-[#16C784]/30 ${
          src && !hasError
            ? 'bg-slate-100 dark:bg-slate-800'
            : 'bg-gradient-to-tr from-[#16C784] to-[#14B8A6] text-[#071A17]'
        } ${sizeClasses}`}
      >
        {src && !hasError ? (
          <img
            src={src}
            alt={name || 'Avatar'}
            onError={() => setHasError(true)}
            className="w-full h-full object-cover"
          />
        ) : initials ? (
          <span>{initials}</span>
        ) : isBusiness ? (
          <Building2 className="w-1/2 h-1/2 opacity-75" />
        ) : (
          <User className="w-1/2 h-1/2 opacity-75" />
        )}
      </div>

      {status && (
        <span
          className={`absolute bottom-0 right-0 rounded-full ring-2 ring-white dark:ring-[#071A17] ${
            size === 'xs' || size === 'sm' ? 'w-2 h-2' : 'w-3 h-3'
          } ${
            status === 'online' || status === 'verified'
              ? 'bg-[#16C784]'
              : 'bg-slate-400'
          }`}
        />
      )}
    </div>
  );
};
