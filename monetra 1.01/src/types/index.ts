/** Core domain models for Monetra. All money values are positive decimals;
 *  direction is carried by `type`, never by sign. Dates are ISO `yyyy-MM-dd`. */

export type TransactionType = 'income' | 'expense';

export type PaymentMethod = 'card' | 'cash' | 'bank-transfer' | 'direct-debit' | 'other';

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  /** Chromatic identity from the design palette; used in charts and tiles. */
  color: CategoryColor;
  icon: string; // lucide icon name, resolved via components/ui/CategoryIcon
}

export type CategoryColor =
  | 'iris'
  | 'cyan'
  | 'pale-iris'
  | 'deep-iris'
  | 'orchid'
  | 'periwinkle';

export interface Transaction {
  id: string;
  type: TransactionType;
  /** Always a positive decimal. */
  amount: number;
  categoryId: string;
  date: string; // yyyy-MM-dd
  description: string;
  paymentMethod: PaymentMethod;
  notes?: string;
  /** Present when this record was materialized from a recurring definition. */
  recurringId?: string;
}

export interface Budget {
  id: string;
  categoryId: string;
  /** Monthly spend limit. Monetra budgets are monthly; history compares months. */
  monthlyLimit: number;
  createdAt: string;
}

export type Frequency = 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export interface RecurringTransaction {
  id: string;
  type: TransactionType;
  amount: number;
  categoryId: string;
  description: string;
  frequency: Frequency;
  /** Anchor date for the schedule, yyyy-MM-dd. */
  nextDate: string;
  paymentMethod: PaymentMethod;
  active: boolean;
  notes?: string;
}

export interface GoalContribution {
  id: string;
  amount: number;
  date: string;
  note?: string;
}

export interface FinancialGoal {
  id: string;
  name: string;
  targetAmount: number;
  targetDate: string;
  createdAt: string;
  contributions: GoalContribution[];
}

export type InsightSeverity = 'positive' | 'neutral' | 'warning' | 'critical';

export interface FinancialInsight {
  id: string;
  severity: InsightSeverity;
  title: string;
  detail: string;
  /** Where to navigate for context, if any. */
  href?: string;
  hrefLabel?: string;
}

export interface SimulationScenario {
  id: string;
  name: string;
  monthlyIncome: number;
  /** Multiplier applied to each expense category's current spend. */
  categoryMultipliers: Record<string, number>;
  monthlySavings: number;
  oneTimeExpenses: Array<{ id: string; label: string; amount: number; monthOffset: number }>;
  durationMonths: number;
}

export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'JPY' | 'CNY';

export type DateFormat = 'MDY' | 'DMY' | 'YMD' | 'MMM-D-YYYY';

export interface UserPreferences {
  currency: CurrencyCode;
  dateFormat: DateFormat;
  /** Day of month (1–28) on which the financial month starts. */
  monthStartDay: number;
}

export interface AppData {
  version: number;
  categories: Category[];
  transactions: Transaction[];
  budgets: Budget[];
  recurring: RecurringTransaction[];
  goals: FinancialGoal[];
  preferences: UserPreferences;
  /** True until the user creates/edits real data; drives the demo-data banner. */
  isDemoData: boolean;
}

export interface DateRange {
  start: string; // inclusive, yyyy-MM-dd
  end: string; // inclusive, yyyy-MM-dd
  label: string;
}
