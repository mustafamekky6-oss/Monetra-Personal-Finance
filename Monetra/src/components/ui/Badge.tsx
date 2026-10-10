import React from 'react';

type BadgeTone = 'neutral' | 'income' | 'expense' | 'warning' | 'critical' | 'positive' | 'chromatic';

const TONE_CLASS: Record<BadgeTone, string> = {
  neutral: 'bg-white/8 text-ash border-white/12',
  income: 'bg-cyan-signal/12 text-cyan-signal border-cyan-signal/30',
  expense: 'bg-orchid-bloom/12 text-orchid-bloom border-orchid-bloom/30',
  warning: 'bg-pale-iris/12 text-pale-iris border-pale-iris/30',
  critical: 'bg-orchid-bloom/20 text-orchid-bloom border-orchid-bloom/50',
  positive: 'bg-cyan-signal/12 text-cyan-signal border-cyan-signal/30',
  chromatic: 'bg-iris-gleam/15 text-pale-iris border-iris-gleam/35',
};

/** Monospace micro badge — pairs an icon or text dot with a label. */
export function Badge({
  tone = 'neutral',
  icon,
  children,
  className = '',
}: {
  tone?: BadgeTone;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] tracking-[0.16em] uppercase ${TONE_CLASS[tone]} ${className}`}
    >
      {icon}
      {children}
    </span>
  );
}
