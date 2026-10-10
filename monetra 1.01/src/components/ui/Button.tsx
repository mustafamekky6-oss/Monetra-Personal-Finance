import React from 'react';
import { ArrowRight } from 'lucide-react';

type Variant = 'primary' | 'ghost' | 'glass' | 'danger';
type Size = 'sm' | 'md';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  /** Primary CTAs carry a trailing arrow per the design system. */
  withArrow?: boolean;
}

const VARIANT_CLASS: Record<Variant, string> = {
  // White-on-black is the only primary action (21:1 contrast).
  primary:
    'bg-pure text-void hover:bg-cloud disabled:hover:bg-pure',
  ghost:
    'bg-transparent text-pure border border-pure/60 hover:bg-white/10 disabled:opacity-50',
  glass:
    'bg-white/10 text-pure border border-white/15 hover:bg-white/20 disabled:opacity-50',
  danger:
    'bg-transparent text-orchid-bloom border border-orchid-bloom/50 hover:bg-orchid-bloom/10 disabled:opacity-50',
};

const SIZE_CLASS: Record<Size, string> = {
  sm: 'text-sm px-3.5 py-1.5 gap-1.5',
  md: 'text-base px-[18px] py-3 gap-2',
};

export function Button({
  variant = 'primary',
  size = 'md',
  withArrow = false,
  className = '',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-(--radius-button) font-sans font-normal transition-colors duration-200 ease-out disabled:cursor-not-allowed disabled:opacity-60 ${VARIANT_CLASS[variant]} ${SIZE_CLASS[size]} ${className}`}
      {...props}
    >
      {children}
      {withArrow && variant === 'primary' && <ArrowRight size={16} aria-hidden />}
    </button>
  );
}
