interface ProgressBarProps {
  /** 0..100+; values above 100 render an overflow state. */
  value: number | null;
  /** Chromatic tile colors per category, or fixed signals. */
  color?: string;
  label?: string;
  size?: 'sm' | 'md';
}

const COLOR_HEX: Record<string, string> = {
  iris: '#847dff',
  cyan: '#00b3dd',
  'pale-iris': '#d1c9ff',
  'deep-iris': '#4b49aa',
  orchid: '#dd90d8',
  periwinkle: '#90b8f0',
  white: '#f5f5f7',
};

/**
 * Budget/spend progress. Progress is never communicated by color alone —
 * the numeric utilization is always rendered alongside by callers.
 */
export function ProgressBar({ value, color = 'white', label, size = 'md' }: ProgressBarProps) {
  const pct = value === null ? 0 : Math.max(Math.min(value, 100), 0);
  const over = value !== null && value > 100;
  const height = size === 'sm' ? 'h-1.5' : 'h-2';
  return (
    <div
      className={`w-full ${height} overflow-hidden rounded-full bg-inset`}
      role="progressbar"
      aria-valuenow={value === null ? undefined : Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label ?? 'progress'}
    >
      <div
        className="h-full rounded-full transition-[width] duration-500 ease-out"
        style={{
          width: `${pct}%`,
          backgroundColor: over ? '#dd90d8' : COLOR_HEX[color] ?? color,
        }}
      />
    </div>
  );
}
