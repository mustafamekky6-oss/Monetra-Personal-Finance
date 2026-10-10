import type {
  AppData,
  DateRange,
  FinancialInsight,
  InsightSeverity,
  Transaction,
} from '@/types';
import { diffDays, lastMonths, todayISO } from '@/lib/date';
import { formatMoney } from '@/lib/format';
import { roundMoney } from '@/lib/id';
import {
  budgetStatuses,
  goalProgress,
  netCashflow,
  recurringMonthlyAmount,
  savingsRate,
  totalByType,
  transactionsInRange,
} from './finance';

/**
 * Deterministic, rule-based insights computed from the user's own data.
 * No AI is involved — every number quoted below is derived from real records.
 * `includeBudgets` etc. are implicit via AppData.
 */

const MO_COMPARE_MONTHS = 3;

export function generateInsights(data: AppData, today = todayISO()): FinancialInsight[] {
  const insights: FinancialInsight[] = [];
  const { transactions, categories, budgets, recurring, goals, preferences } = data;
  const fmt = (value: number): string => formatMoney(value, preferences.currency);

  const months = lastMonths(today, MO_COMPARE_MONTHS);
  const currentMonth = months[months.length - 1];
  const prevMonth = months.length > 1 ? months[months.length - 2] : null;

  const currentTx = prevMonth
    ? transactions.filter((t) => t.date >= prevMonth.start)
    : transactions.filter((t) => t.date >= currentMonth.start);
  const currentRange: DateRange = prevMonth
    ? { start: prevMonth.start, end: today, label: 'Current period' }
    : { start: currentMonth.start, end: today, label: 'Current period' };

  const currentExpenses = transactionsInRange(transactions, currentRange).filter((t) => t.type === 'expense');
  const income = totalByType(
    transactions.filter((t) => t.date >= currentMonth.start && t.date <= currentMonth.end),
    'income',
  );

  /* 1 — Cashflow direction */
  const net = netCashflow(transactionsInRange(transactions, {
    start: currentMonth.start,
    end: currentMonth.end,
    label: currentMonth.label,
  }));
  insights.push({
    id: 'cashflow',
    severity: net >= 0 ? 'positive' : 'warning',
    title: net >= 0 ? `You are cash-flow positive this month (${net >= 0 ? '+' : ''}${net})` : `You are spending more than you earn this month (${net})`,
    detail: net >= 0
      ? 'Your income exceeds your expenses in the current financial month. Consider routing the surplus toward a goal.'
      : 'Expenses exceed income in the current financial month. Review the largest categories below to find room to cut.',
    href: '/analytics',
    hrefLabel: 'Open analytics',
  });

  /* 2 — Category month-over-month movers */
  if (prevMonth) {
    const prevTx = transactions.filter(
      (t) => t.date >= prevMonth.start && t.date <= prevMonth.end && t.type === 'expense',
    );
    const spendNow = sumByCategory(currentTx);
    const spendPrev = sumByCategory(prevTx);
    for (const [categoryId, amount] of spendNow) {
      const prev = spendPrev.get(categoryId) ?? 0;
      if (prev > 0) {
        const change = amount - prev;
        const pct = (change / prev) * 100;
        const category = categories.find((c) => c.id === categoryId);
        if (pct >= 25 && change >= 40) {
          insights.push({
            id: `spend-up-${categoryId}`,
            severity: pct >= 60 ? 'warning' : 'neutral',
            title: `${category?.name ?? 'A category'} spending is up ${pct.toFixed(0)}% vs last month`,
            detail: `You spent ${fmt(amount)} this month versus ${fmt(prev)} last month — a change of ${fmt(change)}.`,
            href: '/transactions',
            hrefLabel: 'Review transactions',
          });
        } else if (pct <= -25 && change <= -40) {
          insights.push({
            id: `spend-down-${categoryId}`,
            severity: 'positive',
            title: `${category?.name ?? 'A category'} spending is down ${Math.abs(pct).toFixed(0)}% vs last month`,
            detail: `You spent ${fmt(amount)} this month versus ${fmt(prev)} last month — a saving of ${fmt(Math.abs(change))}.`,
          });
        }
      }
    }
    if (spendNow.size === 0 && spendPrev.size > 0) {
      insights.push({
        id: 'no-spend',
        severity: 'positive',
        title: 'No expenses recorded yet this month',
        detail: 'Once you log expenses, Monetra will compare them with last month automatically.',
      });
    }
  }

  /* 3 — Budget warnings */
  for (const line of budgetStatuses(budgets, categories, transactions, preferences.monthStartDay, today)) {
    const name = line.category?.name ?? 'A category';
    if (line.status === 'over-budget') {
      insights.push({
        id: `budget-over-${line.budget.id}`,
        severity: 'critical',
        title: `${name} is over budget by ${fmt(line.remaining * -1)}`,
        detail: `Spent ${fmt(line.spent)} of the ${fmt(line.limit)} monthly limit (${line.utilization?.toFixed(0)}% utilization).`,
        href: '/budgets',
        hrefLabel: 'Adjust budget',
      });
    } else if (line.status === 'near-limit') {
      insights.push({
        id: `budget-near-${line.budget.id}`,
        severity: 'warning',
        title: `${name} is approaching its budget limit`,
        detail: `${line.utilization?.toFixed(0)}% of the monthly limit used with ${fmt(line.remaining)} remaining and ${line.daysLeft} day(s) left in the month.`,
        href: '/budgets',
        hrefLabel: 'View budget',
      });
    }
  }

  /* 4 — Recurring burden */
  const activeRecurring = recurring.filter((r) => r.active);
  if (activeRecurring.length > 0) {
    const monthlyRecurringCost = roundMoney(
      activeRecurring.filter((r) => r.type === 'expense').reduce((s, r) => s + recurringMonthlyAmount(r), 0),
    );
    const monthlyRecurringIncome = roundMoney(
      activeRecurring.filter((r) => r.type === 'income').reduce((s, r) => s + recurringMonthlyAmount(r), 0),
    );
    const incomeBase = income > 0 ? income : monthlyRecurringIncome;
    if (incomeBase > 0) {
      const pct = (monthlyRecurringCost / incomeBase) * 100;
      insights.push({
        id: 'recurring-burden',
        severity: pct > 55 ? 'warning' : 'neutral',
        title: `Recurring expenses consume ${pct.toFixed(0)}% of monthly income`,
        detail: `Your ${activeRecurring.filter((r) => r.type === 'expense').length} active recurring expense(s) total ${fmt(monthlyRecurringCost)} per month (normalized across frequencies).`,
        href: '/recurring',
        hrefLabel: 'Manage recurring',
      });
    }
  }

  /* 5 — Dominant category concentration */
  const totalExpenses = currentExpenses.reduce((s, t) => s + t.amount, 0);
  if (totalExpenses > 0) {
    const spendNow = sumByCategory(currentExpenses);
    const [topId, topAmount] = [...spendNow.entries()].sort((a, b) => b[1] - a[1])[0];
    const pct = (topAmount / totalExpenses) * 100;
    const category = categories.find((c) => c.id === topId);
    if (pct >= 35) {
      insights.push({
        id: 'category-concentration',
        severity: pct >= 55 ? 'warning' : 'neutral',
        title: `${category?.name ?? 'One category'} accounts for ${pct.toFixed(0)}% of your expenses`,
        detail: `${fmt(topAmount)} of ${fmt(totalExpenses)} spent this period went to a single category. Diversification of spend usually signals healthier control.`,
        href: '/analytics',
        hrefLabel: 'See breakdown',
      });
    }
  }

  /* 6 — Savings rate */
  const monthTx = transactions.filter((t) => t.date >= currentMonth.start && t.date <= currentMonth.end);
  const rate = savingsRate(monthTx);
  if (rate !== null) {
    insights.push({
      id: 'savings-rate',
      severity: rate >= 20 ? 'positive' : rate >= 0 ? 'neutral' : 'warning',
      title:
        rate >= 20
          ? `Strong savings rate of ${rate.toFixed(0)}% this month`
          : rate >= 0
            ? `Savings rate is ${rate.toFixed(0)}% this month`
            : `Negative savings rate (${rate.toFixed(0)}%) this month`,
      detail:
        rate >= 20
          ? 'You are keeping at least a fifth of your income. A common guideline is 20% — you are meeting it.'
          : rate >= 0
            ? 'A common guideline is to save 20% of income. Consider reviewing recurring expenses for room.'
            : 'You are drawing down savings this month. Check the simulator to see the long-run effect.',
      href: '/simulator',
      hrefLabel: 'Run a scenario',
    });
  } else {
    insights.push({
      id: 'savings-rate-unknown',
      severity: 'neutral',
      title: 'No income recorded this month',
      detail: 'Log income to see your savings rate and month-over-month comparisons.',
      href: '/transactions',
      hrefLabel: 'Add income',
    });
  }

  /* 7 — Goal pace */
  for (const goal of goals) {
    const p = goalProgress(goal, today);
    if (p.remaining === 0) {
      insights.push({
        id: `goal-done-${goal.id}`,
        severity: 'positive',
        title: `Goal "${goal.name}" is fully funded`,
        detail: `You reached the ${fmt(goal.targetAmount)} target. Consider setting a follow-up goal.`,
        href: '/goals',
        hrefLabel: 'View goals',
      });
      continue;
    }
    const elapsed = Math.max(diffDays(goal.createdAt, today), 1);
    const expectedByNow = (goal.targetAmount / Math.max(diffDays(goal.createdAt, goal.targetDate), 1)) * elapsed;
    if (p.saved >= expectedByNow) {
      insights.push({
        id: `goal-ahead-${goal.id}`,
        severity: 'positive',
        title: `Goal "${goal.name}" is ahead of plan`,
        detail: `Saved ${fmt(p.saved)} of ${fmt(goal.targetAmount)} (${p.progressPercent?.toFixed(0)}%). Required pace from today: ${fmt(p.requiredMonthly ?? 0)}/month for ${p.monthsLeft} month(s).`,
        href: '/goals',
        hrefLabel: 'View goal',
      });
    } else if (p.requiredMonthly !== null && p.monthsLeft <= 2) {
      insights.push({
        id: `goal-risk-${goal.id}`,
        severity: 'warning',
        title: `Goal "${goal.name}" needs ${fmt(p.requiredMonthly)}/month to finish on time`,
        detail: `Only ${p.monthsLeft} month(s) remain before the target date. ${fmt(p.remaining)} still to save.`,
        href: '/goals',
        hrefLabel: 'View goal',
      });
    }
  }

  return insights.slice(0, 12);
}

function sumByCategory(transactions: Transaction[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const t of transactions) {
    map.set(t.categoryId, roundMoney((map.get(t.categoryId) ?? 0) + t.amount));
  }
  return map;
}

export const SEVERITY_ORDER: Record<InsightSeverity, number> = {
  critical: 0,
  warning: 1,
  positive: 2,
  neutral: 3,
};
