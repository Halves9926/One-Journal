'use client';

import { cx } from '@/lib/utils';

export const WIN_RATE_WIDGET_VARIANTS = ['radial', 'compact'] as const;

export type WinRateWidgetVariant = (typeof WIN_RATE_WIDGET_VARIANTS)[number];

type WinRateWidgetProps = {
  breakeven?: number;
  caption?: string;
  className?: string;
  compact?: boolean;
  losses: number;
  title?: string;
  variant?: WinRateWidgetVariant;
  wins: number;
};

const RADIUS = 42;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function WinRateWidget({
  breakeven = 0,
  caption,
  className,
  compact = false,
  losses,
  title = 'Win Rate',
  variant,
  wins,
}: WinRateWidgetProps) {
  const isCompact = variant ? variant === 'compact' : compact;
  const total = wins + losses + breakeven;
  const winRate = total > 0 ? (wins / total) * 100 : null;
  const progress = winRate === null ? 0 : Math.max(0, Math.min(winRate, 100));
  const progressLength = (progress / 100) * CIRCUMFERENCE;
  const lossRate = total > 0 ? (losses / total) * 100 : 0;

  if (isCompact) {
    return (
      <article
        className={cx(
          'relative isolate h-full min-h-[154px] overflow-hidden rounded-[26px] border border-[color:var(--border-color)] bg-[linear-gradient(180deg,var(--surface-raised),var(--surface))] p-5 shadow-[0_20px_42px_-32px_var(--shadow-color),inset_0_1px_0_rgba(255,255,255,0.06)] transition duration-300 hover:-translate-y-1 hover:border-[color:var(--accent-border-soft)]',
          className,
        )}
      >
        <div className="pointer-events-none absolute right-[-18%] top-[-44%] -z-10 h-40 w-40 rounded-full bg-[radial-gradient(circle,var(--accent-primary-glow),transparent_68%)] blur-2xl" />
        <div className="flex h-full flex-col justify-between gap-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[var(--muted)]">
                Outcome
              </p>
              <h3 className="mt-2 text-base font-semibold tracking-tight text-[var(--foreground)]">
                {title}
              </h3>
            </div>
            <p className="shrink-0 text-4xl font-semibold leading-none tracking-[-0.06em] text-[var(--foreground)]">
              {winRate === null ? 'New' : `${Math.round(winRate)}%`}
            </p>
          </div>

          <div>
            <div className="h-3 overflow-hidden rounded-full bg-[var(--surface-soft)]">
              <div
                className="h-full rounded-full bg-[linear-gradient(90deg,var(--chart-positive),color-mix(in_srgb,var(--chart-positive)_58%,white))]"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between gap-3 text-xs text-[var(--muted)]">
              <span>{caption ?? `${total} outcomes`}</span>
              <span>{losses} losses</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              {
                className: 'bg-[var(--chart-positive)]',
                label: 'Wins',
                value: wins,
              },
              {
                className: 'bg-[var(--chart-negative)]',
                label: 'Losses',
                value: losses,
              },
              {
                className: 'bg-[var(--chart-neutral)]',
                label: 'BE',
                value: breakeven,
              },
            ].map((item) => (
              <div
                key={item.label}
                className="min-w-0 rounded-[16px] border border-[color:var(--border-color)] bg-[var(--surface)] px-2.5 py-2"
              >
                <span className="inline-flex min-w-0 items-center gap-1.5 text-[9px] uppercase tracking-[0.16em] text-[var(--muted)]">
                  <span className={cx('h-1.5 w-1.5 shrink-0 rounded-full', item.className)} />
                  {item.label}
                </span>
                <span className="mt-1 block text-base font-semibold text-[var(--foreground)]">
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </article>
    );
  }

  return (
    <article
      className={cx(
        'relative isolate h-full min-h-[164px] overflow-hidden rounded-[28px] border border-[color:var(--border-color)] bg-[linear-gradient(180deg,var(--surface-raised),var(--surface))] p-5 shadow-[0_24px_48px_-34px_var(--shadow-color),inset_0_1px_0_rgba(255,255,255,0.06)] transition duration-300 hover:-translate-y-1 hover:border-[color:var(--accent-border-soft)] hover:shadow-[0_28px_54px_-34px_var(--shadow-color)]',
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-[-30%] -z-10 bg-[radial-gradient(circle_at_50%_18%,var(--accent-primary-glow),transparent_46%),radial-gradient(circle_at_80%_80%,var(--accent-secondary-glow),transparent_42%)] blur-2xl" />

      <div
        className={cx(
          'grid h-full gap-4',
          'place-items-center text-center',
        )}
      >
        <div
          className={cx(
            'relative aspect-square',
            'w-full max-w-[192px]',
          )}
        >
          <svg
            aria-hidden="true"
            className="-rotate-90"
            viewBox="0 0 100 100"
          >
            <circle
              cx="50"
              cy="50"
              fill="none"
              r={RADIUS}
              stroke="var(--surface-soft)"
              strokeWidth="9"
            />
            <circle
              cx="50"
              cy="50"
              fill="none"
              r={RADIUS}
              stroke="color-mix(in srgb, var(--chart-negative) 42%, var(--surface-raised))"
              strokeDasharray={`${(lossRate / 100) * CIRCUMFERENCE} ${CIRCUMFERENCE}`}
              strokeLinecap="round"
              strokeWidth="9"
              transform={`rotate(${progress * 3.6} 50 50)`}
            />
            <circle
              cx="50"
              cy="50"
              fill="none"
              r={RADIUS}
              stroke="var(--chart-positive)"
              strokeDasharray={`${progressLength} ${CIRCUMFERENCE}`}
              strokeLinecap="round"
              strokeWidth="9"
            />
          </svg>

          <div className="absolute inset-[17%] grid place-items-center rounded-full border border-[color:var(--border-strong)] bg-[linear-gradient(180deg,var(--surface-raised),var(--surface))] shadow-[0_18px_42px_-30px_var(--shadow-color),inset_0_1px_0_rgba(255,255,255,0.1)]">
            <div className="min-w-0 px-2 text-center">
              <p className="break-words font-mono text-[8px] uppercase tracking-[0.18em] text-[var(--muted)] sm:text-[9px] sm:tracking-[0.24em]">
                Win Rate
              </p>
              <p className="mt-1 text-[clamp(1.45rem,8vw,1.875rem)] font-semibold leading-none tracking-[-0.06em] text-[var(--foreground)]">
                {winRate === null ? 'New' : `${Math.round(winRate)}%`}
              </p>
            </div>
          </div>
        </div>

        <div className="w-full min-w-0">
          <div className="sr-only">
            <p className="text-sm text-[var(--muted)]">{title}</p>
          </div>
          <p className="mt-1 break-words text-sm font-medium text-[var(--foreground)]">
            {title}
          </p>
          <p className="mt-1 max-w-full break-words text-xs leading-5 text-[var(--muted)]">
            {caption ?? `${total} tracked outcome${total === 1 ? '' : 's'}`}
          </p>

          <div
            className={cx(
              'mt-4 grid min-w-0 gap-2',
              'grid-cols-1 sm:grid-cols-3',
            )}
          >
            {[
              {
                className: 'bg-[var(--chart-positive)]',
                label: 'Wins',
                value: wins,
              },
              {
                className: 'bg-[var(--chart-negative)]',
                label: 'Losses',
                value: losses,
              },
              {
                className: 'bg-[var(--chart-neutral)]',
                label: 'Breakevens',
                value: breakeven,
              },
            ].map((item) => (
              <div
                key={item.label}
                className={cx(
                  'min-w-0 rounded-[18px] border border-[color:var(--border-color)] bg-[var(--surface)] px-3 py-2',
                )}
              >
                <span className="inline-flex min-w-0 items-center gap-2 break-words text-[10px] uppercase tracking-[0.16em] text-[var(--muted)] sm:text-[11px] sm:tracking-[0.2em]">
                  <span className={cx('h-2 w-2 shrink-0 rounded-full', item.className)} />
                  {item.label}
                </span>
                <span className="mt-1 block shrink-0 text-lg font-semibold text-[var(--foreground)]">
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}
