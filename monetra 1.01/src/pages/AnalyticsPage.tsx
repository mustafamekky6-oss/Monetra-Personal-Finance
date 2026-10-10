import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ArrowUpRight, CircleDollarSign } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAppStore, useCategoryLookup } from '@/store/AppStore';
import { usePageMeta } from '@/components/layout/AppShell';
import { PageHeader, Amount } from '@/components/ui/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatMoney, formatPercent } from '@/lib/format';
import { formatDate, lastMonths, todayISO } from '@/lib/date';
import {
  averageMonthlyIncome,
  categoryMonthlySpend,
  largestTransactions,
  monthlyFlowSeries,
  netCashflow,
  savingsRate,
  spendingByCategory,
  totalByType,
} from '@/utils/finance';
import { CATEGORY_HEX, CHART_COLORS, ThemedTooltip } from '@/components/charts/chartTheme';

const RANGE_MONTHS = [3, 6, 12] as const;

export default function AnalyticsPage() {
  usePageMeta('Analytics');
  const { data } = useAppStore();
  const categoryOf = useCategoryLookup();
  const [monthsCount, setMonthsCount] = useState<(typeof RANGE_MONTHS)[number]>(6);

  const currency = data.preferences.currency;
  const fmt = (v: number) => formatMoney(v, currency);
  const today = todayISO();

  const months = useMemo(() => lastMonths(today, monthsCount), [today, monthsCount]);
  const rangeStart = months[0]?.start ?? today;
  const rangeTx = useMemo(
    () => data.transactions.filter((t) => t.date >= rangeStart),
    [data.transactions, rangeStart],
  );

  const flow = useMemo(() => monthlyFlowSeries(data.transactions, months), [data.transactions, months]);
  const cumulative = useMemo(() => {
    let running = 0;
    return flow.map((point) => {
      running += point.net;
      return { label: point.label, balance: Math.round(running * 100) / 100 };
    });
  }, [flow]);

  const categorySpend = useMemo(() => spendingByCategory(rangeTx, data.categories), [rangeTx, data.categories]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const activeCategory = selectedCategory ?? categorySpend[0]?.categoryId ?? null;
  const activeCategoryData = useMemo(
    () =>
      months.map((m, i) => ({
        label: m.label,
        amount: activeCategory
          ? categoryMonthlySpend(activeCategory, data.transactions, months)[i]
          : 0,
      })),
    [activeCategory, data.transactions, months],
  );

  const income = totalByType(rangeTx, 'income');
  const expenses = totalByType(rangeTx, 'expense');
  const rate = savingsRate(rangeTx);
  const avgIncome = averageMonthlyIncome(rangeTx, monthsCount);

  const largest = useMemo(() => largestTransactions(rangeTx, 'expense', 5), [rangeTx]);
  const bestMonth = useMemo(
    () => flow.reduce((best, m) => (m.net > (best?.net ?? -Infinity) ? m : best), flow[0]),
    [flow],
  );
  const worstMonth = useMemo(
    () => flow.reduce((worst, m) => (m.net < (worst?.net ?? Infinity) ? m : worst), flow[0]),
    [flow],
  );

  const dateFmt = (iso: string) => formatDate(iso, data.preferences.dateFormat);

  return (
    <div className="animate-rise">
      <PageHeader
        eyebrow="Intelligence"
        title="Financial analytics"
        description="Trends, composition and cash-flow analysis over time. Every figure derives from your ledger."
        actions={
          <div className="flex rounded-(--radius-input) border border-white/12 p-1" role="group" aria-label="Analysis range">
            {RANGE_MONTHS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMonthsCount(m)}
                aria-pressed={monthsCount === m}
                className={`rounded-[6px] px-3.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors duration-200 ${
                  monthsCount === m ? 'bg-pure text-void' : 'text-ash hover:text-cloud'
                }`}
              >
                {m} months
              </button>
            ))}
          </div>
        }
      />

      {data.transactions.length === 0 ? (
        <EmptyState
          icon={<CircleDollarSign size={28} aria-hidden />}
          title="Nothing to analyze yet"
          description="Analytics need at least one transaction. Record a few and this page comes alive."
          action={
            <Link to="/transactions">
              <Button withArrow>Go to transactions</Button>
            </Link>
          }
        />
      ) : (
        <>
          <section aria-label="Period summary" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Card padding="lg">
              <p className="label-mono text-ash">Income · {monthsCount}M</p>
              <p className="mt-3 font-mono text-xl tabular-nums text-pure sm:text-2xl">{fmt(income)}</p>
              <p className="mt-2 font-mono text-[11px] text-fog">Avg {fmt(avgIncome)}/month</p>
            </Card>
            <Card padding="lg">
              <p className="label-mono text-ash">Expenses · {monthsCount}M</p>
              <p className="mt-3 font-mono text-xl tabular-nums text-pure sm:text-2xl">{fmt(expenses)}</p>
              <p className="mt-2 font-mono text-[11px] text-fog">Avg {fmt(monthsCount > 0 ? expenses / monthsCount : 0)}/month</p>
            </Card>
            <Card padding="lg">
              <p className="label-mono text-ash">Net cash flow</p>
              <p className={`mt-3 font-mono text-xl tabular-nums sm:text-2xl ${netCashflow(rangeTx) >= 0 ? 'text-cyan-signal' : 'text-orchid-bloom'}`}>
                {fmt(netCashflow(rangeTx))}
              </p>
              <p className="mt-2 font-mono text-[11px] text-fog">
                Best {bestMonth?.label} · worst {worstMonth?.label}
              </p>
            </Card>
            <Card padding="lg">
              <p className="label-mono text-ash">Savings rate</p>
              <p className="mt-3 font-mono text-xl tabular-nums text-pure sm:text-2xl">{rate === null ? '—' : formatPercent(rate, 1)}</p>
              <p className="mt-2 font-mono text-[11px] text-fog">
                {rate === null ? 'No income in range' : 'Across the selected period'}
              </p>
            </Card>
          </section>

          <section className="mt-6 grid gap-3 xl:grid-cols-2">
            <Card padding="lg">
              <CardHeader title="Income vs expenses over time" subtitle={`Monthly totals across ${monthsCount} months`} />
              <div className="h-72" role="img" aria-label={`Line chart comparing monthly income and expenses over ${monthsCount} months`}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={flow} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                    <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
                    <XAxis dataKey="label" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} width={64} tickFormatter={(v: number) => formatMoney(v, currency, { compact: true })} />
                    <RechartsTooltip content={<ThemedTooltip formatter={fmt} />} />
                    <Line type="monotone" dataKey="income" name="Income" stroke={CHART_COLORS.income} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                    <Line type="monotone" dataKey="expenses" name="Expenses" stroke={CHART_COLORS.expense} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                    <Line type="monotone" dataKey="net" name="Net" stroke={CHART_COLORS.net} strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card padding="lg">
              <CardHeader title="Cumulative cash flow" subtitle="Running net position month over month" />
              <div className="h-72" role="img" aria-label={`Area chart of cumulative net balance over ${monthsCount} months`}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={cumulative} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                    <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
                    <XAxis dataKey="label" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} width={64} tickFormatter={(v: number) => formatMoney(v, currency, { compact: true })} />
                    <RechartsTooltip content={<ThemedTooltip formatter={fmt} />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                    <Bar dataKey="balance" name="Cumulative net" radius={[3, 3, 0, 0]} maxBarSize={34}>
                      {cumulative.map((entry, index) => (
                        <Cell key={index} fill={entry.balance >= 0 ? CHART_COLORS.net : CHART_COLORS.expense} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </section>

          <section className="mt-6 grid gap-3 xl:grid-cols-5">
            <Card padding="lg" className="xl:col-span-2">
              <CardHeader title="Spending by category" subtitle="Selected period" />
              {categorySpend.length === 0 ? (
                <EmptyState title="No expenses in range" description="Widen the range or log spending to see the mix." />
              ) : (
                <div className="h-64" role="img" aria-label={`Donut chart of expenses by category: ${categorySpend.map((c) => `${c.name} ${formatPercent(c.share ?? 0)}`).join(', ')}`}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categorySpend}
                        dataKey="amount"
                        nameKey="name"
                        innerRadius={56}
                        outerRadius={86}
                        paddingAngle={2}
                        stroke="none"
                        onClick={(entry: { payload?: { categoryId?: string } }) =>
                          entry?.payload?.categoryId && setSelectedCategory(entry.payload.categoryId)
                        }
                      >
                        {categorySpend.map((entry) => (
                          <Cell
                            key={entry.categoryId}
                            fill={CATEGORY_HEX[entry.color] ?? '#847dff'}
                            opacity={activeCategory === entry.categoryId ? 1 : 0.55}
                            cursor="pointer"
                          />
                        ))}
                      </Pie>
                      <RechartsTooltip content={<ThemedTooltip formatter={fmt} />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
              <ul className="mt-4 space-y-1.5">
                {categorySpend.slice(0, 6).map((c) => (
                  <li key={c.categoryId}>
                    <button
                      type="button"
                      onClick={() => setSelectedCategory(c.categoryId)}
                      className={`flex w-full items-center justify-between gap-3 rounded px-2 py-1 text-left text-sm transition-colors duration-200 hover:bg-white/5 ${
                        activeCategory === c.categoryId ? 'bg-white/8' : ''
                      }`}
                      aria-pressed={activeCategory === c.categoryId}
                    >
                      <span className="flex min-w-0 items-center gap-2.5 text-cloud">
                        <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: CATEGORY_HEX[c.color] ?? '#847dff' }} aria-hidden />
                        <span className="truncate">{c.name}</span>
                      </span>
                      <span className="shrink-0 font-mono text-xs tabular-nums text-ash">
                        {c.share === null ? '—' : `${c.share.toFixed(0)}%`} · {fmt(c.amount)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </Card>

            <Card padding="lg" className="xl:col-span-3">
              <CardHeader
                title="Category trend"
                subtitle={
                  activeCategory
                    ? `${categoryOf(activeCategory).name} — monthly spend across ${monthsCount} months`
                    : 'Select a category'
                }
              />
              <div className="h-64" role="img" aria-label={`Bar chart of monthly spend for the selected category`}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={activeCategoryData} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                    <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
                    <XAxis dataKey="label" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} width={64} tickFormatter={(v: number) => formatMoney(v, currency, { compact: true })} />
                    <RechartsTooltip content={<ThemedTooltip formatter={fmt} />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                    <Bar dataKey="amount" name="Spend" fill={CHART_COLORS.net} radius={[3, 3, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-fog">
                Tip: click a slice or list row above to switch category. The dashed lines elsewhere in the app always
                represent budget limits, not predictions.
              </p>
            </Card>
          </section>

          <section className="mt-6 grid gap-3 xl:grid-cols-2">
            <Card padding="lg">
              <CardHeader title="Largest expenses" subtitle={`Top 5 in the last ${monthsCount} months`} />
              {largest.length === 0 ? (
                <EmptyState title="No expenses recorded" description="Largest single expenses will be listed here." />
              ) : (
                <ol className="divide-y divide-white/6">
                  {largest.map((t, index) => (
                    <li key={t.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="w-5 shrink-0 font-mono text-xs text-fog">{index + 1}</span>
                        <div className="min-w-0">
                          <p className="truncate text-sm text-cloud">{t.description}</p>
                          <p className="mt-0.5 font-mono text-[11px] text-fog">
                            {dateFmt(t.date)} · {categoryOf(t.categoryId).name}
                          </p>
                        </div>
                      </div>
                      <Amount type="expense" value={fmt(t.amount)} className="shrink-0" />
                    </li>
                  ))}
                </ol>
              )}
            </Card>

            <Card padding="lg">
              <CardHeader title="Monthly comparison" subtitle="Month-over-month change in key metrics" />
              <div className="overflow-x-auto">
                <table className="w-full min-w-[420px] text-left">
                  <thead>
                    <tr className="border-b border-white/8">
                      {['Month', 'Income', 'Expenses', 'Net', 'Δ Net'].map((h) => (
                        <th key={h} scope="col" className="label-mono px-3 py-2.5 text-left text-fog first:pl-0 last:pr-0">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/6">
                    {flow
                      .slice()
                      .reverse()
                      .map((m, index, arr) => {
                        const prev = arr[index + 1];
                        const delta = prev ? m.net - prev.net : null;
                        return (
                          <tr key={m.label}>
                            <td className="px-3 py-3 text-sm text-cloud first:pl-0 last:pr-0">{m.label}</td>
                            <td className="px-3 py-3 font-mono text-xs tabular-nums text-ash first:pl-0 last:pr-0">{fmt(m.income)}</td>
                            <td className="px-3 py-3 font-mono text-xs tabular-nums text-ash first:pl-0 last:pr-0">{fmt(m.expenses)}</td>
                            <td className={`px-3 py-3 font-mono text-xs tabular-nums first:pl-0 last:pr-0 ${m.net >= 0 ? 'text-cyan-signal' : 'text-orchid-bloom'}`}>
                              {fmt(m.net)}
                            </td>
                            <td className="px-3 py-3 font-mono text-xs tabular-nums first:pl-0 last:pr-0">
                              {delta === null ? (
                                <span className="text-fog">—</span>
                              ) : (
                                <span className={`inline-flex items-center gap-1 ${delta >= 0 ? 'text-cyan-signal' : 'text-orchid-bloom'}`}>
                                  {delta >= 0 ? <ArrowUpRight size={11} aria-hidden /> : <ArrowUpRight size={11} className="rotate-90" aria-hidden />}
                                  {fmt(Math.abs(delta))}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </Card>
          </section>
        </>
      )}
    </div>
  );
}
