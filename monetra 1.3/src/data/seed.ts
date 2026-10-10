import type {
  AppData,
  Budget,
  Category,
  FinancialGoal,
  PaymentMethod,
  RecurringTransaction,
  Transaction,
} from '@/types';
import { addDays, addMonths, todayISO } from '@/lib/date';
import { roundMoney, seededRandom, uid } from '@/lib/id';

/**
 * Demo dataset — realistic, internally consistent, and fully replaceable.
 * Totals everywhere in the app derive from these transactions; nothing is hardcoded.
 * Seeded RNG keeps the dataset stable across regenerations within a session.
 */

const EXPENSE_CATEGORIES: Array<{ name: string; color: Category['color']; icon: string; budget?: number }> = [
  { name: 'Housing', color: 'iris', icon: 'Home', budget: 2100 },
  { name: 'Groceries', color: 'cyan', icon: 'ShoppingCart', budget: 600 },
  { name: 'Dining', color: 'orchid', icon: 'UtensilsCrossed', budget: 320 },
  { name: 'Transport', color: 'periwinkle', icon: 'Car', budget: 240 },
  { name: 'Utilities', color: 'pale-iris', icon: 'Zap', budget: 190 },
  { name: 'Subscriptions', color: 'deep-iris', icon: 'Repeat', budget: 90 },
  { name: 'Health', color: 'cyan', icon: 'HeartPulse', budget: 160 },
  { name: 'Shopping', color: 'orchid', icon: 'ShoppingBag', budget: 280 },
  { name: 'Entertainment', color: 'periwinkle', icon: 'Clapperboard', budget: 120 },
  { name: 'Travel', color: 'iris', icon: 'Plane', budget: 300 },
];

const INCOME_CATEGORIES: Array<{ name: string; color: Category['color']; icon: string }> = [
  { name: 'Salary', color: 'iris', icon: 'Briefcase' },
  { name: 'Freelance', color: 'cyan', icon: 'Laptop' },
  { name: 'Other Income', color: 'periwinkle', icon: 'Gift' },
];

const HISTORY_MONTHS = 6;

const rand = seededRandom(20261010);

function pick<T>(items: T[]): T {
  return items[Math.floor(rand() * items.length)];
}

function vary(base: number, spreadPct: number): number {
  const factor = 1 + (rand() * 2 - 1) * (spreadPct / 100);
  return roundMoney(base * factor);
}

