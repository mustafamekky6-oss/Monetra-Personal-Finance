import React from 'react';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { formatDelta } from '@/lib/format';
import { useAppStore } from '@/store/AppStore';
import { formatMoney } from '@/lib/format';

interface StatCardProps {
  label: string;
  value: number | string;
  /** Previous-period value for the comparison pill. */
  compareWith?: number;
  /** When false (e.g. expenses), an increase is rendered as negative. */
  increaseIsGood?: boolean;
  /** Optional manual comparison text overrides the computed delta. */
  compareText?: string;
  icon?: React.ReactNode;
  /** Silver inverted surface — at most one per view. */
  inverted?: boolean;
}

export function StatCard({ label, value, compareWith, increaseIsGood = true, compareText, icon, inverted = false }: StatCardProps) {
  const { data } = useAppStore();
  const numericValue = typeof value === 'number' ? value : null;
  const delta = numericValue !== null && compareWith !== undefined ? formatDelta(numericValue, compareWith) : null;
  const pill =
    compareText !== undefined
      ? { text: compareText, direction: 'flat' as const }
      : delta ?? null;
  const good = pill ? (increaseIsGood ? pill.direction === 'up' : pill.direction === 'down') : false;
  const PillIcon = pill?.direction === 'up' ? TrendingUp : pill?.direction === 'down' ? TrendingDown : Minus;

  return (
    <div
      className={
        inverted
          ? 'rounded-(--radius-card) bg-silver p-6 text-void'
          : 'rounded-(--radius-card) bg-graphite p-6'
      }
    >
      <div className="flex items-center justify-between gap-2">
        <span className={`label-mono ${inverted ? 'text-void/70' : 'text-ash'}`}>{label}</span>
        {icon && <span className={inverted ? 'text-void/60' : 'text-fog'}>{icon}</span>}
      </div>
      <p
        className={`mt-3 font-mono text-2xl tracking-tight tabular-nums sm:text-[28px] ${
          inverted ? 'text-void' : 'text-pure'
        }`}
      >
        {typeof value === 'number' ? formatMoney(value, data.preferences.currency) : value}
      </p>
      {pill && (
        <p className={`mt-2 flex items-center gap-1.5 font-mono text-[11px] ${inverted ? 'text-void/70' : 'text-fog'}`}>
          <PillIcon size={12} aria-hidden />
          <span
            className={
              inverted
                ? pill.text ? 'text-void' : ''
                : good
                  ? 'text-cyan-signal'
                  : pill.direction === 'flat'
                    ? 'text-fog'
                    : 'text-orchid-bloom'
            }
          >
            {pill.text}
          </span>
          <span aria-hidden>·</span>
          <span>vs last month</span>
        </p>
      )}
    </div>
  );
}
