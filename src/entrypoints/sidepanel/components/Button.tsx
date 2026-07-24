import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-[#0066cc] text-white hover:bg-[#0071e3] active:scale-[0.96] shadow-[0_1px_2px_rgba(0,0,0,0.1)] disabled:bg-[#e0e0e0] disabled:text-[#8e8e93] disabled:shadow-none disabled:active:scale-100',
  secondary:
    'bg-white text-[#1d1d1f] border border-[#d2d2d7] hover:bg-[#f5f5f7] hover:border-[#b8b8bd] active:scale-[0.96] shadow-[0_1px_2px_rgba(0,0,0,0.03)] disabled:bg-[#f5f5f7] disabled:text-[#8e8e93] disabled:border-[#e0e0e0] disabled:active:scale-100',
  ghost:
    'bg-transparent text-[#0066cc] hover:bg-black/5 active:scale-[0.96] disabled:text-[#8e8e93] disabled:active:scale-100',
  danger:
    'bg-[#ff3b30] text-white hover:bg-[#d70015] active:scale-[0.96] shadow-[0_1px_2px_rgba(0,0,0,0.1)] disabled:bg-[#e0e0e0] disabled:text-[#8e8e93] disabled:active:scale-100',
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
        `inline-flex items-center justify-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-medium tracking-tight ` +
        `transition-all duration-150 disabled:cursor-not-allowed ${VARIANTS[variant]} ${className}`
      }
    >
      {children}
    </button>
  );
}
