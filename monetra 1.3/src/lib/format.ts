import type { CurrencyCode } from '@/types';

const CURRENCY_LOCALE: Record<CurrencyCode, string> = {
  USD: 'en-US',
  EUR: 'de-DE',
  GBP: 'en-GB',
  JPY: 'ja-JP',
  CNY: 'zh-CN',
};

/**
 * Formats a money value. Changing the display currency never converts amounts —
 * it only changes the symbol/position, per the settings contract.
 */
export function formatMoney(value: number, currency: CurrencyCode, options?: { compact?: boolean; signed?: boolean }): string {
  const formatter = new Intl.NumberFormat(CURRENCY_LOCALE[currency], {
    style: 'currency',
    currency,
    maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
    minimumFractionDigits: 0,
    notation: options?.compact ? 'compact' : 'standard',
  });
  const formatted = formatter.format(Math.abs(value));
  if (options?.signed && value !== 0) return `${value > 0 ? '+' : '−'}${formatted}`;
  return value < 0 ? `−${formatted}` : formatted;
}

export function formatPercent(value: number, digits = 0): string {
  if (!Number.isFinite(value)) return '—';
  return `${value.toFixed(digits)}%`;
}

/** Month-over-month style change: safe against zero denominators. */
export function formatDelta(current: number, previous: number): { text: string; direction: 'up' | 'down' | 'flat' } {
  if (previous === 0) {
    if (current === 0) return { text: 'No change', direction: 'flat' };
    return { text: 'No prior data', direction: 'flat' };
  }
  const pct = ((current - previous) / Math.abs(previous)) * 100;
  const sign = pct > 0 ? '+' : '';
  return { text: `${sign}${pct.toFixed(1)}%`, direction: pct > 0.05 ? 'up' : pct < -0.05 ? 'down' : 'flat' };
}
