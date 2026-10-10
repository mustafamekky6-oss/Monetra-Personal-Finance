import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Info, Lightbulb, TriangleAlert, XCircle } from 'lucide-react';
import { useAppStore } from '@/store/AppStore';
import { usePageMeta } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { generateInsights, SEVERITY_ORDER } from '@/utils/insights';
import { todayISO } from '@/lib/date';
import type { InsightSeverity } from '@/types';

const SEVERITY_META: Record<InsightSeverity, { icon: React.ReactNode; label: string; border: string }> = {
  critical: { icon: <XCircle size={18} aria-hidden />, label: 'Critical', border: 'border-l-orchid-bloom' },
  warning: { icon: <TriangleAlert size={18} aria-hidden />, label: 'Warning', border: 'border-l-pale-iris' },
  positive: { icon: <CheckCircle2 size={18} aria-hidden />, label: 'Positive', border: 'border-l-cyan-signal' },
  neutral: { icon: <Info size={18} aria-hidden />, label: 'Observation', border: 'border-l-steel' },
};

export default function InsightsPage() {
  usePageMeta('Insights');
  const { data } = useAppStore();
  const insights = useMemo(
    () => generateInsights(data, todayISO()).sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]),
    [data],
  );

  return (
    <div className="animate-rise">
      <PageHeader
        eyebrow="Signals"
        title="Financial insights"
        description="Deterministic observations computed from your transactions, budgets, recurring schedules and goals — no AI, no fabricated numbers."
      />

      <Card padding="md" surface="plain" className="mb-4">
        <p className="text-xs leading-relaxed text-muted">
          <span className="text-body">How this works:</span> Monetra applies a fixed set of rules (month-over-month
          changes, budget utilization, recurring burden, goal pace) to your recorded data. These are informational
          observations, not professional financial advice.
        </p>
      </Card>

      {insights.length === 0 ? (
        <EmptyState
          icon={<Lightbulb size={28} aria-hidden />}
          title="No insights yet"
          description="Record a few transactions across a couple of months and Monetra will surface patterns here."
          action={
            <Link to="/transactions">
              <Button withArrow>Record transactions</Button>
            </Link>
          }
        />
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {insights.map((insight) => {
            const meta = SEVERITY_META[insight.severity];
            return (
              <li key={insight.id}>
                <Card padding="lg" className={`h-full border-l-2 ${meta.border}`}>
                  <div className="flex items-start gap-4">
                    <span className="mt-0.5 shrink-0 text-body">{meta.icon}</span>
                    <div className="min-w-0">
                      <p className="label-mono mb-1.5 text-muted">{meta.label}</p>
                      <h3 className="font-display text-[19px] leading-snug text-heading">{insight.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-body">{insight.detail}</p>
                      {insight.href && (
                        <Link
                          to={insight.href}
                          className="mt-3 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-income hover:underline"
                        >
                          {insight.hrefLabel ?? 'Open'} <ArrowRight size={11} aria-hidden />
                        </Link>
                      )}
                    </div>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
