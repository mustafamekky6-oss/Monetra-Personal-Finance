import { describe, expect, it } from 'vitest';
import {
  budgetStatuses,
  goalFeasibility,
  goalProgress,
  netCashflow,
  recurringMonthlyAmount,
  recurringOccurrences,
  savingsRate,
  spendingByCategory,
  totalByType,
  upcomingPayments,
} from './finance';
import { advanceSchedule } from './finance';
import type { Budget, Category, RecurringTransaction, Transaction } from '@/types';

const categories: Category[] = [
  { id: 'c-food', name: 'Food', type: 'expense', color: 'cyan', icon: 'ShoppingCart' },
  { id: 'c-rent', name: 'Housing', type: 'expense', color: 'iris', icon: 'Home' },
  { id: 'c-salary', name: 'Salary', type: 'income', color: 'iris', icon: 'Briefcase' },
];

function tx(overrides: Partial<Transaction> & { id: string }): Transaction {
  return {
    type: 'expense',
    amount: 100,
    categoryId: 'c-food',
    date: '2026-06-10',
    description: 'Test',
    paymentMethod: 'card',
    ...overrides,
  };
}

describe('totals and cashflow', () => {
  const transactions = [
    tx({ id: '1', type: 'income', amount: 5000, categoryId: 'c-salary' }),
    tx({ id: '2', amount: 1200, categoryId: 'c-rent' }),
    tx({ id: '3', amount: 300.5, date: '2026-06-12' }),
    tx({ id: '4', amount: 99.5, date: '2026-05-01' }),
  ];

  it('computes income and expenses separately', () => {
    expect(totalByType(transactions, 'income')).toBe(5000);
    expect(totalByType(transactions, 'expense')).toBe(1600);
  });

  it('computes net cashflow', () => {
    expect(netCashflow(transactions)).toBe(3400);
  });

  it('savings rate is null on zero income (no division by zero)', () => {
    expect(savingsRate([tx({ id: 'x', amount: 10 })])).toBeNull();
  });

  it('computes savings rate', () => {
    expect(savingsRate(transactions)).toBe(68);
  });

  it('category breakdown sorts by amount and shares sum to 100', () => {
    const breakdown = spendingByCategory(transactions, categories);
    expect(breakdown[0].name).toBe('Housing');
    const shareSum = breakdown.reduce((s, c) => s + (c.share ?? 0), 0);
    expect(shareSum).toBeCloseTo(100, 0);
  });
});

describe('budgets', () => {
  const budgets: Budget[] = [
    { id: 'b1', categoryId: 'c-food', monthlyLimit: 500, createdAt: '2026-01-01' },
    { id: 'b2', categoryId: 'c-rent', monthlyLimit: 1000, createdAt: '2026-01-01' },
  ];
  const transactions = [
    tx({ id: '1', amount: 450, date: '2026-06-02' }), // food: 90% — near limit
    tx({ id: '2', amount: 1200, categoryId: 'c-rent', date: '2026-06-03' }), // rent: over
    tx({ id: '3', amount: 999, date: '2026-05-03' }), // previous month — excluded
  ];

  it('classifies near-limit and over-budget with month filtering', () => {
    const lines = budgetStatuses(budgets, categories, transactions, 1, '2026-06-15');
    const food = lines.find((l) => l.budget.id === 'b1')!;
    const rent = lines.find((l) => l.budget.id === 'b2')!;
    expect(food.status).toBe('near-limit');
    expect(food.spent).toBe(450);
    expect(rent.status).toBe('over-budget');
    expect(rent.remaining).toBe(-200);
    expect(rent.utilization).toBe(120);
  });
});

describe('recurring schedules', () => {
  it('advances weekly/monthly with month-end clamping', () => {
    expect(advanceSchedule('2026-01-31', 'monthly')).toBe('2026-02-28');
    expect(advanceSchedule('2026-03-01', 'weekly')).toBe('2026-03-08');
    expect(advanceSchedule('2026-01-15', 'quarterly')).toBe('2026-04-15');
    expect(advanceSchedule('2028-02-29', 'yearly')).toBe('2029-02-28');
  });

  it('lists occurrences inside a window', () => {
    const rec: RecurringTransaction = {
      id: 'r1',
      type: 'expense',
      amount: 50,
      categoryId: 'c-food',
      description: 'Weekly thing',
      frequency: 'weekly',
      nextDate: '2026-01-01',
      paymentMethod: 'card',
      active: true,
    };
    const dates = recurringOccurrences(rec, '2026-01-01', '2026-01-31');
    expect(dates).toHaveLength(5); // Jan 1, 8, 15, 22, 29
    expect(dates[0]).toBe('2026-01-01');
  });

  it('normalizes amounts to monthly', () => {
    expect(recurringMonthlyAmount({ frequency: 'yearly', amount: 1200 } as RecurringTransaction)).toBe(100);
    expect(recurringMonthlyAmount({ frequency: 'weekly', amount: 100 } as RecurringTransaction)).toBeCloseTo(433.33, 1);
  });

  it('projects upcoming payments and skips paused schedules', () => {
    const active: RecurringTransaction = {
      id: 'a',
      type: 'expense',
      amount: 10,
      categoryId: 'c-food',
      description: 'Active',
      frequency: 'monthly',
      nextDate: '2026-06-20',
      paymentMethod: 'card',
      active: true,
    };
    const paused: RecurringTransaction = { ...active, id: 'p', active: false, nextDate: '2026-06-21' };
    const payments = upcomingPayments([active, paused], categories, '2026-06-15', 30);
    expect(payments.map((p) => p.recurring.id)).toEqual(['a']);
    expect(payments[0].date).toBe('2026-06-20');
  });
});

describe('goals', () => {
  const goal = {
    id: 'g1',
    name: 'Trip',
    targetAmount: 1000,
    targetDate: '2027-06-15',
    createdAt: '2026-01-01',
    contributions: [
      { id: 'c1', amount: 250, date: '2026-02-01' },
      { id: 'c2', amount: 250, date: '2026-03-01' },
    ],
  };

  it('computes saved, remaining and required pace', () => {
    const p = goalProgress(goal, '2026-06-15');
    expect(p.saved).toBe(500);
    expect(p.remaining).toBe(500);
    expect(p.progressPercent).toBe(50);
    expect(p.requiredMonthly).toBe(41.67);
  });

  it('flags completed goals', () => {
    const done = { ...goal, contributions: [...goal.contributions, { id: 'c3', amount: 500, date: '2026-04-01' }] };
    const p = goalProgress(done, '2026-06-15');
    expect(p.remaining).toBe(0);
    expect(goalFeasibility(done, 3000, '2026-06-15').status).toBe('completed');
  });

  it('flags at-risk when required pace exceeds 40% of income', () => {
    expect(goalFeasibility(goal, 100, '2026-06-15').status).toBe('at-risk');
    expect(goalFeasibility(goal, 5000, '2026-06-15').status).toBe('on-track');
  });
});
