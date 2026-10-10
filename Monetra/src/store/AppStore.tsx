import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from 'react';
import type {
  AppData,
  Budget,
  FinancialGoal,
  GoalContribution,
  RecurringTransaction,
  Transaction,
  UserPreferences,
} from '@/types';
import { createDemoData } from '@/data/seed';
import { clearStorage, loadFromStorage, saveToStorage } from '@/lib/storage';
import { uid } from '@/lib/id';

/* ------------------------------------------------------------------ *
 * Actions
 * ------------------------------------------------------------------ */

type Action =
  | { type: 'transaction/add'; transaction: Transaction }
  | { type: 'transaction/update'; id: string; patch: Partial<Transaction> }
  | { type: 'transaction/delete'; id: string }
  | { type: 'transactions/clear-all' }
  | { type: 'budget/add'; budget: Budget }
  | { type: 'budget/update'; id: string; patch: Partial<Budget> }
  | { type: 'budget/delete'; id: string }
  | { type: 'recurring/add'; recurring: RecurringTransaction }
  | { type: 'recurring/update'; id: string; patch: Partial<RecurringTransaction> }
  | { type: 'recurring/delete'; id: string }
  | { type: 'goal/add'; goal: FinancialGoal }
  | { type: 'goal/update'; id: string; patch: Partial<Omit<FinancialGoal, 'contributions'>> }
  | { type: 'goal/delete'; id: string }
  | { type: 'contribution/add'; goalId: string; contribution: GoalContribution }
  | { type: 'contribution/delete'; goalId: string; contributionId: string }
  | { type: 'preferences/set'; patch: Partial<UserPreferences> }
  | { type: 'data/reset-demo' }
  | { type: 'data/replace'; data: AppData };

/** Actions that mutate user financial records (flips the demo banner off). */

function reducer(state: AppData, action: Action): AppData {
  switch (action.type) {
    case 'transaction/add':
      return { ...state, transactions: [action.transaction, ...state.transactions], isDemoData: false };
    case 'transaction/update':
      return {
        ...state,
        isDemoData: false,
        transactions: state.transactions.map((t) => (t.id === action.id ? { ...t, ...action.patch } : t)),
      };
    case 'transaction/delete':
      return { ...state, transactions: state.transactions.filter((t) => t.id !== action.id), isDemoData: false };
    case 'transactions/clear-all':
      return { ...state, transactions: [], isDemoData: false };
    case 'budget/add':
      return { ...state, budgets: [...state.budgets, action.budget], isDemoData: false };
    case 'budget/update':
      return {
        ...state,
        isDemoData: false,
        budgets: state.budgets.map((b) => (b.id === action.id ? { ...b, ...action.patch } : b)),
      };
    case 'budget/delete':
      return { ...state, budgets: state.budgets.filter((b) => b.id !== action.id), isDemoData: false };
    case 'recurring/add':
      return { ...state, recurring: [...state.recurring, action.recurring], isDemoData: false };
    case 'recurring/update':
      return {
        ...state,
        isDemoData: false,
        recurring: state.recurring.map((r) => (r.id === action.id ? { ...r, ...action.patch } : r)),
      };
    case 'recurring/delete':
      return { ...state, recurring: state.recurring.filter((r) => r.id !== action.id), isDemoData: false };
    case 'goal/add':
      return { ...state, goals: [...state.goals, action.goal], isDemoData: false };
    case 'goal/update':
      return {
        ...state,
        isDemoData: false,
        goals: state.goals.map((g) => (g.id === action.id ? { ...g, ...action.patch } : g)),
      };
    case 'goal/delete':
      return { ...state, goals: state.goals.filter((g) => g.id !== action.id), isDemoData: false };
    case 'contribution/add':
      return {
        ...state,
        isDemoData: false,
        goals: state.goals.map((g) =>
          g.id === action.goalId
            ? { ...g, contributions: [...g.contributions, action.contribution] }
            : g,
        ),
      };
    case 'contribution/delete':
      return {
        ...state,
        isDemoData: false,
        goals: state.goals.map((g) =>
          g.id === action.goalId
            ? { ...g, contributions: g.contributions.filter((c) => c.id !== action.contributionId) }
            : g,
        ),
      };
    case 'preferences/set':
      return { ...state, preferences: { ...state.preferences, ...action.patch } };
    case 'data/reset-demo':
      return createDemoData();
    case 'data/replace':
      return { ...action.data, isDemoData: false };
  }
}

