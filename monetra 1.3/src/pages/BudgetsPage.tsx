import { useMemo, useState } from 'react';
import { Pencil, Scale, Trash2 } from 'lucide-react';
import { useAppStore, useCategoryLookup } from '@/store/AppStore';
import { useToast } from '@/store/ToastContext';
import { usePageMeta } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Field, Input, Select } from '@/components/ui/FormControls';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { formatMoney, formatPercent } from '@/lib/format';
import { lastMonths, todayISO } from '@/lib/date';
import { budgetStatuses, categoryMonthlySpend, NEAR_LIMIT_THRESHOLD } from '@/utils/finance';
import type { Budget } from '@/types';

export default function BudgetsPage() {
  usePageMeta('Budgets');
  const { data, actions } = useAppStore();
  const { toast } = useToast();
  const categoryOf = useCategoryLookup();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Budget | undefined>();
  const [deleting, setDeleting] = useState<Budget | null>(null);

  const currency = data.preferences.currency;
  const today = todayISO();
  const fmt = (v: number) => formatMoney(v, currency);

  const lines = useMemo(
    () => budgetStatuses(data.budgets, data.categories, data.transactions, data.preferences.monthStartDay, today),
    [data.budgets, data.categories, data.transactions, data.preferences.monthStartDay, today],
  );

  const months = useMemo(() => lastMonths(today, 4), [today]);

  const totalLimit = lines.reduce((s, l) => s + l.limit, 0);
  const totalSpent = lines.reduce((s, l) => s + l.spent, 0);
  const overallUtil = totalLimit > 0 ? (totalSpent / totalLimit) * 100 : null;

  const expenseCategories = data.categories.filter((c) => c.type === 'expense');
  const unbudgeted = expenseCategories.filter((c) => !data.budgets.some((b) => b.categoryId === c.id));

  return (
    <div className="animate-rise">
      <PageHeader
        eyebrow="Control"
        title="Budgets"
        description={`Monthly limits per category, measured against actual spending in the current financial month (starts day ${data.preferences.monthStartDay}).`}
        actions={
          <Button
            onClick={() => {
              setEditing(undefined);
              setFormOpen(true);
            }}
            withArrow
          >
            New budget
          </Button>
        }
      />

      <section aria-label="Budget overview" className="grid gap-3 sm:grid-cols-3">
        <Card padding="lg">
          <p className="label-mono text-body">Total budgeted</p>
          <p className="mt-3 font-mono text-2xl tabular-nums text-heading">{fmt(totalLimit)}</p>
          <p className="mt-2 font-mono text-[11px] text-muted">{lines.length} monthly budgets</p>
        </Card>
        <Card padding="lg">
          <p className="label-mono text-body">Spent this month</p>
          <p className="mt-3 font-mono text-2xl tabular-nums text-heading">{fmt(totalSpent)}</p>
          <p className="mt-2 font-mono text-[11px] text-muted">
            {fmt(Math.max(totalLimit - totalSpent, 0))} remaining overall
          </p>
        </Card>
        <Card padding="lg">
          <p className="label-mono text-body">Overall utilization</p>
          <p className="mt-3 font-mono text-2xl tabular-nums text-heading">
            {formatPercent(overallUtil ?? 0)}
          </p>
          <div className="mt-3">
            <ProgressBar value={overallUtil} color="iris" label="Overall budget utilization" />
          </div>
        </Card>
      </section>

      {lines.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={<Scale size={28} aria-hidden />}
            title="No budgets set"
            description="Create a monthly limit for a category — Monetra measures it against your actual transactions and warns you before you overspend."
            action={
              <Button onClick={() => setFormOpen(true)} withArrow>
                Create your first budget
              </Button>
            }
          />
        </div>
      ) : (
        <section aria-label="Category budgets" className="mt-6 grid gap-3 lg:grid-cols-2">
          {lines.map((line) => {
            const history = categoryMonthlySpend(line.budget.categoryId, data.transactions, months);
            const overHistory = history.filter((v) => v > line.limit).length;
            return (
              <Card key={line.budget.id} padding="lg">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-lift/6 text-heading">
                      <CategoryIcon name={line.category?.icon ?? 'CircleDollarSign'} size={16} />
                    </span>
                    <div>
                      <h3 className="font-display text-[20px] leading-tight text-heading">
                        {line.category?.name ?? 'Uncategorized'}
                      </h3>
                      <p className="mt-0.5 font-mono text-[11px] text-muted">
                        {line.utilization === null ? 'No limit set' : `${line.utilization.toFixed(0)}% of monthly limit`}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(line.budget);
                        setFormOpen(true);
                      }}
                      aria-label={`Edit ${line.category?.name} budget`}
                      className="rounded p-1.5 text-muted transition-colors duration-200 hover:bg-lift/10 hover:text-heading"
                    >
                      <Pencil size={15} aria-hidden />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleting(line.budget)}
                      aria-label={`Delete ${line.category?.name} budget`}
                      className="rounded p-1.5 text-muted transition-colors duration-200 hover:bg-orchid-bloom/15 hover:text-expense"
                    >
                      <Trash2 size={15} aria-hidden />
                    </button>
                  </div>
                </div>

                <div className="mt-5 flex items-baseline justify-between font-mono tabular-nums">
                  <span className="text-lg text-heading">{fmt(line.spent)}</span>
                  <span className="text-xs text-muted">limit {fmt(line.limit)}</span>
                </div>
                <div className="mt-2">
                  <ProgressBar value={line.utilization} color={line.category?.color} label={`${line.category?.name} budget utilization`} />
                </div>
                <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
                  <p className="font-mono text-[11px] text-body">
                    {line.remaining >= 0
                      ? `${fmt(line.remaining)} remaining · ${line.daysLeft} day(s) left in month`
                      : `${fmt(Math.abs(line.remaining))} over limit`}
                  </p>
                  {line.status === 'over-budget' ? (
                    <Badge tone="critical">Over budget</Badge>
                  ) : line.status === 'near-limit' ? (
                    <Badge tone="warning">Near limit ≥{NEAR_LIMIT_THRESHOLD}%</Badge>
                  ) : (
                    <Badge tone="positive">On track</Badge>
                  )}
                </div>

                <div className="mt-5 border-t border-lift/6 pt-4">
                  <p className="label-mono mb-2.5 text-muted">Last {months.length} months</p>
                  <div className="flex items-end gap-1.5" role="img" aria-label={`Monthly spend history versus limit: ${history.map((h, i) => `${months[i]?.label} ${fmt(h)}`).join(', ')}`}>
                    {history.map((value, index) => {
                      const max = Math.max(...history, line.limit);
                      const heightPct = max > 0 ? (value / max) * 100 : 0;
                      const limitPct = max > 0 ? (line.limit / max) * 100 : 0;
                      return (
                        <div key={index} className="relative flex-1">
                          <div
                            className="w-full rounded-sm"
                            style={{
                              height: `${Math.max(heightPct, 2) * 0.72}px`,
                              backgroundColor: value > line.limit ? '#dd90d8' : '#847dff',
                              opacity: 0.55 + (index / history.length) * 0.45,
                            }}
                          />
                          <div
                            className="absolute left-0 right-0 border-t border-dashed border-lift/35"
                            style={{ bottom: `${limitPct * 0.72}px` }}
                            aria-hidden
                          />
                          <p className="mt-1.5 text-center font-mono text-[10px] text-muted">{months[index]?.label}</p>
                        </div>
                      );
                    })}
                  </div>
                  {overHistory > 0 && (
                    <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-expense">
                      Over limit in {overHistory} of the last {months.length} months
                    </p>
                  )}
                </div>
              </Card>
            );
          })}
        </section>
      )}

      {unbudgeted.length > 0 && lines.length > 0 && (
        <Card padding="md" className="mt-6" surface="plain">
          <p className="text-sm text-body">
            <span className="text-heading">{unbudgeted.length} expense categor{unbudgeted.length === 1 ? 'y has' : 'ies have'} no budget:</span>{' '}
            {unbudgeted.map((c) => c.name).join(', ')}.{' '}
            <button
              type="button"
              className="text-income hover:underline"
              onClick={() => {
                setEditing(undefined);
                setFormOpen(true);
              }}
            >
              Add one
            </button>
          </p>
        </Card>
      )}

      <BudgetFormModal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(undefined);
        }}
        editing={editing}
        onSaved={(limit, category, isNew) => {
          toast(isNew ? `Budget of ${fmt(limit)} set for ${category}.` : 'Budget updated.');
        }}
      />

      <ConfirmDialog
        open={deleting !== null}
        title="Delete budget"
        message={`Remove the monthly budget for ${deleting ? categoryOf(deleting.categoryId).name : ''}? Transactions are not affected — only the limit disappears.`}
        confirmLabel="Delete budget"
        destructive
        onConfirm={() => {
          if (deleting) {
            actions.deleteBudget(deleting.id);
            toast('Budget deleted.');
          }
        }}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}

