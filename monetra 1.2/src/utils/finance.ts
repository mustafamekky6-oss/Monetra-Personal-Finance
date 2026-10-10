import type {
  Budget,
  Category,
  DateRange,
  FinancialGoal,
  Frequency,
  RecurringTransaction,
  Transaction,
  TransactionType,
} from '@/types';
import { addDays, addMonths, diffDays, diffMonths, financialMonthRange, todayISO } from '@/lib/date';
import { roundMoney } from '@/lib/id';

/* ------------------------------------------------------------------ *
 * Periods & basic totals
 * ------------------------------------------------------------------ */

export function transactionsInRange(transactions: Transaction[], range: DateRange): Transaction[] {
  return transactions.filter((t) => t.date >= range.start && t.date <= range.end);
}

export function totalByType(transactions: Transaction[], type: TransactionType): number {
  return roundMoney(
    transactions.filter((t) => t.type === type).reduce((sum, t) => sum + t.amount, 0),
  );
}

export function netCashflow(transactions: Transaction[]): number {
  return roundMoney(totalByType(transactions, 'income') - totalByType(transactions, 'expense'));
}

/** Savings rate = (income − expenses) / income. Returns null when income is 0. */
export function savingsRate(transactions: Transaction[]): number | null {
  const income = totalByType(transactions, 'income');
  if (income <= 0) return null;
  return roundMoney(((income - totalByType(transactions, 'expense')) / income) * 100);
}

export interface CategorySpend {
  categoryId: string;
  name: string;
  color: string;
  amount: number;
  share: number | null; // % of expenses; null when no expenses
  transactionCount: number;
}

export function spendingByCategory(
  transactions: Transaction[],
  categories: Category[],
  type: TransactionType = 'expense',
): CategorySpend[] {
  const total = totalByType(transactions, type);
  const byId = new Map(categories.map((c) => [c.id, c]));
  const acc = new Map<string, { amount: number; count: number }>();
  for (const t of transactions) {
    if (t.type !== type) continue;
    const entry = acc.get(t.categoryId) ?? { amount: 0, count: 0 };
    entry.amount += t.amount;
    entry.count += 1;
    acc.set(t.categoryId, entry);
  }
  return [...acc.entries()]
    .map(([categoryId, { amount, count }]) => {
      const category = byId.get(categoryId);
      return {
        categoryId,
        name: category?.name ?? 'Uncategorized',
        color: category?.color ?? 'iris',
        amount: roundMoney(amount),
        share: total > 0 ? roundMoney((amount / total) * 100) : null,
        transactionCount: count,
      };
    })
    .sort((a, b) => b.amount - a.amount);
}

/** Largest single transactions of one type, descending. */
export function largestTransactions(transactions: Transaction[], type: TransactionType, count = 5): Transaction[] {
  return transactions
    .filter((t) => t.type === type)
    .slice()
    .sort((a, b) => b.amount - a.amount)
    .slice(0, count);
}

/* ------------------------------------------------------------------ *
 * Month-over-month
 * ------------------------------------------------------------------ */

export interface MonthDelta {
  current: number;
  previous: number;
  delta: number;
  deltaPercent: number | null; // null when previous is 0
}

export function monthDelta(current: number, previous: number): MonthDelta {
  const delta = roundMoney(current - previous);
  const deltaPercent = previous === 0 ? null : roundMoney((delta / Math.abs(previous)) * 100);
  return { current, previous, delta, deltaPercent };
}

/* ------------------------------------------------------------------ *
 * Budgets
 * ------------------------------------------------------------------ */

export type BudgetStatus = 'on-track' | 'near-limit' | 'over-budget';

export interface BudgetStatusLine {
  budget: Budget;
  category: Category | undefined;
  spent: number;
  limit: number;
  remaining: number;
  /** 0..100+, may exceed 100 when over budget. */
  utilization: number | null;
  status: BudgetStatus;
  /** Days left in the financial month; used for pace guidance. */
  daysLeft: number;
}

