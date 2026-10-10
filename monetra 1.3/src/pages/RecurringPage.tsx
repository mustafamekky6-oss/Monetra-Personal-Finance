import { useMemo, useState } from 'react';
import { CalendarClock, Pause, Pencil, Play, Repeat, Trash2 } from 'lucide-react';
import { useAppStore, useCategoryLookup } from '@/store/AppStore';
import { useToast } from '@/store/ToastContext';
import { usePageMeta } from '@/components/layout/AppShell';
import { PageHeader, Amount } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Field, Input, Select, Textarea } from '@/components/ui/FormControls';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { formatMoney } from '@/lib/format';
import { addDays, formatDate, todayISO } from '@/lib/date';
import { advanceSchedule, recurringMonthlyAmount, upcomingPayments } from '@/utils/finance';
import { roundMoney } from '@/lib/id';
import type { Frequency, PaymentMethod, RecurringTransaction } from '@/types';

const FREQUENCIES: Array<{ value: Frequency; label: string }> = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
];

const PAYMENT_METHODS: Array<{ value: PaymentMethod; label: string }> = [
  { value: 'card', label: 'Card' },
  { value: 'cash', label: 'Cash' },
  { value: 'bank-transfer', label: 'Bank transfer' },
  { value: 'direct-debit', label: 'Direct debit' },
  { value: 'other', label: 'Other' },
];

