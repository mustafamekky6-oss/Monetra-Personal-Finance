import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ArrowRight, FlaskConical, Plus, Scale, Sparkles, Target } from 'lucide-react';
import { useAppStore } from '@/store/AppStore';
import { usePageMeta } from '@/components/layout/AppShell';
import { useCategoryLookup } from '@/store/AppStore';
import { PageHeader, Amount } from '@/components/ui/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { TransactionFormModal } from '@/features/transactions/TransactionFormModal';
import { formatMoney, formatPercent } from '@/lib/format';
import { formatDate, lastMonths, financialMonthRange, addMonths, todayISO } from '@/lib/date';
import {
  budgetStatuses,
  monthlyFlowSeries,
  netCashflow,
  recurringMonthlyAmount,
  savingsRate,
  spendingByCategory,
  totalByType,
  upcomingPayments,
} from '@/utils/finance';
import { generateInsights } from '@/utils/insights';
import { CHART_COLORS, CATEGORY_HEX, ThemedTooltip } from '@/components/charts/chartTheme';
import type { DateRange } from '@/types';

const RANGE_OPTIONS: Array<{ key: string; label: string; months: number }> = [
  { key: 'this-month', label: 'This month', months: 1 },
  { key: '3m', label: '3 months', months: 3 },
  { key: '6m', label: '6 months', months: 6 },
  { key: '12m', label: '12 months', months: 12 },
];

