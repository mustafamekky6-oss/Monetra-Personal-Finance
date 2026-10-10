import type { SimulationScenario } from '@/types';
import { addMonths, todayISO } from '@/lib/date';
import { roundMoney } from '@/lib/id';
import type { CategorySpend } from './finance';

export interface SimulationMonthPoint {
  /** 1-based month offset. */
  month: number;
  label: string;
  income: number;
  expenses: number;
  savings: number;
  oneTime: number;
  net: number;
  cumulativeBalance: number;
}

export interface SimulationResult {
  months: SimulationMonthPoint[];
  /** Average monthly surplus (income − expenses − savings − amortized one-time). */
  monthlySurplus: number;
  finalSavings: number;
  /** End-of-run savings minus what the current trajectory would have produced. */
  differenceFromCurrent: number;
  /** Month offset where cumulative balance first covers the target, or null. */
  goalCompletionMonth: number | null;
  goalCompletionDate: string | null;
}

export interface CurrentTrajectory {
  monthlyIncome: number;
  /** Baseline expense per category (average of observed months). */
  categorySpend: CategorySpend[];
  monthlySavings: number;
}

/**
 * Deterministic projection:
 *  - income arrives monthly
 *  - expenses = Σ category spend × multiplier, monthly
 *  - savings is transferred out monthly (reduces free cash, grows savings pool)
 *  - one-time expenses hit on their configured month
 *  - cumulativeBalance tracks free cash; finalSavings = savings pool + free cash
 * Estimates only — no compounding, inflation, or investment returns.
 */
export function runSimulation(
  scenario: SimulationScenario,
  current: CurrentTrajectory,
  goalTarget: number | null,
  today = todayISO(),
): SimulationResult {
  const months: SimulationMonthPoint[] = [];
  let freeCash = 0;
  let savingsPool = 0;

  for (let m = 1; m <= scenario.durationMonths; m++) {
    const expenses = roundMoney(
      current.categorySpend.reduce(
        (sum, cat) => sum + cat.amount * (scenario.categoryMultipliers[cat.categoryId] ?? 1),
        0,
      ),
    );
    const oneTime = roundMoney(
      scenario.oneTimeExpenses.filter((o) => o.monthOffset === m).reduce((s, o) => s + o.amount, 0),
    );
    const savings = scenario.monthlySavings;
    const net = roundMoney(scenario.monthlyIncome - expenses - savings - oneTime);
    freeCash = roundMoney(freeCash + net);
    savingsPool = roundMoney(savingsPool + savings);
    months.push({
      month: m,
      label: `M${m}`,
      income: scenario.monthlyIncome,
      expenses,
      savings,
      oneTime,
      net,
      cumulativeBalance: roundMoney(savingsPool + freeCash),
    });
  }

  const monthlySurplus = roundMoney(
    (months.reduce((s, p) => s + p.net, 0)) / Math.max(scenario.durationMonths, 1),
  );
  const finalSavings = months.length > 0 ? months[months.length - 1].cumulativeBalance : 0;

  // Current trajectory (multipliers all 1, no scenario savings changes).
  const currentMonthlyNet = roundMoney(
    current.monthlyIncome -
      current.categorySpend.reduce((s, c) => s + c.amount, 0) -
      current.monthlySavings,
  );
  const currentFinal = roundMoney(currentMonthlyNet * scenario.durationMonths + current.monthlySavings * scenario.durationMonths);

  let goalCompletionMonth: number | null = null;
  if (goalTarget !== null && goalTarget > 0) {
    const hit = months.find((p) => p.cumulativeBalance >= goalTarget);
    goalCompletionMonth = hit ? hit.month : null;
  }

  return {
    months,
    monthlySurplus,
    finalSavings,
    differenceFromCurrent: roundMoney(finalSavings - currentFinal),
    goalCompletionMonth,
    goalCompletionDate: goalCompletionMonth ? addMonths(today, goalCompletionMonth) : null,
  };
}
