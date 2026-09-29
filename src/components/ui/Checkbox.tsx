import React from 'react';
import { Check } from 'lucide-react';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: React.ReactNode;
  description?: string;
  error?: string | null;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className = '', label, description, error, id, disabled, checked, ...props }, ref) => {
    const checkboxId = id || (typeof label === 'string' ? `checkbox-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

    return (
      <div className="flex items-start gap-2.5 select-none">
        <div className="relative flex items-center justify-center shrink-0 mt-0.5">
          <input
            ref={ref}
            type="checkbox"
            id={checkboxId}
            disabled={disabled}
            checked={checked}
            className="peer sr-only"
            {...props}
          />
          <div
            className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all cursor-pointer peer-disabled:opacity-50 peer-disabled:cursor-not-allowed ${
              checked
                ? 'bg-[#16C784] border-[#16C784] text-[#071A17]'
                : error
                ? 'border-rose-500 bg-white dark:bg-[#0B2521]'
                : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0B2521] peer-hover:border-[#16C784]'
            } peer-focus-visible:ring-2 peer-focus-visible:ring-[#16C784] peer-focus-visible:ring-offset-1`}
          >
            {checked && <Check className="w-3 h-3 stroke-[3]" />}
          </div>
        </div>

        {(label || description) && (
          <div className="flex flex-col text-left">
            {label && (
              <label
                htmlFor={checkboxId}
                className="text-xs font-medium text-slate-800 dark:text-slate-200 cursor-pointer"
              >
                {label}
              </label>
            )}
            {description && (
              <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                {description}
              </span>
            )}
            {error && (
              <span className="text-[11px] font-medium text-rose-600 dark:text-rose-400 mt-0.5">
                {error}
              </span>
            )}
          </div>
        )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';
