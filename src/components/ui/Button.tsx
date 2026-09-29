import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'lime' | 'link';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className = '',
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabled,
      leftIcon,
      rightIcon,
      type = 'button',
      ...props
    },
    ref
  ) => {
    // Variant classes
    const variantClasses = {
      primary: 'bg-[#16C784] hover:bg-[#14B8A6] text-[#071A17] font-bold shadow-[0_4px_16px_rgba(22,199,132,0.3)] hover:shadow-[0_6px_20px_rgba(20,184,166,0.4)] active:scale-[0.98]',
      secondary: 'bg-[#0E322C] hover:bg-[#12423A] text-white border border-[#16C784]/30 hover:border-[#16C784]/60 font-semibold shadow-xs active:scale-[0.98]',
      lime: 'bg-[#A3FF12] hover:bg-[#B9FF38] text-[#071A17] font-bold shadow-[0_4px_16px_rgba(163,255,18,0.3)] hover:shadow-[0_6px_20px_rgba(163,255,18,0.4)] active:scale-[0.98]',
      outline: 'bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 font-semibold active:scale-[0.98]',
      ghost: 'bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-200 font-semibold active:scale-[0.98]',
      destructive: 'bg-rose-600 hover:bg-rose-700 text-white font-semibold shadow-xs active:scale-[0.98]',
      link: 'bg-transparent text-[#16C784] hover:underline p-0 font-medium'
    }[variant];

    // Size classes
    const sizeClasses = {
      xs: 'px-2.5 py-1 text-xs rounded-lg gap-1.5',
      sm: 'px-3 py-1.5 text-xs rounded-xl gap-1.5',
      md: 'px-4 py-2 text-sm rounded-xl gap-2',
      lg: 'px-6 py-3 text-base rounded-2xl gap-2.5'
    }[size];

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={`inline-flex items-center justify-center font-sans tracking-tight transition-all duration-150 select-none cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#16C784] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#071A17] disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none ${variantClasses} ${sizeClasses} ${className}`}
        {...props}
      >
        {isLoading && (
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
        )}
        {!isLoading && leftIcon && (
          <span className="shrink-0">{leftIcon}</span>
        )}
        {children}
        {!isLoading && rightIcon && (
          <span className="shrink-0">{rightIcon}</span>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
