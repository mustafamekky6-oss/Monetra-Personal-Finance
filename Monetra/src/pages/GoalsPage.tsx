import { useMemo, useState } from 'react';
import { Flag, Pencil, Plus, Target, Trash2 } from 'lucide-react';
import { useAppStore } from '@/store/AppStore';
import { useToast } from '@/store/ToastContext';
import { usePageMeta } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Field, Input, Textarea } from '@/components/ui/FormControls';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { formatMoney, formatPercent } from '@/lib/format';
import { formatDate, lastMonths, todayISO } from '@/lib/date';
import { averageMonthlyIncome, goalFeasibility, goalProgress } from '@/utils/finance';
import { roundMoney } from '@/lib/id';
import type { FinancialGoal } from '@/types';

type FeasibilityStatus = 'completed' | 'on-track' | 'at-risk' | 'behind';

export default function GoalsPage() {
  usePageMeta('Financial Goals');
  const { data, actions } = useAppStore();
  const { toast } = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<FinancialGoal | undefined>();
  const [deleting, setDeleting] = useState<FinancialGoal | null>(null);
  const [contributingTo, setContributingTo] = useState<FinancialGoal | null>(null);

  const currency = data.preferences.currency;
  const today = todayISO();
  const fmt = (v: number) => formatMoney(v, currency);
  const dateFmt = (iso: string) => formatDate(iso, data.preferences.dateFormat);

  const avgIncome = useMemo(() => {
    const months = lastMonths(today, 3);
    const start = months[0]?.start ?? today;
    const income = data.transactions
      .filter((t) => t.type === 'income' && t.date >= start)
      .reduce((s, t) => s + t.amount, 0);
    return averageMonthlyIncome(
      data.transactions.filter((t) => t.date >= start),
      3,
    ) || income / 3;
  }, [data.transactions, today]);

  const progressList = data.goals.map((g) => goalProgress(g, today));
  const totalSaved = progressList.reduce((s, p) => s + p.saved, 0);
  const totalTarget = data.goals.reduce((s, g) => s + g.targetAmount, 0);

  return (
    <div className="animate-rise">
      <PageHeader
        eyebrow="Destinations"
        title="Financial goals"
        description="Set targets, contribute over time, and see transparent pace math — whether a goal is realistic is always shown, never guessed."
        actions={
          <Button
            onClick={() => {
              setEditing(undefined);
              setFormOpen(true);
            }}
            withArrow
          >
            New goal
          </Button>
        }
      />

      <section aria-label="Goals summary" className="grid gap-3 sm:grid-cols-3">
        <Card padding="lg">
          <p className="label-mono text-ash">Goals</p>
          <p className="mt-3 font-mono text-2xl tabular-nums text-pure">{data.goals.length}</p>
          <p className="mt-2 font-mono text-[11px] text-fog">
            {progressList.filter((p) => p.remaining === 0).length} completed
          </p>
        </Card>
        <Card padding="lg">
          <p className="label-mono text-ash">Saved so far</p>
          <p className="mt-3 font-mono text-2xl tabular-nums text-cyan-signal">{fmt(totalSaved)}</p>
          <p className="mt-2 font-mono text-[11px] text-fog">
            {totalTarget > 0 ? `${formatPercent((totalSaved / totalTarget) * 100)} of combined targets` : 'No targets yet'}
          </p>
        </Card>
        <Card padding="lg">
          <p className="label-mono text-ash">Still to save</p>
          <p className="mt-3 font-mono text-2xl tabular-nums text-pure">
            {fmt(Math.max(totalTarget - totalSaved, 0))}
          </p>
          <p className="mt-2 font-mono text-[11px] text-fog">Across all active goals</p>
        </Card>
      </section>

      {data.goals.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={<Target size={28} aria-hidden />}
            title="No goals yet"
            description="Whether it is an emergency fund or a trip — give savings a name and a date."
            action={
              <Button onClick={() => setFormOpen(true)} withArrow>
                Create your first goal
              </Button>
            }
          />
        </div>
      ) : (
        <section aria-label="Goal list" className="mt-6 grid gap-3 lg:grid-cols-2">
          {progressList.map((p) => {
            const feasibility = goalFeasibility(p.goal, avgIncome, today);
            return (
              <Card key={p.goal.id} padding="lg">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="font-display text-[20px] leading-tight text-pure">{p.goal.name}</h3>
                    <p className="mt-1 font-mono text-[11px] text-fog">
                      Target {dateFmt(p.goal.targetDate)} · {p.monthsLeft} month(s) left
                    </p>
                  </div>
                  <FeasibilityBadge status={feasibility.status} />
                </div>

                <div className="mt-5 flex items-baseline justify-between font-mono tabular-nums">
                  <span className="text-lg text-pure">{fmt(p.saved)}</span>
                  <span className="text-xs text-fog">target {fmt(p.goal.targetAmount)}</span>
                </div>
                <div className="mt-2">
                  <ProgressBar value={p.progressPercent} color="cyan" label={`${p.goal.name} progress`} />
                </div>
                <p className="mt-2 font-mono text-[11px] text-ash">
                  {p.progressPercent === null ? 'No target amount' : `${p.progressPercent.toFixed(0)}% funded`} ·{' '}
                  {p.remaining === 0 ? 'Goal reached' : `${fmt(p.remaining)} to go`}
                </p>

                <div className="mt-4 rounded-(--radius-input) bg-abyss/70 p-3.5">
                  <p className="label-mono mb-1.5 text-fog">Pace check</p>
                  <p className="text-xs leading-relaxed text-ash">
                    {p.remaining === 0 ? (
                      <>Fully funded — contributions closed.</>
                    ) : feasibility.requiredMonthly === null ? (
                      <>Target date has passed. Extend the date or finish with a lump contribution.</>
                    ) : (
                      <>
                        Requires <span className="font-mono text-cloud">{fmt(feasibility.requiredMonthly)}/month</span> for{' '}
                        {feasibility.monthsLeft} month(s). Your average monthly income is{' '}
                        <span className="font-mono text-cloud">{fmt(avgIncome)}</span>
                        {feasibility.status === 'at-risk'
                          ? ' — required pace exceeds 40% of income, which we flag as at-risk.'
                          : ' — pace looks plausible.'}
                      </>
                    )}
                  </p>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Button size="sm" onClick={() => setContributingTo(p.goal)}>
                    <Plus size={14} aria-hidden /> Add contribution
                  </Button>
                  <Button
                    size="sm"
                    variant="glass"
                    onClick={() => {
                      setEditing(p.goal);
                      setFormOpen(true);
                    }}
                  >
                    <Pencil size={13} aria-hidden /> Edit
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => setDeleting(p.goal)}>
                    <Trash2 size={13} aria-hidden /> Delete
                  </Button>
                </div>

                {p.goal.contributions.length > 0 && (
                  <details className="mt-4 border-t border-white/6 pt-3">
                    <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-[0.14em] text-fog hover:text-cloud">
                      Contribution history ({p.goal.contributions.length})
                    </summary>
                    <ul className="mt-3 divide-y divide-white/6">
                      {[...p.goal.contributions]
                        .sort((a, b) => b.date.localeCompare(a.date))
                        .map((c) => (
                          <li key={c.id} className="flex items-center justify-between gap-3 py-2">
                            <div>
                              <p className="font-mono text-xs tabular-nums text-cloud">{fmt(c.amount)}</p>
                              <p className="font-mono text-[10px] text-fog">
                                {dateFmt(c.date)}
                                {c.note ? ` · ${c.note}` : ''}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                actions.deleteContribution(p.goal.id, c.id);
                                toast('Contribution removed.');
                              }}
                              aria-label={`Delete contribution of ${fmt(c.amount)}`}
                              className="rounded p-1 text-fog transition-colors duration-200 hover:bg-orchid-bloom/15 hover:text-orchid-bloom"
                            >
                              <Trash2 size={13} aria-hidden />
                            </button>
                          </li>
                        ))}
                    </ul>
                  </details>
                )}
              </Card>
            );
          })}
        </section>
      )}

      <GoalFormModal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(undefined);
        }}
        editing={editing}
      />

      <ContributionModal goal={contributingTo} onClose={() => setContributingTo(null)} />

      <ConfirmDialog
        open={deleting !== null}
        title="Delete goal"
        message={`Delete "${deleting?.name}" and its ${deleting?.contributions.length ?? 0} contribution record(s)? This cannot be undone.`}
        confirmLabel="Delete goal"
        destructive
        onConfirm={() => {
          if (deleting) {
            actions.deleteGoal(deleting.id);
            toast('Goal deleted.');
          }
        }}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}

