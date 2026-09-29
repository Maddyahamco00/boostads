import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'verified' | 'warning' | 'destructive' | 'lime' | 'outline';
  size?: 'xs' | 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  className = '',
  variant = 'default',
  size = 'sm',
  ...props
}) => {
  const variantClasses = {
    default: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700',
    success: 'bg-emerald-50 dark:bg-[#16C784]/15 text-emerald-700 dark:text-[#16C784] border border-emerald-200 dark:border-[#16C784]/30',
    verified: 'bg-[#16C784]/15 text-[#16C784] border border-[#16C784]/30 font-bold',
    lime: 'bg-[#A3FF12]/15 text-[#A3FF12] border border-[#A3FF12]/30 font-bold',
    warning: 'bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30',
    destructive: 'bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30',
    outline: 'bg-transparent text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700'
  }[variant];

  const sizeClasses = {
    xs: 'px-1.5 py-0.2 text-[10px] rounded-md gap-1',
    sm: 'px-2.5 py-0.5 text-xs rounded-full gap-1.5',
    md: 'px-3 py-1 text-xs rounded-full gap-2'
  }[size];

  return (
    <span
      className={`inline-flex items-center font-medium font-sans tracking-tight select-none ${variantClasses} ${sizeClasses} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};
