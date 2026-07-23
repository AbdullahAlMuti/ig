import type { ReactNode } from 'react';

interface PanelProps {
  title?: string;
  children: ReactNode;
  className?: string;
}

export function Panel({ title, children, className = '' }: PanelProps) {
  return (
    <section
      className={`rounded-xl border border-slate-200 bg-white p-3 shadow-sm ${className}`}
    >
      {title && <h2 className="mb-2 text-sm font-semibold text-slate-700">{title}</h2>}
      {children}
    </section>
  );
}