/* ------------------------------------------------------------------ *
 * Context
 * ------------------------------------------------------------------ */

export interface AppActions {
  addTransaction(transaction: Omit<Transaction, 'id'>): Transaction;
  updateTransaction(id: string, patch: Partial<Transaction>): void;
  deleteTransaction(id: string): void;
  clearTransactions(): void;
  addBudget(budget: Omit<Budget, 'id' | 'createdAt'>): void;
  updateBudget(id: string, patch: Partial<Budget>): void;
  deleteBudget(id: string): void;
  addRecurring(recurring: Omit<RecurringTransaction, 'id'>): void;
  updateRecurring(id: string, patch: Partial<RecurringTransaction>): void;
  deleteRecurring(id: string): void;
  addGoal(goal: Omit<FinancialGoal, 'id' | 'contributions'>): void;
  updateGoal(id: string, patch: Partial<Omit<FinancialGoal, 'contributions'>>): void;
  deleteGoal(id: string): void;
  addContribution(goalId: string, contribution: Omit<GoalContribution, 'id'>): void;
  deleteContribution(goalId: string, contributionId: string): void;
  setPreferences(patch: Partial<UserPreferences>): void;
  resetDemoData(): void;
  replaceData(data: AppData): void;
}

interface AppStoreValue {
  data: AppData;
  actions: AppActions;
}

const AppStoreContext = createContext<AppStoreValue | null>(null);

function init(): AppData {
  return loadFromStorage() ?? createDemoData();
}

export function AppStoreProvider({ children }: { children: React.ReactNode }) {
  const [data, dispatch] = useReducer(reducer, undefined, init);

  useEffect(() => {
    saveToStorage(data);
  }, [data]);

  const actions = useMemo<AppActions>(
    () => ({
      addTransaction: (input) => {
        const transaction: Transaction = { ...input, id: uid('tx') };
        dispatch({ type: 'transaction/add', transaction });
        return transaction;
      },
      updateTransaction: (id, patch) => dispatch({ type: 'transaction/update', id, patch }),
      deleteTransaction: (id) => dispatch({ type: 'transaction/delete', id }),
      clearTransactions: () => dispatch({ type: 'transactions/clear-all' }),
      addBudget: (input) => dispatch({ type: 'budget/add', budget: { ...input, id: uid('bud'), createdAt: new Date().toISOString() } }),
      updateBudget: (id, patch) => dispatch({ type: 'budget/update', id, patch }),
      deleteBudget: (id) => dispatch({ type: 'budget/delete', id }),
      addRecurring: (input) => dispatch({ type: 'recurring/add', recurring: { ...input, id: uid('rec') } }),
      updateRecurring: (id, patch) => dispatch({ type: 'recurring/update', id, patch }),
      deleteRecurring: (id) => dispatch({ type: 'recurring/delete', id }),
      addGoal: (input) => dispatch({ type: 'goal/add', goal: { ...input, id: uid('goal'), contributions: [] } }),
      updateGoal: (id, patch) => dispatch({ type: 'goal/update', id, patch }),
      deleteGoal: (id) => dispatch({ type: 'goal/delete', id }),
      addContribution: (goalId, input) =>
        dispatch({ type: 'contribution/add', goalId, contribution: { ...input, id: uid('contrib') } }),
      deleteContribution: (goalId, contributionId) => dispatch({ type: 'contribution/delete', goalId, contributionId }),
      setPreferences: (patch) => dispatch({ type: 'preferences/set', patch }),
      resetDemoData: () => dispatch({ type: 'data/reset-demo' }),
      replaceData: (next) => dispatch({ type: 'data/replace', data: next }),
    }),
    [],
  );

  const value = useMemo(() => ({ data, actions }), [data, actions]);
  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>;
}

export function useAppStore(): AppStoreValue {
  const context = useContext(AppStoreContext);
  if (!context) throw new Error('useAppStore must be used within AppStoreProvider');
  return context;
}

/** Clears persisted data (used by "clear all" flows before reseeding). */
export function purgeStorage(): void {
  clearStorage();
}

export function useCategoryLookup(): (id: string) => { name: string; color: string; icon: string } {
  const { data } = useAppStore();
  return useCallback(
    (id: string) => {
      const category = data.categories.find((c) => c.id === id);
      return { name: category?.name ?? 'Uncategorized', color: category?.color ?? 'iris', icon: category?.icon ?? 'CircleDollarSign' };
    },
    [data.categories],
  );
}