export function createDemoData(): AppData {
  const today = todayISO();

  const categories: Category[] = [
    ...EXPENSE_CATEGORIES.map((c) => ({
      id: `cat-${slug(c.name)}`,
      name: c.name,
      type: 'expense' as const,
      color: c.color,
      icon: c.icon,
    })),
    ...INCOME_CATEGORIES.map((c) => ({
      id: `cat-${slug(c.name)}`,
      name: c.name,
      type: 'income' as const,
      color: c.color,
      icon: c.icon,
    })),
  ];

  const transactions: Transaction[] = [];
  const addTx = (tx: Omit<Transaction, 'id'>): void => {
    transactions.push({ ...tx, id: uid('tx') });
  };

  // Six months of history, oldest first so trends read naturally.
  for (let m = HISTORY_MONTHS; m >= 0; m--) {
    const anchor = addMonths(today, -m);
    const monthKey = anchor.slice(0, 7);

    // Income: salary on the 1st (financial month starts the 1st in demo prefs), occasional freelance.
    addTx({
      type: 'income',
      amount: 5200,
      categoryId: 'cat-salary',
      date: `${monthKey}-01`,
      description: 'Monthly salary — Northwind Studio',
      paymentMethod: 'bank-transfer',
      recurringId: 'rec-salary',
    });
    if (rand() < 0.45 && m < HISTORY_MONTHS) {
      addTx({
        type: 'income',
        amount: vary(650, 40),
        categoryId: 'cat-freelance',
        date: `${monthKey}-${String(8 + Math.floor(rand() * 12)).padStart(2, '0')}`,
        description: pick(['Brand site build', 'Design system audit', 'Landing page sprint', 'Consulting session']),
        paymentMethod: 'bank-transfer',
      });
    }

    // Housing — rent on the 3rd
    addTx({
      type: 'expense',
      amount: 1850,
      categoryId: 'cat-housing',
      date: `${monthKey}-03`,
      description: 'Apartment rent — Beacon & Co.',
      paymentMethod: 'bank-transfer',
      recurringId: 'rec-rent',
    });
    // Renters insurance, yearly, hit 2 months ago
    if (m === 2) {
      addTx({
        type: 'expense',
        amount: 214,
        categoryId: 'cat-housing',
        date: `${monthKey}-14`,
        description: 'Renters insurance (yearly)',
        paymentMethod: 'card',
      });
    }

    // Utilities
    addTx({
      type: 'expense',
      amount: vary(78, 25),
      categoryId: 'cat-utilities',
      date: `${monthKey}-06`,
      description: 'Electricity — GridLine',
      paymentMethod: 'direct-debit',
      recurringId: 'rec-electricity',
    });
    addTx({
      type: 'expense',
      amount: 59.99,
      categoryId: 'cat-utilities',
      date: `${monthKey}-07`,
      description: 'Fiber internet — LumenNet',
      paymentMethod: 'direct-debit',
      recurringId: 'rec-internet',
    });
    addTx({
      type: 'expense',
      amount: 42,
      categoryId: 'cat-utilities',
      date: `${monthKey}-09`,
      description: 'Water & waste — City Services',
      paymentMethod: 'direct-debit',
    });

    // Subscriptions
    addTx({
      type: 'expense',
      amount: 15.49,
      categoryId: 'cat-subscriptions',
      date: `${monthKey}-05`,
      description: 'Netflix',
      paymentMethod: 'card',
      recurringId: 'rec-netflix',
    });
    addTx({
      type: 'expense',
      amount: 10.99,
      categoryId: 'cat-subscriptions',
      date: `${monthKey}-11`,
      description: 'Spotify Premium',
      paymentMethod: 'card',
      recurringId: 'rec-spotify',
    });
    addTx({
      type: 'expense',
      amount: 39,
      categoryId: 'cat-subscriptions',
      date: `${monthKey}-18`,
      description: 'Gym membership — FormLab',
      paymentMethod: 'direct-debit',
      recurringId: 'rec-gym',
    });

    // Groceries — roughly weekly
    for (const day of [2, 9, 17, 24]) {
      addTx({
        type: 'expense',
        amount: vary(118, 30),
        categoryId: 'cat-groceries',
        date: `${monthKey}-${String(day).padStart(2, '0')}`,
        description: pick(['GreenMarket run', 'Whole Harvest', 'Corner grocer', 'Costco haul']),
        paymentMethod: pick<PaymentMethod>(['card', 'cash']),
      });
    }

    // Dining
    for (const day of [4, 13, 21, 27]) {
      if (rand() < 0.85) {
        addTx({
          type: 'expense',
          amount: vary(36, 45),
          categoryId: 'cat-dining',
          date: `${monthKey}-${String(day).padStart(2, '0')}`,
          description: pick(['Ramen Yokocho', 'Cafe Lumen', 'Taco Tuesday', 'Sunday brunch', 'Pizza Notte']),
          paymentMethod: 'card',
        });
      }
    }

    // Transport
    addTx({
      type: 'expense',
      amount: vary(52, 30),
      categoryId: 'cat-transport',
      date: `${monthKey}-${String(3 + Math.floor(rand() * 5)).padStart(2, '0')}`,
      description: 'Fuel — Pacific Gas',
      paymentMethod: 'card',
    });
    if (rand() < 0.6) {
      addTx({
        type: 'expense',
        amount: vary(64, 30),
        categoryId: 'cat-transport',
        date: `${monthKey}-${String(15 + Math.floor(rand() * 10)).padStart(2, '0')}`,
        description: 'Ride share / transit top-up',
        paymentMethod: 'card',
      });
    }
    if (m === 4) {
      addTx({
        type: 'expense',
        amount: 289,
        categoryId: 'cat-transport',
        date: `${monthKey}-20`,
        description: 'Car service — 40k maintenance',
        paymentMethod: 'card',
      });
    }

    // Health
    if (rand() < 0.7) {
      addTx({
        type: 'expense',
        amount: vary(85, 40),
        categoryId: 'cat-health',
        date: `${monthKey}-${String(5 + Math.floor(rand() * 20)).padStart(2, '0')}`,
        description: pick(['Pharmacy', 'Dental checkup', 'Physio session']),
        paymentMethod: 'card',
      });
    }

    // Shopping & entertainment
    if (rand() < 0.9) {
      addTx({
        type: 'expense',
        amount: vary(120, 60),
        categoryId: 'cat-shopping',
        date: `${monthKey}-${String(10 + Math.floor(rand() * 15)).padStart(2, '0')}`,
        description: pick(['Uniqlo basics', 'Home goods — Muji', 'Bookstore', 'Running shoes']),
        paymentMethod: 'card',
      });
    }
    if (rand() < 0.75) {
      addTx({
        type: 'expense',
        amount: vary(48, 50),
        categoryId: 'cat-entertainment',
        date: `${monthKey}-${String(6 + Math.floor(rand() * 20)).padStart(2, '0')}`,
        description: pick(['Cinema night', 'Concert — The Nationals', 'Board game café', 'Museum pass']),
        paymentMethod: 'card',
      });
    }

    // Travel — occasional trips
    if (m === 3 || (m === 0 && parseInt(today.slice(8, 10), 10) > 20)) {
      addTx({
        type: 'expense',
        amount: vary(420, 25),
        categoryId: 'cat-travel',
        date: `${monthKey}-${String(12 + Math.floor(rand() * 8)).padStart(2, '0')}`,
        description: 'Weekend trip — coast rail + stay',
        paymentMethod: 'card',
      });
    }
  }

  // This month's salary may already exist above (day 01) — keep as-is.

  const budgets: Budget[] = EXPENSE_CATEGORIES.filter((c) => c.budget !== undefined).map((c) => ({
    id: uid('bud'),
    categoryId: `cat-${slug(c.name)}`,
    monthlyLimit: c.budget!,
    createdAt: addMonths(today, -HISTORY_MONTHS),
  }));

  const recurring: RecurringTransaction[] = [
    {
      id: 'rec-salary',
      type: 'income',
      amount: 5200,
      categoryId: 'cat-salary',
      description: 'Monthly salary — Northwind Studio',
      frequency: 'monthly',
      nextDate: nextOccurrence(today, 1),
      paymentMethod: 'bank-transfer',
      active: true,
    },
    {
      id: 'rec-rent',
      type: 'expense',
      amount: 1850,
      categoryId: 'cat-housing',
      description: 'Apartment rent — Beacon & Co.',
      frequency: 'monthly',
      nextDate: nextOccurrence(today, 3),
      paymentMethod: 'bank-transfer',
      active: true,
    },
    {
      id: 'rec-internet',
      type: 'expense',
      amount: 59.99,
      categoryId: 'cat-utilities',
      description: 'Fiber internet — LumenNet',
      frequency: 'monthly',
      nextDate: nextOccurrence(today, 7),
      paymentMethod: 'direct-debit',
      active: true,
    },
    {
      id: 'rec-electricity',
      type: 'expense',
      amount: 78,
      categoryId: 'cat-utilities',
      description: 'Electricity — GridLine',
      frequency: 'monthly',
      nextDate: nextOccurrence(today, 6),
      paymentMethod: 'direct-debit',
      active: true,
    },
    {
      id: 'rec-netflix',
      type: 'expense',
      amount: 15.49,
      categoryId: 'cat-subscriptions',
      description: 'Netflix',
      frequency: 'monthly',
      nextDate: nextOccurrence(today, 5),
      paymentMethod: 'card',
      active: true,
    },
    {
      id: 'rec-spotify',
      type: 'expense',
      amount: 10.99,
      categoryId: 'cat-subscriptions',
      description: 'Spotify Premium',
      frequency: 'monthly',
      nextDate: nextOccurrence(today, 11),
      paymentMethod: 'card',
      active: true,
    },
    {
      id: 'rec-gym',
      type: 'expense',
      amount: 39,
      categoryId: 'cat-subscriptions',
      description: 'Gym membership — FormLab',
      frequency: 'monthly',
      nextDate: nextOccurrence(today, 18),
      paymentMethod: 'direct-debit',
      active: true,
    },
    {
      id: 'rec-cloud',
      type: 'expense',
      amount: 12,
      categoryId: 'cat-subscriptions',
      description: 'Cloud storage — 2TB plan',
      frequency: 'yearly',
      nextDate: addDays(today, 63),
      paymentMethod: 'card',
      active: true,
    },
    {
      id: 'rec-magazine',
      type: 'expense',
      amount: 9.5,
      categoryId: 'cat-entertainment',
      description: 'Design quarterly (print)',
      frequency: 'quarterly',
      nextDate: addDays(today, 21),
      paymentMethod: 'card',
      active: false,
      notes: 'Paused — evaluating renewal.',
    },
  ];

  const goals: FinancialGoal[] = [
    {
      id: uid('goal'),
      name: 'Emergency fund',
      targetAmount: 12000,
      targetDate: addMonths(today, 10),
      createdAt: addMonths(today, -5),
      contributions: buildContributions(340, 5, today),
    },
    {
      id: uid('goal'),
      name: 'Japan trip — spring',
      targetAmount: 4500,
      targetDate: addMonths(today, 7),
      createdAt: addMonths(today, -3),
      contributions: buildContributions(220, 3, today),
    },
    {
      id: uid('goal'),
      name: 'New workstation',
      targetAmount: 2600,
      targetDate: addMonths(today, 12),
      createdAt: addMonths(today, -2),
      contributions: buildContributions(150, 2, today),
    },
  ];

  return {
    version: 1,
    categories,
    // Keep only records dated today or earlier: the current month must read as
    // "month to date", never as pre-dated future activity — otherwise a newly
    // added expense today would sort below future-dated demo records.
    transactions: transactions
      .filter((t) => t.date <= today)
      .sort((a, b) => b.date.localeCompare(a.date)),
    budgets,
    recurring,
    goals,
    preferences: { currency: 'USD', dateFormat: 'MMM-D-YYYY', monthStartDay: 1, theme: 'dark' },
    isDemoData: true,
  };
}

/** Next monthly occurrence for a given day-of-month, strictly after today. */
function nextOccurrence(today: string, dayOfMonth: number): string {
  const ym = today.slice(0, 7);
  const candidate = `${ym}-${String(Math.min(dayOfMonth, 28)).padStart(2, '0')}`;
  if (candidate > today) return candidate;
  return `${addMonths(`${ym}-01`, 1).slice(0, 7)}-${String(Math.min(dayOfMonth, 28)).padStart(2, '0')}`;
}

function buildContributions(monthly: number, months: number, today: string) {
  const contributions = [];
  for (let i = months; i >= 1; i--) {
    contributions.push({
      id: uid('contrib'),
      amount: roundMoney(monthly * (1 + (rand() * 0.2 - 0.1))),
      date: addMonths(today, -i),
      note: i === months ? 'Initial deposit' : undefined,
    });
  }
  return contributions;
}

function slug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}
