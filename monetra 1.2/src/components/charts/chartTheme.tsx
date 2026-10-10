/** Shared chart theming — Recharts wrapped to speak the design language. */

export const CHART_COLORS = {
  income: '#00b3dd', // Cyan Signal — data accent
  expense: '#dd90d8', // Orchid Bloom
  net: '#847dff', // Iris Gleam
  grid: 'var(--chart-grid)',
  tooltipBg: 'var(--chart-tooltip)',
  tooltipBorder: 'var(--chart-tooltip-border)',
} as const;

/** Category color step for stacked/donut charts. */
export const CATEGORY_HEX: Record<string, string> = {
  iris: '#847dff',
  cyan: '#00b3dd',
  'pale-iris': '#d1c9ff',
  'deep-iris': '#4b49aa',
  orchid: '#dd90d8',
  periwinkle: '#90b8f0',
};

interface TooltipEntry {
  name?: string;
  value?: number | string;
  color?: string;
  dataKey?: string | number;
}

interface ThemedTooltipProps {
  active?: boolean;
  label?: string | number;
  payload?: TooltipEntry[];
  formatter?: (value: number) => string;
  labelSuffix?: string;
}

export function ThemedTooltip({ active, label, payload, formatter, labelSuffix }: ThemedTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div
      className="rounded-(--radius-input) border p-3.5 shadow-(--shadow-lg)"
      style={{ background: CHART_COLORS.tooltipBg, borderColor: CHART_COLORS.tooltipBorder }}
    >
      <p className="label-mono mb-2 text-body">
        {label}
        {labelSuffix}
      </p>
      <ul className="flex flex-col gap-1">
        {payload.map((entry, index) => (
          <li key={index} className="flex items-center justify-between gap-4 text-sm">
            <span className="flex items-center gap-2 text-heading">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: entry.color ?? '#fff' }}
                aria-hidden
              />
              <span className="capitalize">{entry.name}</span>
            </span>
            <span className="font-mono text-[13px] tabular-nums text-heading">
              {typeof entry.value === 'number' ? (formatter ? formatter(entry.value) : entry.value.toLocaleString()) : entry.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Wrapper providing accessible summaries for chart blocks. */
export function ChartSummary({ summary }: { summary: string }) {
  return <p className="sr-only">{summary}</p>;
}
