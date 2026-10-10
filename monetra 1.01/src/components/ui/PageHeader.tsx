import React from 'react';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';

interface PageHeaderProps {
  eyebrow: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  return (
    <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="label-mono mb-2 text-fog">{eyebrow}</p>
        <h1 className="font-display text-[30px] leading-[0.95] text-pure sm:text-heading-lg sm:leading-[0.9]">
          {title}
        </h1>
        {description && <p className="mt-2.5 max-w-2xl text-sm leading-relaxed text-ash">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </header>
  );
}

/** Amount display with direction icon; never color-alone (icon + sign). */
export function Amount({
  value,
  type,
  className = '',
}: {
  value: string;
  type: 'income' | 'expense';
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono text-sm tabular-nums ${
        type === 'income' ? 'text-cyan-signal' : 'text-cloud'
      } ${className}`}
    >
      {type === 'income' ? (
        <ArrowDownLeft size={13} aria-hidden />
      ) : (
        <ArrowUpRight size={13} aria-hidden />
      )}
      {value}
    </span>
  );
}
