import type { Transaction, UserPreferences } from '@/types';

/** CSV export for transactions — RFC 4180 compliant escaping. */
export function transactionsToCsv(transactions: Transaction[], categoryNames: Record<string, string>): string {
  const header = ['Date', 'Type', 'Amount', 'Category', 'Description', 'Payment Method', 'Notes', 'Recurring'];
  const rows = transactions
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((t) => [
      t.date,
      t.type,
      t.amount.toFixed(2),
      categoryNames[t.categoryId] ?? 'Uncategorized',
      t.description,
      t.paymentMethod,
      t.notes ?? '',
      t.recurringId ? 'yes' : 'no',
    ]);
  return [header, ...rows].map((row) => row.map(escapeCsvCell).join(',')).join('\r\n');
}

function escapeCsvCell(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function csvFilename(prefix: string): string {
  const iso = new Date().toISOString().slice(0, 10);
  return `${prefix}-${iso}.csv`;
}

export function preferencesApplied(_prefs: UserPreferences): void {
  // Reserved: hooks for future preference-driven export formats.
}
