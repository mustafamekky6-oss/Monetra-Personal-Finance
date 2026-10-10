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
          ? 'rounded-(--radius-card) bg-inverted p-6 text-on-inverted'
          : 'rounded-(--radius-card) bg-card p-6'
      }
    >
      <div className="flex items-center justify-between gap-2">
        <span className={`label-mono ${inverted ? 'text-on-inverted/70' : 'text-body'}`}>{label}</span>
        {icon && <span className={inverted ? 'text-on-inverted/60' : 'text-muted'}>{icon}</span>}
      </div>
      <p
        className={`mt-3 font-mono text-2xl tracking-tight tabular-nums sm:text-[28px] ${
          inverted ? 'text-on-inverted' : 'text-heading'
        }`}
      >
        {typeof value === 'number' ? formatMoney(value, data.preferences.currency) : value}
      </p>
      {pill && (
        <p className={`mt-2 flex items-center gap-1.5 font-mono text-[11px] ${inverted ? 'text-on-inverted/70' : 'text-muted'}`}>
          <PillIcon size={12} aria-hidden />
          <span
            className={
              inverted
                ? pill.text ? 'text-on-inverted' : ''
                : good
                  ? 'text-income'
                  : pill.direction === 'flat'
                    ? 'text-muted'
                    : 'text-expense'
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