export default function RecurringPage() {
  usePageMeta('Recurring Expenses');
  const { data, actions } = useAppStore();
  const { toast } = useToast();
  const categoryOf = useCategoryLookup();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<RecurringTransaction | undefined>();
  const [deleting, setDeleting] = useState<RecurringTransaction | null>(null);

  const currency = data.preferences.currency;
  const today = todayISO();
  const fmt = (v: number) => formatMoney(v, currency);
  const dateFmt = (iso: string) => formatDate(iso, data.preferences.dateFormat);

  const active = data.recurring.filter((r) => r.active);
  const paused = data.recurring.filter((r) => !r.active);

  const monthlyExpense = active.filter((r) => r.type === 'expense').reduce((s, r) => s + recurringMonthlyAmount(r), 0);
  const monthlyIncome = active.filter((r) => r.type === 'income').reduce((s, r) => s + recurringMonthlyAmount(r), 0);

  const upcoming = useMemo(() => upcomingPayments(data.recurring, data.categories, today, 90), [data.recurring, data.categories, today]);

  const recordNow = (r: RecurringTransaction) => {
    actions.addTransaction({
      type: r.type,
      amount: r.amount,
      categoryId: r.categoryId,
      date: r.nextDate <= today ? r.nextDate : today,
      description: r.description,
      paymentMethod: r.paymentMethod,
      recurringId: r.id,
      notes: 'Recorded manually from the recurring schedule',
    });
    actions.updateRecurring(r.id, { nextDate: advanceSchedule(r.nextDate, r.frequency) });
    toast(`Recorded "${r.description}" and advanced the schedule.`);
  };

  return (
    <div className="animate-rise">
      <PageHeader
        eyebrow="Subscriptions & bills"
        title="Recurring transactions"
        description="Define schedules once and Monetra projects upcoming payments. Nothing is charged — this is a planning simulation, not a bank connection."
        actions={
          <Button
            onClick={() => {
              setEditing(undefined);
              setFormOpen(true);
            }}
            withArrow
          >
            New recurring
          </Button>
        }
      />

      <section aria-label="Recurring summary" className="grid gap-3 sm:grid-cols-3">
        <Card padding="lg">
          <p className="label-mono text-body">Monthly recurring expenses</p>
          <p className="mt-3 font-mono text-2xl tabular-nums text-heading">{fmt(roundMoney(monthlyExpense))}</p>
          <p className="mt-2 font-mono text-[11px] text-muted">Normalized across frequencies (30.44-day month)</p>
        </Card>
        <Card padding="lg">
          <p className="label-mono text-body">Monthly recurring income</p>
          <p className="mt-3 font-mono text-2xl tabular-nums text-income">{fmt(roundMoney(monthlyIncome))}</p>
          <p className="mt-2 font-mono text-[11px] text-muted">{active.filter((r) => r.type === 'income').length} active schedule(s)</p>
        </Card>
        <Card padding="lg">
          <p className="label-mono text-body">Due in next 30 days</p>
          <p className="mt-3 font-mono text-2xl tabular-nums text-heading">
            {fmt(upcoming.filter((u) => u.date <= addDays(today, 30) && u.recurring.type === 'expense').reduce((s, u) => s + u.amount, 0))}
          </p>
          <p className="mt-2 font-mono text-[11px] text-muted">{upcoming.filter((u) => u.date <= addDays(today, 30)).length} payment(s) projected</p>
        </Card>
      </section>

      <section className="mt-6 grid gap-3 xl:grid-cols-3">
        <div className="xl:col-span-2">
          {data.recurring.length === 0 ? (
            <EmptyState
              icon={<Repeat size={28} aria-hidden />}
              title="No recurring definitions"
              description="Add rent, subscriptions or a salary schedule to see projected upcoming payments."
              action={
                <Button onClick={() => setFormOpen(true)} withArrow>
                  Add a recurring schedule
                </Button>
              }
            />
          ) : (
            <div className="flex flex-col gap-3">
              {[
                { label: 'Active', items: active },
                ...(paused.length > 0 ? [{ label: 'Paused', items: paused }] : []),
              ].map((group) => (
                <div key={group.label}>
                  <p className="label-mono mb-2.5 text-muted">{group.label}</p>
                  <ul className="flex flex-col gap-3">
                    {group.items.map((r) => {
                      const cat = categoryOf(r.categoryId);
                      const monthly = recurringMonthlyAmount(r);
                      return (
                        <li key={r.id}>
                          <Card padding="md" surface="plain" className="bg-card">
                            <div className="flex flex-wrap items-start justify-between gap-4">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="truncate text-sm text-heading">{r.description}</p>
                                  <Badge tone={r.type === 'income' ? 'income' : 'expense'}>{r.type}</Badge>
                                  {!r.active && <Badge tone="neutral">Paused</Badge>}
                                </div>
                                <p className="mt-1.5 font-mono text-[11px] text-muted">
                                  {cat.name} · {r.frequency} · next {dateFmt(r.nextDate)} · ≈{fmt(monthly)}/mo
                                </p>
                                {r.notes && <p className="mt-1 text-xs italic text-muted">{r.notes}</p>}
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="font-mono text-sm tabular-nums text-heading">{fmt(r.amount)}</span>
                                <div className="flex gap-1">
                                  <button
                                    type="button"
                                    onClick={() => actions.updateRecurring(r.id, { active: !r.active })}
                                    aria-label={r.active ? `Pause ${r.description}` : `Resume ${r.description}`}
                                    className="rounded p-1.5 text-muted transition-colors duration-200 hover:bg-lift/10 hover:text-heading"
                                  >
                                    {r.active ? <Pause size={15} aria-hidden /> : <Play size={15} aria-hidden />}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditing(r);
                                      setFormOpen(true);
                                    }}
                                    aria-label={`Edit ${r.description}`}
                                    className="rounded p-1.5 text-muted transition-colors duration-200 hover:bg-lift/10 hover:text-heading"
                                  >
                                    <Pencil size={15} aria-hidden />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDeleting(r)}
                                    aria-label={`Delete ${r.description}`}
                                    className="rounded p-1.5 text-muted transition-colors duration-200 hover:bg-orchid-bloom/15 hover:text-expense"
                                  >
                                    <Trash2 size={15} aria-hidden />
                                  </button>
                                </div>
                              </div>
                            </div>
                            {r.active && (
                              <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-lift/6 pt-3">
                                <Button variant="glass" size="sm" onClick={() => recordNow(r)}>
                                  Record payment now
                                </Button>
                                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                                  Simulated — logs a transaction, advances the schedule
                                </span>
                              </div>
                            )}
                          </Card>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>

        <Card padding="lg">
          <CardHeader title="Upcoming payments" subtitle="Projected occurrences over the next 90 days" />
          {upcoming.length === 0 ? (
            <EmptyState
              icon={<CalendarClock size={26} aria-hidden />}
              title="Nothing scheduled"
              description="Active recurring definitions will project their next occurrence dates here."
            />
          ) : (
            <ol className="divide-y divide-lift/6">
              {upcoming.slice(0, 10).map((u, index) => {
                const daysAway = Math.round((new Date(u.date).getTime() - new Date(today).getTime()) / 86_400_000);
                return (
                  <li key={`${u.recurring.id}-${index}`} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="truncate text-sm text-heading">{u.recurring.description}</p>
                      <p className="mt-0.5 font-mono text-[11px] text-muted">
                        {dateFmt(u.date)} · {daysAway === 0 ? 'today' : `in ${daysAway} day(s)`}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge tone={u.recurring.type === 'income' ? 'income' : 'expense'}>{u.recurring.frequency}</Badge>
                      <Amount type={u.recurring.type} value={fmt(u.amount)} />
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </Card>
      </section>

      <RecurringFormModal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(undefined);
        }}
        editing={editing}
      />

      <ConfirmDialog
        open={deleting !== null}
        title="Delete recurring schedule"
        message={`Remove "${deleting?.description}"? Existing transactions generated from it are kept, but no future payments will be projected.`}
        confirmLabel="Delete schedule"
        destructive
        onConfirm={() => {
          if (deleting) {
            actions.deleteRecurring(deleting.id);
            toast('Recurring schedule deleted.');
          }
        }}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}

function RecurringFormModal({
  open,
  onClose,
  editing,
}: {
  open: boolean;
  onClose: () => void;
  editing?: RecurringTransaction;
}) {
  const { data, actions } = useAppStore();
  const { toast } = useToast();
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [frequency, setFrequency] = useState<Frequency>('monthly');
  const [nextDate, setNextDate] = useState(todayISO());
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('direct-debit');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [lastOpen, setLastOpen] = useState(false);

  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) {
      setType(editing?.type ?? 'expense');
      setAmount(editing ? String(editing.amount) : '');
      setCategoryId(editing?.categoryId ?? '');
      setDescription(editing?.description ?? '');
      setFrequency(editing?.frequency ?? 'monthly');
      setNextDate(editing?.nextDate ?? todayISO());
      setPaymentMethod(editing?.paymentMethod ?? 'direct-debit');
      setNotes(editing?.notes ?? '');
      setError(undefined);
    }
  }

  const categoriesForType = data.categories.filter((c) => c.type === type);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const amountNum = parseFloat(amount);
    if (!categoryId || !categoriesForType.some((c) => c.id === categoryId)) {
      setError('Choose a valid category for this type.');
      return;
    }
    if (Number.isNaN(amountNum) || amountNum <= 0) {
      setError('Amount must be greater than zero.');
      return;
    }
    if (description.trim().length < 2) {
      setError('Give the schedule a recognizable description.');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(nextDate)) {
      setError('Pick a valid next date.');
      return;
    }
    const payload = {
      type,
      amount: roundMoney(amountNum),
      categoryId,
      description: description.trim(),
      frequency,
      nextDate,
      paymentMethod,
      active: editing?.active ?? true,
      notes: notes.trim() || undefined,
    };
    if (editing) {
      actions.updateRecurring(editing.id, payload);
      toast('Schedule updated.');
    } else {
      actions.addRecurring(payload);
      toast('Recurring schedule created.');
    }
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Edit recurring schedule' : 'New recurring schedule'}
      description="Schedules are local definitions — Monetra never charges real money."
      wide
    >
      <form onSubmit={submit} noValidate>
        <div className="mb-5 inline-flex rounded-(--radius-input) border border-lift/12 p-1" role="radiogroup" aria-label="Schedule type">
          {(['expense', 'income'] as const).map((option) => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={type === option}
              onClick={() => {
                setType(option);
                setCategoryId('');
              }}
              className={`rounded-[6px] px-5 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] transition-colors duration-200 ${
                type === option ? 'bg-action text-on-action' : 'text-body hover:text-heading'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Description" htmlFor="rec-desc" error={error?.includes('description') ? error : undefined}>
            <Input
              id="rec-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Apartment rent — Beacon & Co."
            />
          </Field>
          <Field label="Amount" htmlFor="rec-amount" error={error?.startsWith('Amount') ? error : undefined}>
            <Input id="rec-amount" type="number" min="0" step="0.01" inputMode="decimal" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </Field>
          <Field label="Category" htmlFor="rec-category" error={error?.includes('category') ? error : undefined}>
            <Select id="rec-category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="" disabled>
                Select a category
              </option>
              {categoriesForType.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Frequency" htmlFor="rec-frequency">
            <Select id="rec-frequency" value={frequency} onChange={(e) => setFrequency(e.target.value as Frequency)}>
              {FREQUENCIES.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Next occurrence" htmlFor="rec-next" error={error?.includes('date') ? error : undefined} hint="Future occurrences are computed from this anchor.">
            <Input id="rec-next" type="date" value={nextDate} onChange={(e) => setNextDate(e.target.value)} />
          </Field>
          <Field label="Payment method" htmlFor="rec-method">
            <Select id="rec-method" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}>
              {PAYMENT_METHODS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Notes (optional)" htmlFor="rec-notes" className="sm:col-span-2">
            <Textarea id="rec-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Consider cancelling in Q3" />
          </Field>
        </div>
        <p className="mt-4 text-xs leading-relaxed text-muted">
          Weekly schedules repeat every 7 days; monthly/quarterly/yearly use calendar months with end-of-month
          clamping (e.g. the 31st becomes Feb 28 in short months).
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">{editing ? 'Save schedule' : 'Create schedule'}</Button>
        </div>
      </form>
    </Modal>
  );
}