function FeasibilityBadge({ status }: { status: FeasibilityStatus }) {
  switch (status) {
    case 'completed':
      return <Badge tone="income">Completed</Badge>;
    case 'on-track':
      return <Badge tone="positive">On track</Badge>;
    case 'at-risk':
      return <Badge tone="critical">At risk</Badge>;
    default:
      return <Badge tone="warning">Behind</Badge>;
  }
}

function GoalFormModal({ open, onClose, editing }: { open: boolean; onClose: () => void; editing?: FinancialGoal }) {
  const { actions } = useAppStore();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [lastOpen, setLastOpen] = useState(false);

  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) {
      setName(editing?.name ?? '');
      setTargetAmount(editing ? String(editing.targetAmount) : '');
      setTargetDate(editing?.targetDate ?? '');
      setError(undefined);
    }
  }

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const amount = parseFloat(targetAmount);
    if (name.trim().length < 2) {
      setError('Give the goal a name (min 2 characters).');
      return;
    }
    if (Number.isNaN(amount) || amount <= 0) {
      setError('Target amount must be greater than zero.');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
      setError('Choose a valid target date.');
      return;
    }
    if (targetDate <= todayISO()) {
      setError('Target date must be in the future.');
      return;
    }
    if (editing) {
      actions.updateGoal(editing.id, { name: name.trim(), targetAmount: amount, targetDate });
      toast('Goal updated.');
    } else {
      actions.addGoal({ name: name.trim(), targetAmount: amount, targetDate, createdAt: todayISO() });
      toast('Goal created.');
    }
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Edit goal' : 'New goal'}
      description="Give savings a destination and a deadline."
    >
      <form onSubmit={submit} noValidate>
        <div className="flex flex-col gap-4">
          <Field label="Goal name" htmlFor="goal-name" error={error?.includes('name') ? error : undefined}>
            <Input id="goal-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Emergency fund" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Target amount" htmlFor="goal-amount" error={error?.includes('amount') || error?.includes('Target') ? error : undefined}>
              <Input id="goal-amount" type="number" min="0" step="0.01" inputMode="decimal" placeholder="0.00" value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} />
            </Field>
            <Field label="Target date" htmlFor="goal-date" error={error?.includes('date') ? error : undefined}>
              <Input id="goal-date" type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
            </Field>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">{editing ? 'Save changes' : 'Create goal'}</Button>
        </div>
      </form>
    </Modal>
  );
}

