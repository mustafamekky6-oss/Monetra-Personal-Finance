import { useRef, useState, type ChangeEvent } from 'react';
import { AlertTriangle, CheckCircle2, Database, Download, RotateCcw, Settings as SettingsIcon, Upload } from 'lucide-react';
import { useAppStore } from '@/store/AppStore';
import { useToast } from '@/store/ToastContext';
import { usePageMeta } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Field, Select } from '@/components/ui/FormControls';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { downloadFile } from '@/lib/id';
import { isValidAppDataShape } from '@/lib/storage';
import { formatDate, todayISO } from '@/lib/date';
import { transactionsToCsv, csvFilename } from '@/services/export';
import { formatMoney } from '@/lib/format';
import type { AppData, CurrencyCode, DateFormat } from '@/types';

const CURRENCIES: Array<{ value: CurrencyCode; label: string }> = [
  { value: 'USD', label: 'USD — US Dollar' },
  { value: 'EUR', label: 'EUR — Euro' },
  { value: 'GBP', label: 'GBP — British Pound' },
  { value: 'JPY', label: 'JPY — Japanese Yen' },
  { value: 'CNY', label: 'CNY — Chinese Yuan' },
];

const DATE_FORMATS: Array<{ value: DateFormat; label: string }> = [
  { value: 'MMM-D-YYYY', label: 'Mar 12, 2026' },
  { value: 'MDY', label: '03/12/2026' },
  { value: 'DMY', label: '12/03/2026' },
  { value: 'YMD', label: '2026-03-12' },
];