export const NEAR_LIMIT_THRESHOLD = 80; // % utilization considered "near limit"

export function budgetStatuses(
  budgets: Budget[],
  categories: Category[],
  transactions: Transaction[],
  monthStartDay: number,
  today = todayISO(),
): BudgetStatusLine[] {
  const { start, end } = financialMonthRange(today, monthStartDay);
  const monthTx = transactions.filter((t) => t.date >= start && t.date <= end && t.type === 'expense');
  const daysLeft = Math.max(diffDays(today, end), 0);
  return budgets
    .map((budget) => {
      const spent = roundMoney(
        monthTx.filter((t) => t.categoryId === budget.categoryId).reduce((s, t) => s + t.amount, 0),
      );
      const utilization = budget.monthlyLimit > 0 ? roundMoney((spent / budget.monthlyLimit) * 100) : null;
      const status: BudgetStatus =
        spent > budget.monthlyLimit
          ? 'over-budget'
          : (utilization ?? 0) >= NEAR_LIMIT_THRESHOLD
            ? 'near-limit'
            : 'on-track';
      return {
        budget,
        category: categories.find((c) => c.id === budget.categoryId),
        spent,
        limit: budget.monthlyLimit,
        remaining: roundMoney(budget.monthlyLimit - spent),
        utilization,
        status,
        daysLeft,
      };
    })
    .sort((a, b) => (b.utilization ?? 0) - (a.utilization ?? 0));
}

/** Per-category spend history for the months covered by `months`. */
export function categoryMonthlySpend(
  categoryId: string,
  transactions: Transaction[],
  months: Array<{ start: string; end: string }>,
): number[] {
  return months.map((m) =>
    roundMoney(
      transactions
        .filter((t) => t.categoryId === categoryId && t.type === 'expense' && t.date >= m.start && t.date <= m.end)
        .reduce((s, t) => s + t.amount, 0),
    ),
  );
}

/* ------------------------------------------------------------------ *
 * Recurring schedules
 * ------------------------------------------------------------------ */

const FREQUENCY_STEP: Record<Frequency, { unit: 'days' | 'months'; value: number }> = {
  weekly: { unit: 'days', value: 7 },
  monthly: { unit: 'months', value: 1 },
  quarterly: { unit: 'months', value: 3 },
  yearly: { unit: 'months', value: 12 },
};

export function advanceSchedule(iso: string, frequency: Frequency): string {
  const step = FREQUENCY_STEP[frequency];
  return step.unit === 'days' ? addDays(iso, step.value) : addMonths(iso, step.value);
}

/** All occurrences in [start, end], at most `cap` entries. */
export function recurringOccurrences(
  recurring: RecurringTransaction,
  start: string,
  end: string,
  cap = 520,
): string[] {
  const dates: string[] = [];
  let cursor = recurring.nextDate;
  // Fast-forward past occurrences older than the window start.
  let guard = 0;
  while (cursor < start && guard < cap) {
    cursor = advanceSchedule(cursor, recurring.frequency);
    guard += 1;
  }
  while (cursor <= end && dates.length < cap) {
    dates.push(cursor);
    cursor = advanceSchedule(cursor, recurring.frequency);
  }
  return dates;
}

export interface UpcomingPayment {
  recurring: RecurringTransaction;
  date: string;
  amount: number;
  categoryName: string;
}

