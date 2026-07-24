import type { ReactNode } from 'react';

interface PanelProps {
  title?: string;
  children: ReactNode;
  className?: string;
}

export function Panel({ title, children, className = '' }: PanelProps) {
  return (
    <section
      className={`rounded-2xl border border-[#e5e5e7] bg-white p-3.5 shadow-[0_2px_8px_rgba(0,0,0,0.03)] transition-shadow duration-200 ${className}`}
    >
      {title && (
        <h2 className="mb-2.5 text-[12px] font-semibold tracking-tight text-[#8e8e93] uppercase">
          {title}
        </h2>
      )}
      {children}
    </section>
  );
}
