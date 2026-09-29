import React from 'react';
import { Loader2 } from 'lucide-react';

export interface LoadingStateProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading...',
  size = 'md',
  className = ''
}) => {
  const spinnerSize = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  }[size];

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex flex-col items-center justify-center p-8 text-center text-slate-500 dark:text-slate-400 ${className}`}
    >
      <Loader2 className={`${spinnerSize} animate-spin text-[#16C784] mb-2`} />
      {message && (
        <p className="text-xs font-medium tracking-wide">
          {message}
        </p>
      )}
    </div>
  );
};