export default function SettingsPage() {
  usePageMeta('Settings');
  const { data, actions } = useAppStore();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [importPreview, setImportPreview] = useState<AppData | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const currency = data.preferences.currency;

  const exportCsv = () => {
    const names = Object.fromEntries(data.categories.map((c) => [c.id, c.name]));
    downloadFile(csvFilename('monetra-transactions'), transactionsToCsv(data.transactions, names), 'text/csv');
    toast(`Exported ${data.transactions.length} transactions as CSV.`);
  };

  const exportJson = () => {
    const backup = { ...data, exportedAt: new Date().toISOString(), app: 'monetra', schema: 1 };
    downloadFile(`monetra-backup-${todayISO()}.json`, JSON.stringify(backup, null, 2), 'application/json');
    toast('Full backup exported as JSON.');
  };

  const onImportFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    setImportError(null);
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed: unknown = JSON.parse(String(reader.result));
        if (!isValidAppDataShape(parsed)) {
          setImportError('The file does not look like a Monetra backup — structure check failed.');
          return;
        }
        const candidate = parsed as AppData;
        if (candidate.transactions.some((t) => !/^\d{4}-\d{2}-\d{2}$/.test(t.date))) {
          setImportError('Backup contains invalid transaction dates.');
          return;
        }
        setImportPreview(candidate);
      } catch {
        setImportError('Could not parse the file as JSON.');
      }
    };
    reader.readAsText(file);
  };

  const importCounts = importPreview
    ? {
        transactions: importPreview.transactions.length,
        budgets: importPreview.budgets.length,
        recurring: importPreview.recurring.length,
        goals: importPreview.goals.length,
      }
    : null;

  return (
    <div className="animate-rise max-w-3xl">
      <PageHeader
        eyebrow="Preferences"
        title="Settings"
        description="Local preferences and data portability. Everything is stored in your browser only — no account, no cloud sync, no bank connection."
      />

      <div className="flex flex-col gap-3">
        <Card padding="lg">
          <CardHeader title="Display preferences" subtitle="Applied instantly across every view" />
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Currency" htmlFor="pref-currency" hint="Display symbol only — amounts are never converted.">
              <Select
                id="pref-currency"
                value={currency}
                onChange={(e) => {
                  actions.setPreferences({ currency: e.target.value as CurrencyCode });
                  toast('Currency display updated.');
                }}
              >
                {CURRENCIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Date format" htmlFor="pref-date">
              <Select
                id="pref-date"
                value={data.preferences.dateFormat}
                onChange={(e) => {
                  actions.setPreferences({ dateFormat: e.target.value as DateFormat });
                  toast('Date format updated.');
                }}
              >
                {DATE_FORMATS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="Financial month starts on"
              htmlFor="pref-month-start"
              hint="Used for budgets and monthly summaries."
            >
              <Select
                id="pref-month-start"
                value={data.preferences.monthStartDay}
                onChange={(e) => {
                  actions.setPreferences({ monthStartDay: Number(e.target.value) });
                  toast('Financial month start updated.');
                }}
              >
                {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>
                    Day {d}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <p className="mt-4 font-mono text-[11px] text-fog">
            Preview: today shows as {formatDate(todayISO(), data.preferences.dateFormat)} · sample amount{' '}
            {formatMoney(1234.5, currency)}
          </p>
        </Card>

        <Card padding="lg">
          <CardHeader title="Data portability" subtitle="Real downloads — exports produce actual files" />
          <div className="flex flex-wrap gap-3">
            <Button variant="ghost" onClick={exportCsv}>
              <Download size={15} aria-hidden /> Export transactions (CSV)
            </Button>
            <Button variant="ghost" onClick={exportJson}>
              <Database size={15} aria-hidden /> Export full backup (JSON)
            </Button>
            <Button variant="glass" onClick={() => fileInputRef.current?.click()}>
              <Upload size={15} aria-hidden /> Import backup (JSON)
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              onChange={onImportFile}
              className="hidden"
              aria-label="Import JSON backup file"
            />
          </div>
          {importError && (
            <p role="alert" className="mt-4 flex items-center gap-2 text-sm text-orchid-bloom">
              <AlertTriangle size={15} aria-hidden /> {importError}
            </p>
          )}
          <p className="mt-4 text-xs leading-relaxed text-fog">
            Import validates the structure and shows a preview before anything is replaced — your current data is
            never overwritten silently.
          </p>
        </Card>

        <Card padding="lg">
          <CardHeader title="Demo data" subtitle="Where the current records come from" />
          <div className="mb-4 flex items-center gap-2.5">
            {data.isDemoData ? (
              <span className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-pale-iris">
                <AlertTriangle size={13} aria-hidden /> Demo dataset active
              </span>
            ) : (
              <span className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-cyan-signal">
                <CheckCircle2 size={13} aria-hidden /> Your own records
              </span>
            )}
          </div>
          <p className="mb-4 text-sm leading-relaxed text-ash">
            {data.transactions.length} transactions · {data.budgets.length} budgets · {data.recurring.length} recurring
            schedules · {data.goals.length} goals currently stored in this browser. Demo data is fictional and clearly
            distinguished from real records.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button variant="ghost" onClick={() => setConfirmReset(true)}>
              <RotateCcw size={15} aria-hidden /> Reset to demo data
            </Button>
            <Button variant="danger" onClick={() => setConfirmClear(true)}>
              Clear all transactions
            </Button>
          </div>
        </Card>

        <Card padding="md" surface="plain">
          <p className="flex items-start gap-2.5 text-xs leading-relaxed text-fog">
            <SettingsIcon size={14} className="mt-0.5 shrink-0" aria-hidden />
            Monetra is a portfolio demo of front-end engineering. It does not connect to banks, execute payments, or
            provide regulated financial advice. LocalStorage persistence means data stays on this device and this
            browser profile only — it is not cloud storage or multi-device sync.
          </p>
        </Card>
      </div>

      <ConfirmDialog
        open={confirmReset}
        title="Reset to demo data"
        message="This replaces ALL current data (transactions, budgets, recurring schedules, goals) with the fictional demo dataset. Your current records will be lost."
        confirmLabel="Reset to demo"
        destructive
        onConfirm={() => {
          actions.resetDemoData();
          toast('Demo data restored.');
        }}
        onClose={() => setConfirmReset(false)}
      />

      <ConfirmDialog
        open={confirmClear}
        title="Clear all transactions"
        message="This deletes every transaction record. Budgets, recurring schedules and goals remain, but every chart and calculation will show empty states."
        confirmLabel="Clear transactions"
        destructive
        onConfirm={() => {
          actions.clearTransactions();
          toast('All transactions cleared.');
        }}
        onClose={() => setConfirmClear(false)}
      />

      <Modal
        open={importPreview !== null}
        onClose={() => setImportPreview(null)}
        title="Confirm import"
        description="The backup passed validation. Review the contents before replacing current data."
      >
        {importPreview && importCounts && (
          <>
            <ul className="mb-5 space-y-2 text-sm text-ash">
              <li className="flex justify-between border-b border-white/6 pb-2">
                <span>Transactions</span>
                <span className="font-mono text-cloud">{importCounts.transactions}</span>
              </li>
              <li className="flex justify-between border-b border-white/6 pb-2">
                <span>Budgets</span>
                <span className="font-mono text-cloud">{importCounts.budgets}</span>
              </li>
              <li className="flex justify-between border-b border-white/6 pb-2">
                <span>Recurring schedules</span>
                <span className="font-mono text-cloud">{importCounts.recurring}</span>
              </li>
              <li className="flex justify-between">
                <span>Goals</span>
                <span className="font-mono text-cloud">{importCounts.goals}</span>
              </li>
            </ul>
            <p className="mb-5 text-xs leading-relaxed text-fog">
              Importing replaces your current data entirely. Duplicate ids in the backup were accepted as-is — the
              whole file is swapped in atomically.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setImportPreview(null)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  actions.replaceData(importPreview);
                  setImportPreview(null);
                  toast('Backup imported.');
                }}
              >
                Replace current data
              </Button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
