import { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { FlaskConical, RotateCcw, TrendingUp } from 'lucide-react';
import { useAppStore } from '@/store/AppStore';
import { usePageMeta } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Field, Input, Select } from '@/components/ui/FormControls';
import { formatMoney } from '@/lib/format';
import { lastMonths, todayISO } from '@/lib/date';
import { spendingByCategory } from '@/utils/finance';
import { runSimulation, type CurrentTrajectory } from '@/utils/simulation';
import { roundMoney, uid } from '@/lib/id';
import { CHART_COLORS, ThemedTooltip } from '@/components/charts/chartTheme';

const DURATION_OPTIONS = [6, 12, 24, 36] as const;

export default function SimulatorPage() {
  usePageMeta('What-If Simulator');
  const { data } = useAppStore();
  const currency = data.preferences.currency;
  const today = todayISO();
  const fmt = (v: number) => formatMoney(v, currency);

  /* Baseline: average category spend over the last 3 full months. */
  const baseline = useMemo(() => {
    const months = lastMonths(today, 3);
    const start = months[0]?.start ?? today;
    const recent = data.transactions.filter((t) => t.date >= start);
    const spend = spendingByCategory(recent, data.categories).filter((c) => c.amount > 0);
    const income = recent.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0) / 3;
    const savings = data.goals.reduce(
      (s, g) => s + (g.contributions.filter((c) => c.date >= start).reduce((cs, c) => cs + c.amount, 0)) / 3,
      0,
    );
    const trajectory: CurrentTrajectory = {
      monthlyIncome: roundMoney(income),
      categorySpend: spend.map((c) => ({ ...c, amount: roundMoney(c.amount / 3) })),
      monthlySavings: roundMoney(savings),
    };
    return trajectory;
  }, [data.transactions, data.categories, data.goals, today]);

  const [income, setIncome] = useState(baseline.monthlyIncome);
  const [multipliers, setMultipliers] = useState<Record<string, number>>({});
  const [savings, setSavings] = useState(baseline.monthlySavings);
  const [oneTimes, setOneTimes] = useState<Array<{ id: string; label: string; amount: number; monthOffset: number }>>([]);
  const [duration, setDuration] = useState<number>(12);

  // Re-sync sliders if baseline changes after data edits (only when untouched).
  const [touched, setTouched] = useState(false);
  const [baselineKey, setBaselineKey] = useState('');
  const key = `${baseline.monthlyIncome}-${baseline.monthlySavings}`;
  if (!touched && key !== baselineKey) {
    setBaselineKey(key);
    setIncome(baseline.monthlyIncome);
    setSavings(baseline.monthlySavings);
  }

  const primaryGoal = data.goals.find((g) => g.targetAmount > 0) ?? null;

  const scenario = useMemo(
    () => ({
      id: 'what-if',
      name: 'Interactive scenario',
      monthlyIncome: income,
      categoryMultipliers: multipliers,
      monthlySavings: savings,
      oneTimeExpenses: oneTimes,
      durationMonths: duration,
    }),
    [income, multipliers, savings, oneTimes, duration],
  );

  const result = useMemo(() => runSimulation(scenario, baseline, primaryGoal?.targetAmount ?? null, today), [scenario, baseline, primaryGoal, today]);

  const totalMonthlyExpenses = roundMoney(
    baseline.categorySpend.reduce((s, c) => s + c.amount * (multipliers[c.categoryId] ?? 1), 0),
  );
  const baselineExpenses = roundMoney(baseline.categorySpend.reduce((s, c) => s + c.amount, 0));

  const reset = () => {
    setTouched(false);
    setIncome(baseline.monthlyIncome);
    setMultipliers({});
    setSavings(baseline.monthlySavings);
    setOneTimes([]);
    setDuration(12);
  };

  const setMultiplier = (categoryId: string, value: number) => {
    setTouched(true);
    setMultipliers((current) => ({ ...current, [categoryId]: value }));
  };

  return (
    <div className="animate-rise">
      <PageHeader
        eyebrow="Projection lab"
        title="What-if simulator"
        description="Adjust hypothetical values and watch the projection respond instantly. Scenario changes never touch your real transaction history."
        actions={
          <Button variant="ghost" onClick={reset}>
            <RotateCcw size={15} aria-hidden /> Reset to current
          </Button>
        }
      />

      <Card padding="md" surface="plain" className="mb-4">
        <p className="text-xs leading-relaxed text-fog">
          <span className="text-ash">Assumptions:</span> monthly income and category spending stay constant; savings are
          transferred out monthly; one-time expenses hit in their chosen month; no interest, inflation or investment
          returns. Baselines are the 3-month averages of your actual records. Projections are estimates, not guarantees.
        </p>
      </Card>

      <div className="grid gap-3 xl:grid-cols-5">
        {/* Controls */}
        <div className="flex flex-col gap-3 xl:col-span-2">
          <Card padding="lg">
            <CardHeader title="Core inputs" subtitle="Adjusted live against your 3-month baseline" />
            <div className="flex flex-col gap-5">
              <div>
                <div className="mb-2 flex items-baseline justify-between">
                  <span className="label-mono text-ash">Monthly income</span>
                  <span className="font-mono text-sm tabular-nums text-pure">{fmt(income)}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={Math.max(Math.round(baseline.monthlyIncome * 2), 2000)}
                  step={50}
                  value={income}
                  onChange={(e) => {
                    setTouched(true);
                    setIncome(Number(e.target.value));
                  }}
                  className="w-full"
                  aria-label="Hypothetical monthly income"
                  style={{ ['--range-progress' as string]: `${(income / Math.max(baseline.monthlyIncome * 2, 2000)) * 100}%` }}
                />
                <p className="mt-1 font-mono text-[10px] text-fog">
                  Baseline {fmt(baseline.monthlyIncome)} —{' '}
                  {income === baseline.monthlyIncome
                    ? 'unchanged'
                    : `${income > baseline.monthlyIncome ? '+' : ''}${fmt(income - baseline.monthlyIncome)}/mo`}
                </p>
              </div>

              <div>
                <div className="mb-2 flex items-baseline justify-between">
                  <span className="label-mono text-ash">Monthly savings contribution</span>
                  <span className="font-mono text-sm tabular-nums text-pure">{fmt(savings)}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={Math.max(Math.round(baseline.monthlyIncome), 1000)}
                  step={25}
                  value={savings}
                  onChange={(e) => {
                    setTouched(true);
                    setSavings(Number(e.target.value));
                  }}
                  className="w-full"
                  aria-label="Hypothetical monthly savings contribution"
                  style={{ ['--range-progress' as string]: `${(savings / Math.max(baseline.monthlyIncome, 1000)) * 100}%` }}
                />
                <p className="mt-1 font-mono text-[10px] text-fog">Baseline {fmt(baseline.monthlySavings)}/mo toward goals</p>
              </div>

              <Field label="Simulation duration" htmlFor="sim-duration">
                <Select id="sim-duration" value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
                  {DURATION_OPTIONS.map((m) => (
                    <option key={m} value={m}>
                      {m} months
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          </Card>

          <Card padding="lg">
            <CardHeader title="Category spending" subtitle="Multiply each category's baseline spend" />
            <div className="flex max-h-80 flex-col gap-4 overflow-y-auto pr-1">
              {baseline.categorySpend.length === 0 && (
                <p className="text-sm text-ash">No expense history yet — record transactions to build a baseline.</p>
              )}
              {baseline.categorySpend.map((c) => {
                const value = multipliers[c.categoryId] ?? 1;
                return (
                  <div key={c.categoryId}>
                    <div className="mb-1.5 flex items-baseline justify-between gap-3">
                      <span className="truncate text-sm text-cloud">{c.name}</span>
                      <span className="shrink-0 font-mono text-xs tabular-nums text-ash">
                        {fmt(roundMoney(c.amount * value))}/mo
                        <span className={`ml-2 ${value > 1.001 ? 'text-orchid-bloom' : value < 0.999 ? 'text-cyan-signal' : 'text-fog'}`}>
                          ×{value.toFixed(2)}
                        </span>
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={2}
                      step={0.05}
                      value={value}
                      onChange={(e) => setMultiplier(c.categoryId, Number(e.target.value))}
                      className="w-full"
                      aria-label={`${c.name} spending multiplier`}
                      style={{ ['--range-progress' as string]: `${(value / 2) * 100}%` }}
                    />
                  </div>
                );
              })}
            </div>
          </Card>

          <Card padding="lg">
            <CardHeader title="One-time expenses" subtitle="Hit the projection in a specific month" />
            {oneTimes.length > 0 && (
              <ul className="mb-4 divide-y divide-white/6">
                {oneTimes.map((o) => (
                  <li key={o.id} className="flex items-center justify-between gap-3 py-2">
                    <span className="min-w-0 truncate text-sm text-cloud">
                      {o.label} <span className="font-mono text-[11px] text-fog">· month {o.monthOffset} · {fmt(o.amount)}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setOneTimes((current) => current.filter((x) => x.id !== o.id))}
                      aria-label={`Remove ${o.label}`}
                      className="shrink-0 font-mono text-[10px] uppercase tracking-[0.14em] text-fog hover:text-orchid-bloom"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <OneTimeForm onAdd={(entry) => setOneTimes((current) => [...current, entry])} />
          </Card>
        </div>

        {/* Results */}
        <div className="flex flex-col gap-3 xl:col-span-3">
          <section aria-label="Scenario summary" className="grid gap-3 sm:grid-cols-2">
            <Card padding="lg">
              <p className="label-mono text-ash">Projected monthly surplus</p>
              <p className={`mt-3 font-mono text-2xl tabular-nums ${result.monthlySurplus >= 0 ? 'text-cyan-signal' : 'text-orchid-bloom'}`}>
                {fmt(result.monthlySurplus)}
              </p>
              <p className="mt-2 font-mono text-[11px] text-fog">
                Income {fmt(income)} − spend {fmt(totalMonthlyExpenses)} − savings {fmt(savings)}
                {oneTimes.length > 0 ? ` − one-time ~${fmt(oneTimes.reduce((s, o) => s + o.amount, 0) / duration)}/mo` : ''}
              </p>
            </Card>
            <Card padding="lg">
              <p className="label-mono text-ash">Projected savings · {duration} months</p>
              <p className="mt-3 font-mono text-2xl tabular-nums text-pure">{fmt(result.finalSavings)}</p>
              <p className={`mt-2 font-mono text-[11px] ${result.differenceFromCurrent >= 0 ? 'text-cyan-signal' : 'text-orchid-bloom'}`}>
                {result.differenceFromCurrent === 0
                  ? 'Same as current trajectory'
                  : `${result.differenceFromCurrent > 0 ? '+' : ''}${fmt(result.differenceFromCurrent)} vs current path`}
              </p>
            </Card>
            <Card padding="lg">
              <p className="label-mono text-ash">Spending change vs baseline</p>
              <p className="mt-3 font-mono text-2xl tabular-nums text-pure">
                {totalMonthlyExpenses === baselineExpenses
                  ? 'Unchanged'
                  : `${totalMonthlyExpenses > baselineExpenses ? '+' : ''}${fmt(totalMonthlyExpenses - baselineExpenses)}`}
              </p>
              <p className="mt-2 font-mono text-[11px] text-fog">
                {fmt(totalMonthlyExpenses)}/mo vs current {fmt(baselineExpenses)}/mo
              </p>
            </Card>
            <Card padding="lg">
              <p className="label-mono text-ash">Goal completion estimate</p>
              {primaryGoal === null ? (
                <p className="mt-3 font-mono text-2xl text-fog">—</p>
              ) : result.goalCompletionMonth === null ? (
                <>
                  <p className="mt-3 font-mono text-2xl tabular-nums text-orchid-bloom">Not reached</p>
                  <p className="mt-2 font-mono text-[11px] text-fog">
                    &ldquo;{primaryGoal.name}&rdquo; target {fmt(primaryGoal.targetAmount)} within {duration} months
                  </p>
                </>
              ) : (
                <>
                  <p className="mt-3 font-mono text-2xl tabular-nums text-cyan-signal">
                    Month {result.goalCompletionMonth}
                  </p>
                  <p className="mt-2 font-mono text-[11px] text-fog">
                    &ldquo;{primaryGoal.name}&rdquo; ({fmt(primaryGoal.targetAmount)}) around{' '}
                    {new Date(result.goalCompletionDate ?? today).toLocaleDateString('en-US', {
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                </>
              )}
            </Card>
          </section>

          <Card padding="lg" className="flex-1">
            <CardHeader
              title="Projected balance"
              subtitle={`Cumulative savings pool across ${duration} months — estimate, not a guarantee`}
              action={<Badge tone="neutral">Scenario</Badge>}
            />
            {baseline.categorySpend.length === 0 ? (
              <div className="flex h-64 items-center justify-center">
                <p className="max-w-sm text-center text-sm text-ash">
                  <FlaskConical size={24} className="mx-auto mb-3 text-fog" aria-hidden />
                  Record some transactions first — the simulator builds on your spending baseline.
                </p>
              </div>
            ) : (
              <div className="h-72" role="img" aria-label={`Area chart of projected cumulative savings over ${duration} months`}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={result.months} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                    <defs>
                      <linearGradient id="surplusFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={CHART_COLORS.net} stopOpacity={0.5} />
                        <stop offset="100%" stopColor={CHART_COLORS.net} stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
                    <XAxis dataKey="label" axisLine={false} tickLine={false} />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      width={64}
                      tickFormatter={(v: number) => formatMoney(v, currency, { compact: true })}
                    />
                    <RechartsTooltip content={<ThemedTooltip formatter={fmt} labelSuffix=" (month)" />} />
                    <Area
                      type="monotone"
                      dataKey="cumulativeBalance"
                      name="Projected savings"
                      stroke={CHART_COLORS.net}
                      strokeWidth={2}
                      fill="url(#surplusFill)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
            <p className="mt-3 flex items-center gap-2 text-xs text-fog">
              <TrendingUp size={13} aria-hidden />
              Final position {fmt(result.finalSavings)} after {duration} months under this scenario.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}

function OneTimeForm({ onAdd }: { onAdd: (entry: { id: string; label: string; amount: number; monthOffset: number }) => void }) {
  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [month, setMonth] = useState('1');
  const [error, setError] = useState<string | undefined>();

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const amountNum = parseFloat(amount);
    const monthNum = parseInt(month, 10);
    if (label.trim().length < 2 || Number.isNaN(amountNum) || amountNum <= 0 || Number.isNaN(monthNum) || monthNum < 1) {
      setError('Fill in a label, a positive amount and a month (≥1).');
      return;
    }
    onAdd({ id: uid('one'), label: label.trim(), amount: roundMoney(amountNum), monthOffset: monthNum });
    setLabel('');
    setAmount('');
    setMonth('1');
    setError(undefined);
  };

  return (
    <form onSubmit={submit} noValidate>
      {error && (
        <p role="alert" className="mb-3 text-xs text-orchid-bloom">
          {error}
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-[1fr_110px_90px]">
        <Field label="Label" htmlFor="one-label">
          <Input id="one-label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. New laptop" />
        </Field>
        <Field label="Amount" htmlFor="one-amount">
          <Input id="one-amount" type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
        </Field>
        <Field label="Month #" htmlFor="one-month">
          <Input id="one-month" type="number" min="1" step="1" value={month} onChange={(e) => setMonth(e.target.value)} />
        </Field>
      </div>
      <Button type="submit" variant="glass" size="sm" className="mt-3">
        Add one-time expense
      </Button>
    </form>
  );
}
