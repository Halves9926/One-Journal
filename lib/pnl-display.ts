import { formatPnl, formatPercentValue } from '@/lib/trades';

export const PNL_DISPLAY_MODES = ['currency', 'percent'] as const;

export type PnlDisplayMode = (typeof PNL_DISPLAY_MODES)[number];

export function isPnlDisplayMode(value: unknown): value is PnlDisplayMode {
  return value === 'currency' || value === 'percent';
}

export function formatPnlDisplayValue({
  baseline,
  digits = 2,
  mode,
  pnl,
}: {
  baseline: number | null | undefined;
  digits?: number;
  mode: PnlDisplayMode;
  pnl: number | null | undefined;
}) {
  const normalizedPnl = typeof pnl === 'number' && Number.isFinite(pnl) ? pnl : null;

  if (normalizedPnl === null) {
    return mode === 'percent' ? '--' : formatPnl(0, digits);
  }

  if (mode === 'currency') {
    return formatPnl(normalizedPnl, digits);
  }

  const normalizedBaseline =
    typeof baseline === 'number' && Number.isFinite(baseline) && baseline !== 0
      ? baseline
      : null;

  if (normalizedBaseline === null) {
    return '--';
  }

  const percentValue = (normalizedPnl / normalizedBaseline) * 100;
  const formattedValue = formatPercentValue(Math.abs(percentValue), digits);

  if (percentValue > 0) {
    return `+${formattedValue}`;
  }

  if (percentValue < 0) {
    return `-${formattedValue}`;
  }

  return formattedValue;
}