function BudgetFormModal({
  open,
  onClose,
  editing,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  editing?: Budget;
  onSaved: (limit: number, categoryName: string, isNew: boolean) => void;
}) {
  const { data, actions } = useAppStore();
  const [categoryId, setCategoryId] = useState('');
  const [limit, setLimit] = useState('');
  const [error, setError] = useState<string | undefined>();

  // Re-seed form state each time the modal opens.
  const seedCategory = editing?.categoryId ?? '';
  const seedLimit = editing ? String(editing.monthlyLimit) : '';
  const [lastOpen, setLastOpen] = useState(false);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) {
      setCategoryId(seedCategory);
      setLimit(seedLimit);
      setError(undefined);
    }
  }

  const expenseCategories = data.categories.filter((c) => c.type === 'expense');
  const existing = new Map(data.budgets.map((b) => [b.categoryId, b.id]));

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const amount = parseFloat(limit);
    if (!categoryId) {
      setError('Choose a category.');
      return;
    }
    if (Number.isNaN(amount) || amount <= 0) {
      setError('Enter a limit greater than zero.');
      return;
    }
    if (!editing && existing.has(categoryId)) {
      setError('A budget already exists for this category — edit it instead.');
      return;
    }
    const categoryName = expenseCategories.find((c) => c.id === categoryId)?.name ?? '';
    if (editing) {
      actions.updateBudget(editing.id, { categoryId, monthlyLimit: amount });
      onSaved(amount, categoryName, false);
    } else {
      actions.addBudget({ categoryId, monthlyLimit: amount });
      onSaved(amount, categoryName, true);
    }
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Edit budget' : 'New budget'}
      description="Monthly limits recur every financial month."
    >
      <form onSubmit={submit} noValidate>
        <div className="flex flex-col gap-4">
          <Field label="Category" htmlFor="budget-category" error={error && !categoryId ? error : undefined}>
            <Select id="budget-category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="" disabled>
                Select an expense category
              </option>
              {expenseCategories
                .filter((c) => editing || !existing.has(c.id))
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </Select>
          </Field>
          <Field
            label="Monthly limit"
            htmlFor="budget-limit"
            error={error && categoryId ? error : undefined}
            hint="Spending above this amount in a financial month triggers a warning."
          >
            <Input
              id="budget-limit"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              placeholder="0.00"
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
            />
          </Field>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">{editing ? 'Save changes' : 'Set budget'}</Button>
        </div>
      </form>
    </Modal>
  );
}