export function DashboardPage() {
  usePageMeta('Overview');
  const { data } = useAppStore();
  const categoryOf = useCategoryLookup();
  const { preferences, transactions, budgets, recurring, goals, categories } = data;
  const [rangeKey, setRangeKey] = useState('3m');
  const [formOpen, setFormOpen] = useState(false);

  const currency = preferences.currency;
  const today = todayISO();

  /* Current + previous financial month (drives stat cards). */
  const thisMonth = useMemo(() => {
    const { start, end } = financialMonthRange(today, preferences.monthStartDay);
    return { start, end };
  }, [today, preferences.monthStartDay]);
  const prevMonth = useMemo(() => {
    const anchor = addMonths(today, -1);
    const { start, end } = financialMonthRange(anchor, preferences.monthStartDay);
    return { start, end };
  }, [today, preferences.monthStartDay]);

  const inRange = (start: string, end: string) =>
    transactions.filter((t) => t.date >= start && t.date <= end);

  const thisMonthTx = inRange(thisMonth.start, thisMonth.end);
  const prevMonthTx = inRange(prevMonth.start, prevMonth.end);

  const income = totalByType(thisMonthTx, 'income');
  const prevIncome = totalByType(prevMonthTx, 'income');
  const expenses = totalByType(thisMonthTx, 'expense');
  const prevExpenses = totalByType(prevMonthTx, 'expense');
  const net = netCashflow(thisMonthTx);
  const rate = savingsRate(thisMonthTx);
  const balance = netCashflow(transactions); // all-time ≈ current balance

  /* Chart series for selected range. */
  const months = useMemo(
    () => lastMonths(today, RANGE_OPTIONS.find((r) => r.key === rangeKey)?.months ?? 3),
    [today, rangeKey],
  );
  const flowSeries = useMemo(() => monthlyFlowSeries(transactions, months), [transactions, months]);
  const chartRange: DateRange = useMemo(
    () => ({
      start: rangeKey === 'this-month' ? thisMonth.start : months[0]?.start ?? thisMonth.start,
      end: rangeKey === 'this-month' ? thisMonth.end : months[months.length - 1]?.end ?? thisMonth.end,
      label: rangeKey,
    }),
    [rangeKey, months, thisMonth],
  );
  const rangeTx = inRange(chartRange.start, chartRange.end);
  const categorySpend = useMemo(() => spendingByCategory(rangeTx, categories), [rangeTx, categories]);

  const budgetLines = useMemo(
    () => budgetStatuses(budgets, categories, transactions, preferences.monthStartDay, today).slice(0, 4),
    [budgets, categories, transactions, preferences.monthStartDay, today],
  );

  const upcoming = useMemo(() => upcomingPayments(recurring, categories, today, 30).slice(0, 5), [recurring, categories, today]);

  const recent = useMemo(
    () => transactions.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6),
    [transactions],
  );

  const insights = useMemo(() => generateInsights(data, today).slice(0, 3), [data, today]);

  const activeGoals = goals
    .map((g) => ({
      goal: g,
      saved: g.contributions.reduce((s, c) => s + c.amount, 0),
    }))
    .sort((a, b) => b.saved / b.goal.targetAmount - a.saved / a.goal.targetAmount)
    .slice(0, 3);

  const monthlyRecurringTotal = recurring
    .filter((r) => r.active && r.type === 'expense')
    .reduce((s, r) => s + recurringMonthlyAmount(r), 0);

  const fmt = (v: number) => formatMoney(v, currency);
  const dateFmt = (iso: string) => formatDate(iso, preferences.dateFormat);

  return (
    <div className="animate-rise">
      <PageHeader
        eyebrow="Overview"
        title="Your financial picture"
        description="Everything below is computed live from your transaction records — nothing is hardcoded."
        actions={
          <>
            <div className="flex rounded-(--radius-input) border border-white/12 p-1" role="group" aria-label="Date range">
              {RANGE_OPTIONS.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setRangeKey(option.key)}
                  aria-pressed={rangeKey === option.key}
                  className={`rounded-[6px] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors duration-200 ${
                    rangeKey === option.key ? 'bg-pure text-void' : 'text-ash hover:text-cloud'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <Button onClick={() => setFormOpen(true)} withArrow>
              Record transaction
            </Button>
          </>
        }
      />

      {/* Summary row */}
      <section aria-label="Financial summary" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Total balance" value={balance} icon={<Sparkles size={15} aria-hidden />} compareText="All time" />
        <StatCard label="Income · this month" value={income} compareWith={prevIncome} increaseIsGood />
        <StatCard label="Expenses · this month" value={expenses} compareWith={prevExpenses} increaseIsGood={false} />
        <StatCard label="Net cash flow" value={net} compareText={net >= 0 ? 'Surplus' : 'Deficit'} />
        {/* The single silver inverted block — savings rate spotlight */}
        <div className="rounded-(--radius-card) bg-silver p-6 text-void sm:col-span-2 xl:col-span-1">
          <div className="flex items-center justify-between">
            <span className="label-mono text-void/70">Savings rate</span>
          </div>
          <p className="mt-3 font-mono text-2xl tabular-nums sm:text-[28px]">
            {rate === null ? '—' : formatPercent(rate)}
          </p>
          <p className="mt-2 font-mono text-[11px] text-void/70">
            {rate === null
              ? 'No income recorded this month yet'
              : rate >= 20
                ? 'Meeting the 20% guideline'
                : rate >= 0
                  ? 'Below the 20% guideline'
                  : 'Spending exceeds income'}
          </p>
        </div>
      </section>

      {/* Quick actions — chromatic tiles, color is the differentiator */}
      <section aria-label="Quick actions" className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <QuickTile
          color="#847dff"
          title="Add expense"
          description="Log a spending record in seconds"
          icon={<Plus size={20} aria-hidden />}
          onClick={() => setFormOpen(true)}
        />
        <Link to="/budgets" className="group" aria-label="Open budgets">
          <QuickTile
            color="#00b3dd"
            title="Set a budget"
            description="Cap a category and track utilization"
            icon={<Scale size={20} aria-hidden />}
            as="div"
          />
        </Link>
        <Link to="/goals" className="group" aria-label="Open goals">
          <QuickTile
            color="#dd90d8"
            title="New goal"
            description="Plan a target and contribute over time"
            icon={<Target size={20} aria-hidden />}
            as="div"
          />
        </Link>
        <Link to="/simulator" className="group" aria-label="Open simulator">
          <QuickTile
            color="#90b8f0"
            title="Simulate"
            description="Project a what-if income scenario"
            icon={<FlaskConical size={20} aria-hidden />}
            as="div"
          />
        </Link>
      </section>

      {/* Charts */}
      <section className="mt-6 grid gap-3 xl:grid-cols-5">
        <Card padding="lg" className="xl:col-span-3">
          <CardHeader
            title="Income versus expenses"
            subtitle={
              rangeKey === 'this-month' ? 'Current financial month' : `Monthly totals — last ${months.length} months`
            }
          />
          <div className="h-64" role="img" aria-label={`Bar chart of monthly income and expenses for the last ${months.length} months`}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={flowSeries} barGap={4} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
                <XAxis dataKey="label" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} width={64} tickFormatter={(v: number) => formatMoney(v, currency, { compact: true })} />
                <RechartsTooltip content={<ThemedTooltip formatter={fmt} />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                <Bar dataKey="income" name="Income" fill={CHART_COLORS.income} radius={[3, 3, 0, 0]} maxBarSize={26} />
                <Bar dataKey="expenses" name="Expenses" fill={CHART_COLORS.expense} radius={[3, 3, 0, 0]} maxBarSize={26} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card padding="lg" className="xl:col-span-2">
          <CardHeader title="Spending breakdown" subtitle={rangeKey === 'this-month' ? 'This month by category' : 'Selected range by category'} />
          {categorySpend.length === 0 ? (
            <EmptyState
              title="No expenses in range"
              description="Record an expense to see the category breakdown here."
            />
          ) : (
            <div className="flex flex-col items-center gap-6 sm:flex-row">
              <div className="h-44 w-44 shrink-0" role="img" aria-label="Donut chart of spending share by category">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categorySpend}
                      dataKey="amount"
                      nameKey="name"
                      innerRadius={52}
                      outerRadius={74}
                      paddingAngle={2}
                      stroke="none"
                    >
                      {categorySpend.map((entry) => (
                        <Cell key={entry.categoryId} fill={CATEGORY_HEX[entry.color] ?? '#847dff'} />
                      ))}
                    </Pie>
                    <RechartsTooltip content={<ThemedTooltip formatter={fmt} />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="w-full flex-1 space-y-2">
                {categorySpend.slice(0, 5).map((c) => (
                  <li key={c.categoryId} className="flex items-center justify-between gap-3 text-sm">
                    <span className="flex min-w-0 items-center gap-2.5 text-cloud">
                      <span
                        className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: CATEGORY_HEX[c.color] ?? '#847dff' }}
                        aria-hidden
                      />
                      <span className="truncate">{c.name}</span>
                    </span>
                    <span className="shrink-0 font-mono text-xs tabular-nums text-ash">
                      {c.share === null ? '—' : `${c.share.toFixed(0)}%`} · {fmt(c.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      </section>

      {/* Budgets + upcoming recurring */}
      <section className="mt-6 grid gap-3 xl:grid-cols-2">
        <Card padding="lg">
          <CardHeader
            title="Budget progress"
            subtitle="Current financial month, derived from actual transactions"
            action={
              <Link to="/budgets" className="font-mono text-[11px] uppercase tracking-[0.14em] text-cyan-signal hover:underline">
                All budgets
              </Link>
            }
          />
          {budgetLines.length === 0 ? (
            <EmptyState
              title="No budgets yet"
              description="Set a monthly limit per category to track utilization."
              action={
                <Link to="/budgets">
                  <Button size="sm" variant="ghost">Create a budget</Button>
                </Link>
              }
            />
          ) : (
            <ul className="space-y-5">
              {budgetLines.map((line) => {
                const util = line.utilization ?? 0;
                return (
                  <li key={line.budget.id}>
                    <div className="mb-1.5 flex items-baseline justify-between gap-3">
                      <span className="flex items-center gap-2 text-sm text-cloud">
                        <CategoryIcon name={line.category?.icon ?? 'CircleDollarSign'} size={14} />
                        {line.category?.name ?? 'Uncategorized'}
                      </span>
                      <span className="font-mono text-xs tabular-nums text-ash">
                        {fmt(line.spent)} / {fmt(line.limit)}
                        {line.utilization !== null && (
                          <span className={`ml-2 ${line.status === 'over-budget' ? 'text-orchid-bloom' : line.status === 'near-limit' ? 'text-pale-iris' : 'text-cyan-signal'}`}>
                            {util.toFixed(0)}%
                          </span>
                        )}
                      </span>
                    </div>
                    <PctBar value={line.utilization} color={line.category?.color} />
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card padding="lg">
          <CardHeader
            title="Upcoming recurring"
            subtitle={`Next 30 days · ~${fmt(monthlyRecurringTotal)} monthly total`}
            action={
              <Link to="/recurring" className="font-mono text-[11px] uppercase tracking-[0.14em] text-cyan-signal hover:underline">
                Manage
              </Link>
            }
          />
          {upcoming.length === 0 ? (
            <EmptyState
              title="No upcoming payments"
              description="Active recurring definitions will project their next dates here."
              action={
                <Link to="/recurring">
                  <Button size="sm" variant="ghost">Add recurring</Button>
                </Link>
              }
            />
          ) : (
            <ul className="divide-y divide-white/6">
              {upcoming.map((p, index) => (
                <li key={`${p.recurring.id}-${index}`} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-cloud">{p.recurring.description}</p>
                    <p className="mt-0.5 font-mono text-[11px] text-fog">
                      {dateFmt(p.date)} · {p.categoryName}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge tone={p.recurring.type === 'income' ? 'income' : 'expense'}>
                      {p.recurring.frequency}
                    </Badge>
                    <span className="font-mono text-sm tabular-nums text-pure">{fmt(p.amount)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      {/* Recent transactions + goals + insights */}
      <section className="mt-6 grid gap-3 xl:grid-cols-3">
        <Card padding="lg">
          <CardHeader
            title="Recent activity"
            action={
              <Link to="/transactions" className="font-mono text-[11px] uppercase tracking-[0.14em] text-cyan-signal hover:underline">
                View all
              </Link>
            }
          />
          {recent.length === 0 ? (
            <EmptyState
              title="Nothing recorded yet"
              description="Your latest transactions will appear here once you log them."
            />
          ) : (
            <ul className="divide-y divide-white/6">
              {recent.map((t) => {
                const cat = categoryOf(t.categoryId);
                return (
                  <li key={t.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/6 text-ash">
                        <CategoryIcon name={cat.icon} size={14} />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm text-cloud">{t.description}</p>
                        <p className="mt-0.5 font-mono text-[11px] text-fog">
                          {dateFmt(t.date)} · {cat.name}
                        </p>
                      </div>
                    </div>
                    <Amount
                      type={t.type}
                      value={formatMoney(t.amount, currency, { signed: true })}
                      className="shrink-0"
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card padding="lg">
          <CardHeader
            title="Goals in motion"
            action={
              <Link to="/goals" className="font-mono text-[11px] uppercase tracking-[0.14em] text-cyan-signal hover:underline">
                All goals
              </Link>
            }
          />
          {activeGoals.length === 0 ? (
            <EmptyState
              title="No goals set"
              description="Give your savings a destination — create a goal."
              action={
                <Link to="/goals">
                  <Button size="sm" variant="ghost">Create a goal</Button>
                </Link>
              }
            />
          ) : (
            <ul className="space-y-5">
              {activeGoals.map(({ goal, saved }) => {
                const pct = goal.targetAmount > 0 ? Math.min((saved / goal.targetAmount) * 100, 100) : 0;
                return (
                  <li key={goal.id}>
                    <div className="mb-1.5 flex items-baseline justify-between gap-3">
                      <span className="truncate text-sm text-cloud">{goal.name}</span>
                      <span className="shrink-0 font-mono text-xs tabular-nums text-ash">
                        {fmt(saved)} / {fmt(goal.targetAmount)}
                      </span>
                    </div>
                    <PctBar value={pct} color="cyan" />
                    <p className="mt-1.5 font-mono text-[11px] text-fog">
                      {pct.toFixed(0)}% funded · target {dateFmt(goal.targetDate)}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card padding="lg">
          <CardHeader
            title="Insights"
            subtitle="Rule-based, computed from your data"
            action={
              <Link to="/insights" className="font-mono text-[11px] uppercase tracking-[0.14em] text-cyan-signal hover:underline">
                All insights
              </Link>
            }
          />
          <ul className="space-y-4">
            {insights.map((insight) => (
              <li key={insight.id} className="rounded-(--radius-input) bg-abyss/70 p-3.5">
                <p className="text-sm leading-relaxed text-cloud">{insight.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-ash">{insight.detail}</p>
                {insight.href && (
                  <Link
                    to={insight.href}
                    className="mt-2 inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.14em] text-cyan-signal hover:underline"
                  >
                    {insight.hrefLabel ?? 'Open'} <ArrowRight size={11} aria-hidden />
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </Card>
      </section>

      <TransactionFormModal open={formOpen} onClose={() => setFormOpen(false)} />
    </div>
  );
}

/** Small local alias — budget/goal bars share styling with the shared ProgressBar. */
function PctBar({ value, color }: { value: number | null; color?: string }) {
  return <ProgressBar value={value} color={color} label="progress" />;
}

function QuickTile({
  color,
  title,
  description,
  icon,
  onClick,
  as = 'button',
}: {
  color: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick?: () => void;
  as?: 'button' | 'div';
}) {
  const className =
    'flex h-full flex-col gap-6 rounded-(--radius-tile) p-5 text-left transition-transform duration-200 ease-out hover:-translate-y-0.5 sm:p-6';
  const style = { backgroundColor: color };
  if (as === 'button') {
    return (
      <button type="button" onClick={onClick} className={className} style={style}>
        <span className="text-white/85">{icon}</span>
        <span>
          <span className="block font-display text-[19px] leading-tight text-white sm:text-[22px]">{title}</span>
          <span className="mt-1 block text-[13px] leading-snug text-white/80">{description}</span>
        </span>
      </button>
    );
  }
  return (
    <div className={`${className} h-full cursor-pointer`} style={style}>
      <span className="text-white/85">{icon}</span>
      <span>
        <span className="block font-display text-[19px] leading-tight text-white sm:text-[22px]">{title}</span>
        <span className="mt-1 block text-[13px] leading-snug text-white/80">{description}</span>
      </span>
    </div>
  );
}
