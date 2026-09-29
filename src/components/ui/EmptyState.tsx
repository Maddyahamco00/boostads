import React from 'react';
import { PackageOpen } from 'lucide-react';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className = ''
}) => {
  return (
    <div
      className={`p-8 sm:p-12 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-slate-50/50 dark:bg-[#09221E]/40 flex flex-col items-center justify-center ${className}`}
    >
      <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-[#0B2521] border border-slate-200 dark:border-[#16C784]/20 flex items-center justify-center text-slate-400 dark:text-[#16C784] mb-3">
        {icon || <PackageOpen className="w-6 h-6 stroke-[1.5]" />}
      </div>

      <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-1">
        {title}
      </h4>

      {description && (
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed mb-4">
          {description}
        </p>
      )}

      {action && (
        <div className="mt-2">
          {action}
        </div>
      )}
    </div>
  );
};
