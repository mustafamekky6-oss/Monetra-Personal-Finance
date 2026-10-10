/** Date helpers. All functions treat dates as plain 'yyyy-MM-dd' strings so the
 *  domain layer never depends on timezone-sensitive Date parsing of ISO strings. */

export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Parses 'yyyy-MM-dd' as a local Date at midnight. Returns null when invalid. */
export function parseISODate(iso: string): Date | null {
  if (typeof iso !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  // Reject e.g. '2026-02-31'
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
  return date;
}

export function isValidISODate(iso: string): boolean {
  return parseISODate(iso) !== null;
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function addDays(iso: string, days: number): string {
  const date = parseISODate(iso);
  if (!date) return iso;
  date.setDate(date.getDate() + days);
  return toISODate(date);
}

export function addMonths(iso: string, months: number): string {
  const date = parseISODate(iso);
  if (!date) return iso;
  const day = date.getDate();
  date.setDate(1);
  date.setMonth(date.getMonth() + months);
  // Clamp to end-of-month (e.g. Jan 31 + 1 month → Feb 28)
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  date.setDate(Math.min(day, lastDay));
  return toISODate(date);
}

export function diffDays(fromISO: string, toISOStr: string): number {
  const a = parseISODate(fromISO);
  const b = parseISODate(toISOStr);
  if (!a || !b) return 0;
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

/** Whole months between two dates (positive when `to` is after `from`). */
export function diffMonths(fromISO: string, toISOStr: string): number {
  const a = parseISODate(fromISO);
  const b = parseISODate(toISOStr);
  if (!a || !b) return 0;
  const months =
    (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
  const partial = b.getDate() < a.getDate() ? -1 : 0;
  return months + partial;
}

export function isWithin(iso: string, start: string, end: string): boolean {
  return iso >= start && iso <= end;
}

/** Financial month containing `iso`, given the day the month starts (1–28). */
export function financialMonthRange(iso: string, monthStartDay: number): { start: string; end: string } {
  const date = parseISODate(iso);
  if (!date) return { start: iso, end: iso };
  const day = date.getDate();
  const startDay = Math.min(Math.max(monthStartDay, 1), 28);
  let start: Date;
  if (day >= startDay) {
    start = new Date(date.getFullYear(), date.getMonth(), startDay);
  } else {
    start = new Date(date.getFullYear(), date.getMonth() - 1, startDay);
  }
  const end = new Date(start.getFullYear(), start.getMonth() + 1, startDay - 1);
  return { start: toISODate(start), end: toISODate(end) };
}

export function monthRange(year: number, monthIndex0: number): { start: string; end: string } {
  const start = new Date(year, monthIndex0, 1);
  const end = new Date(year, monthIndex0 + 1, 0);
  return { start: toISODate(start), end: toISODate(end) };
}

/** Last `count` calendar months ending with the month containing `iso`. */
export function lastMonths(iso: string, count: number): Array<{ start: string; end: string; label: string }> {
  const date = parseISODate(iso);
  if (!date) return [];
  const months: Array<{ start: string; end: string; label: string }> = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(date.getFullYear(), date.getMonth() - i, 1);
    const { start, end } = monthRange(d.getFullYear(), d.getMonth());
    months.push({ start, end, label: d.toLocaleDateString('en-US', { month: 'short' }) });
  }
  return months;
}

/** Relative label for compact lists: 'Today', 'Yesterday', 'Mar 12'. */
export function relativeDateLabel(iso: string): string {
  const delta = diffDays(iso, todayISO());
  if (delta === 0) return 'Today';
  if (delta === 1) return 'Yesterday';
  return formatDate(iso, 'MMM-D-YYYY');
}

export type AppDateFormat = 'MDY' | 'DMY' | 'YMD' | 'MMM-D-YYYY';

export function formatDate(iso: string, format: AppDateFormat): string {
  const date = parseISODate(iso);
  if (!date) return iso;
  const yyyy = date.getFullYear();
  const mm = `${date.getMonth() + 1}`.padStart(2, '0');
  const dd = `${date.getDate()}`.padStart(2, '0');
  switch (format) {
    case 'MDY':
      return `${mm}/${dd}/${yyyy}`;
    case 'DMY':
      return `${dd}/${mm}/${yyyy}`;
    case 'YMD':
      return `${yyyy}-${mm}-${dd}`;
    case 'MMM-D-YYYY':
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
}
