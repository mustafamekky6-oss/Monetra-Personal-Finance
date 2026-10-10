import type { AppData } from '@/types';

export const STORAGE_KEY = 'monetra.data.v1';

/** Parse failures and schema mismatches fall back to null — never throw. */
export function loadFromStorage(): AppData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isValidAppDataShape(parsed)) return null;
    return parsed as AppData;
  } catch {
    return null;
  }
}

export function saveToStorage(data: AppData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Quota/unavailable storage is non-fatal for a local demo.
  }
}

export function clearStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** Structural guard used by both load and import paths. */
export function isValidAppDataShape(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  const arrays = ['categories', 'transactions', 'budgets', 'recurring', 'goals'];
  return (
    typeof v.version === 'number' &&
    arrays.every((key) => Array.isArray(v[key])) &&
    typeof v.preferences === 'object' &&
    v.preferences !== null &&
    typeof v.isDemoData === 'boolean'
  );
}
