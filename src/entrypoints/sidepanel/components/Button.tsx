import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-brand text-white hover:bg-brand-hover active:bg-brand-active disabled:bg-slate-300 disabled:text-slate-500',
  secondary:
    'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 disabled:bg-slate-100 disabled:text-slate-400',
  ghost: 'bg-transparent text-slate-600 hover:bg-slate-200 disabled:text-slate-400',
  danger:
    'bg-red-500 text-white hover:bg-red-600 active:bg-red-700 disabled:bg-slate-300 disabled:text-slate-500',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  children: ReactNode;
}

export function Button({ variant = 'secondary', className = '', children, ...rest }: ButtonProps) {
  return (
    <button
      {...rest}
      className={
        `inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold ` +
        `transition-colors disabled:cursor-not-allowed ${VARIANTS[variant]} ${className}`
      }
    >
      {children}
    </button>
  );
}
