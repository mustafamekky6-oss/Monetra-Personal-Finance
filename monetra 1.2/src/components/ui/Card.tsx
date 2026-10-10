import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Graphite (default) or Abyss for stacked sections inside cards. */
  surface?: 'graphite' | 'abyss' | 'plain';
  padding?: 'none' | 'md' | 'lg';
}

const SURFACE_CLASS = {
  graphite: 'bg-card',
  abyss: 'bg-inset',
  plain: 'bg-transparent border-lift/8',
} as const;

const PADDING_CLASS = {
  none: '',
  md: 'p-5 sm:p-6',
  lg: 'p-6 sm:p-8',
} as const;

/** Flat elevation system: surfaces differ by color step, never by shadow. */
export function Card({ surface = 'graphite', padding = 'md', className = '', children, ...props }: CardProps) {
  return (
    <div
      className={`rounded-(--radius-card) ${SURFACE_CLASS[surface]} ${PADDING_CLASS[padding]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-5 flex items-start justify-between gap-4">
      <div>
        <h2 className="font-display text-[22px] leading-tight text-heading sm:text-[26px]">{title}</h2>
        {subtitle && <p className="mt-1 text-sm leading-relaxed text-body">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