function ContributionModal({ goal, onClose }: { goal: FinancialGoal | null; onClose: () => void }) {
  const { data, actions } = useAppStore();
  const { toast } = useToast();
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [lastGoalId, setLastGoalId] = useState<string | null>(null);

  if ((goal?.id ?? null) !== lastGoalId) {
    setLastGoalId(goal?.id ?? null);
    if (goal) {
      setAmount('');
      setDate(todayISO());
      setNote('');
      setError(undefined);
    }
  }

  if (!goal) return null;

  const currency = data.preferences.currency;
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const amountNum = parseFloat(amount);
    if (Number.isNaN(amountNum) || amountNum <= 0) {
      setError('Contribution must be greater than zero.');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setError('Choose a valid date.');
      return;
    }
    actions.addContribution(goal.id, { amount: roundMoney(amountNum), date, note: note.trim() || undefined });
    toast(`Added ${formatMoney(amountNum, currency)} to "${goal.name}".`);
    onClose();
  };

  return (
    <Modal open={goal !== null} onClose={onClose} title={`Contribute to ${goal.name}`} description={`Remaining: ${formatMoney(Math.max(goal.targetAmount - goal.contributions.reduce((s, c) => s + c.amount, 0), 0), data.preferences.currency)}`}>
      <form onSubmit={submit} noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Amount" htmlFor="contrib-amount" error={error?.includes('Contribution') ? error : undefined}>
            <Input id="contrib-amount" type="number" min="0" step="0.01" inputMode="decimal" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </Field>
          <Field label="Date" htmlFor="contrib-date" error={error?.includes('date') ? error : undefined}>
            <Input id="contrib-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Note (optional)" htmlFor="contrib-note" className="sm:col-span-2">
            <Textarea id="contrib-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Bonus, round-up savings" />
          </Field>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">
            <Flag size={15} aria-hidden /> Add contribution
          </Button>
        </div>
      </form>
    </Modal>
  );
}
