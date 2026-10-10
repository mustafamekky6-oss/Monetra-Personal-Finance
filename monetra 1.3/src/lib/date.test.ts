import { describe, expect, it } from 'vitest';
import {
  addDays,
  addMonths,
  diffDays,
  diffMonths,
  financialMonthRange,
  formatDate,
  lastMonths,
  parseISODate,
} from './date';

describe('parseISODate', () => {
  it('accepts valid dates', () => {
    expect(parseISODate('2026-02-28')?.getMonth()).toBe(1);
  });

  it('rejects invalid formats and impossible dates', () => {
    expect(parseISODate('2026-2-28')).toBeNull();
    expect(parseISODate('2026-02-31')).toBeNull();
    expect(parseISODate('not-a-date')).toBeNull();
    expect(parseISODate('')).toBeNull();
  });
});

describe('arithmetic', () => {
  it('adds days across month boundaries', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
  });

  it('adds months with end-of-month clamping', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonths('2026-03-31', -1)).toBe('2026-02-28');
  });

  it('diffs days and whole months', () => {
    expect(diffDays('2026-01-01', '2026-01-31')).toBe(30);
    expect(diffMonths('2026-01-15', '2026-03-14')).toBe(1);
    expect(diffMonths('2026-01-15', '2026-03-15')).toBe(2);
  });
});

describe('financial month ranges', () => {
  it('handles month starting on the 1st', () => {
    const { start, end } = financialMonthRange('2026-06-15', 1);
    expect(start).toBe('2026-06-01');
    expect(end).toBe('2026-06-30');
  });

  it('handles custom start day mid-month', () => {
    const { start, end } = financialMonthRange('2026-06-10', 15);
    expect(start).toBe('2026-05-15');
    expect(end).toBe('2026-06-14');
  });

  it('rolls back a month when before the start day', () => {
    const { start } = financialMonthRange('2026-06-05', 15);
    expect(start).toBe('2026-05-15');
  });
});

describe('formatting helpers', () => {
  it('formats across all supported formats', () => {
    expect(formatDate('2026-03-12', 'MDY')).toBe('03/12/2026');
    expect(formatDate('2026-03-12', 'DMY')).toBe('12/03/2026');
    expect(formatDate('2026-03-12', 'YMD')).toBe('2026-03-12');
    expect(formatDate('2026-03-12', 'MMM-D-YYYY')).toBe('Mar 12, 2026');
  });

  it('returns requested month count ending with current month', () => {
    const months = lastMonths('2026-06-15', 3);
    expect(months).toHaveLength(3);
    expect(months[0].label).toBe('Apr');
    expect(months[2].label).toBe('Jun');
    expect(months[2].end).toBe('2026-06-30');
  });
});