export function upcomingPayments(
  recurring: RecurringTransaction[],
  categories: Category[],
  fromISO: string,
  days = 30,
): UpcomingPayment[] {
  const end = addDays(fromISO, days);
  const byId = new Map(categories.map((c) => [c.id, c]));
  return recurring
    .filter((r) => r.active)
    .flatMap((r) =>
      recurringOccurrences(r, fromISO, end).map((date) => ({
        recurring: r,
        date,
        amount: r.amount,
        categoryName: byId.get(r.categoryId)?.name ?? 'Uncategorized',
      })),
    )
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Normalized monthly cost of a recurring item (approximation, 30.44-day month). */
export function recurringMonthlyAmount(recurring: RecurringTransaction): number {
  const perYear: Record<Frequency, number> = { weekly: 52, monthly: 12, quarterly: 4, yearly: 1 };
  return roundMoney((recurring.amount * perYear[recurring.frequency]) / 12);
}

/* ------------------------------------------------------------------ *
 * Goals
 * ------------------------------------------------------------------ */

export interface GoalProgress {
  goal: FinancialGoal;
  saved: number;
  remaining: number;
  progressPercent: number | null; // null when target is 0
  /** Required monthly contribution to finish on time; null when no time left. */
  requiredMonthly: number | null;
  monthsLeft: number;
  /** Is the goal achievable given saved amount + remaining time? */
  onTrack: boolean;
  latestContribution?: { amount: number; date: string };
}

export function goalProgress(goal: FinancialGoal, today = todayISO()): GoalProgress {
  const saved = roundMoney(goal.contributions.reduce((s, c) => s + c.amount, 0));
  const remaining = roundMoney(Math.max(goal.targetAmount - saved, 0));
  const progressPercent = goal.targetAmount > 0 ? roundMoney((saved / goal.targetAmount) * 100) : null;
  const monthsLeft = Math.max(diffMonths(today, goal.targetDate), 0);
  const requiredMonthly = monthsLeft > 0 ? roundMoney(remaining / monthsLeft) : null;
  const onTrack = remaining === 0;
  const sorted = [...goal.contributions].sort((a, b) => b.date.localeCompare(a.date));
  return {
    goal,
    saved,
    remaining,
    progressPercent,
    requiredMonthly,
    monthsLeft,
    onTrack,
    latestContribution: sorted[0],
  };
}

/** A goal is realistic when required monthly contribution is plausible relative to history. */
export function goalFeasibility(goal: FinancialGoal, avgMonthlyIncome: number, today = todayISO()): {
  status: 'completed' | 'on-track' | 'at-risk' | 'behind';
  requiredMonthly: number | null;
  monthsLeft: number;
} {
  const p = goalProgress(goal, today);
  if (p.remaining === 0) return { status: 'completed', requiredMonthly: null, monthsLeft: p.monthsLeft };
  if (p.requiredMonthly === null) return { status: 'at-risk', requiredMonthly: null, monthsLeft: 0 };
  // Rule of thumb: contributions above 40% of income are flagged at-risk.
  const burden = avgMonthlyIncome > 0 ? (p.requiredMonthly / avgMonthlyIncome) * 100 : null;
  const status = burden !== null && burden > 40 ? 'at-risk' : 'on-track';
  return { status, requiredMonthly: p.requiredMonthly, monthsLeft: p.monthsLeft };
}

/* ------------------------------------------------------------------ *
 * Cash-flow series
 * ------------------------------------------------------------------ */

export interface MonthlyFlowPoint {
  label: string;
  income: number;
  expenses: number;
  net: number;
}

export function monthlyFlowSeries(
  transactions: Transaction[],
  months: Array<{ start: string; end: string; label: string }>,
): MonthlyFlowPoint[] {
  return months.map((m) => {
    const inRange = transactions.filter((t) => t.date >= m.start && t.date <= m.end);
    const income = totalByType(inRange, 'income');
    const expenses = totalByType(inRange, 'expense');
    return { label: m.label, income, expenses, net: roundMoney(income - expenses) };
  });
}

/** Average monthly income over the observed months (for goal feasibility). */
export function averageMonthlyIncome(transactions: Transaction[], monthsCount: number): number {
  if (monthsCount <= 0) return 0;
  const income = totalByType(transactions, 'income');
  return roundMoney(income / monthsCount);
}
