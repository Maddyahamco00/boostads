import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'glass' | 'interactive';
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className = '', variant = 'default', children, ...props }, ref) => {
    const variantClasses = {
      default: 'bg-white dark:bg-[#09221E] border border-slate-200 dark:border-[#16C784]/20 shadow-xs',
      glass: 'bg-white/90 dark:bg-[#09221E]/90 backdrop-blur-xl border border-slate-200/90 dark:border-[#16C784]/25 shadow-lg',
      interactive: 'bg-white dark:bg-[#09221E] border border-slate-200 dark:border-[#16C784]/25 hover:border-[#16C784] hover:shadow-lg dark:hover:border-[#A3FF12]/60 transition-all duration-200 cursor-pointer'
    }[variant];

    return (
      <div
        ref={ref}
        className={`rounded-2xl overflow-hidden ${variantClasses} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Card.displayName = 'Card';

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className = '',
  children,
  ...props
}) => (
  <div className={`p-5 sm:p-6 pb-3 ${className}`} {...props}>
    {children}
  </div>
);

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({
  className = '',
  children,
  ...props
}) => (
  <h3 className={`text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight ${className}`} {...props}>
    {children}
  </h3>
);

export const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({
  className = '',
  children,
  ...props
}) => (
  <p className={`text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed ${className}`} {...props}>
    {children}
  </p>
);

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className = '',
  children,
  ...props
}) => (
  <div className={`p-5 sm:p-6 pt-0 ${className}`} {...props}>
    {children}
  </div>
);

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className = '',
  children,
  ...props
}) => (
  <div className={`p-5 sm:p-6 pt-0 border-t border-slate-100 dark:border-[#16C784]/15 mt-4 flex items-center ${className}`} {...props}>
    {children}
  </div>
);
