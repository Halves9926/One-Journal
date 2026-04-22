import type { PropsWithChildren, ReactNode } from 'react';

import { cx } from '@/lib/utils';

type PanelProps = PropsWithChildren<{
  className?: string;
}>;

export function Panel({ children, className }: PanelProps) {
  return (
    <section
      className={cx(
        'relative isolate overflow-hidden rounded-[32px] border border-[color:var(--border-strong)] bg-[linear-gradient(180deg,var(--surface-strong),var(--surface))] shadow-[0_34px_90px_-46px_var(--shadow-color),0_10px_24px_-18px_color-mix(in_srgb,var(--shadow-color)_72%,transparent),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl before:pointer-events-none before:absolute before:inset-[-46%] before:bg-[radial-gradient(ellipse_at_top_right,var(--accent-panel-glow),transparent_72%),radial-gradient(ellipse_at_bottom_left,var(--accent-panel-glow-soft),transparent_74%)] before:opacity-90 before:blur-3xl after:pointer-events-none after:absolute after:inset-x-6 after:top-0 after:h-px after:bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.08),transparent)]',
        className,
      )}
    >
      <div className="relative z-10">{children}</div>
    </section>
  );
}

type PanelHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
};

export function PanelHeader({
  action,
  className,
  description,
  eyebrow,
  title,
}: PanelHeaderProps) {
  return (
    <div
      className={cx(
        'flex flex-col gap-4 px-6 pb-4 pt-6 sm:px-8 sm:pb-5',
        className,
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-2xl">
          {eyebrow ? (
            <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-[var(--accent-text)]">
              {eyebrow}
            </p>
          ) : null}
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-3xl">
            {title}
          </h2>
          {description ? (
            <p className="mt-3 text-sm leading-7 text-[var(--muted)] sm:text-[15px]">
              {description}
            </p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </div>
  );
}

type MetricCardProps = {
  className?: string;
  label: string;
  value: string;
  valueClassName?: string;
  caption?: string;
  tone?: 'neutral' | 'accent' | 'success' | 'danger';
};

const metricToneClassNames: Record<NonNullable<MetricCardProps['tone']>, string> =
  {
    neutral: 'from-white/0 via-transparent to-transparent',
    accent: 'from-[var(--accent-soft-bg-strong)] via-transparent to-transparent',
    success: 'from-emerald-500/14 via-transparent to-transparent',
    danger: 'from-rose-500/14 via-transparent to-transparent',
  };

export function MetricCard({
  caption,
  className,
  label,
  tone = 'neutral',
  value,
  valueClassName,
}: MetricCardProps) {
  return (
    <article
      className={cx(
        'min-h-[164px] rounded-[28px] border border-[color:var(--border-color)] bg-[linear-gradient(180deg,var(--surface-raised),var(--surface))] p-5 shadow-[0_24px_48px_-34px_var(--shadow-color),inset_0_1px_0_rgba(255,255,255,0.06)] transition duration-300 hover:-translate-y-1 hover:border-[color:var(--accent-border-soft)] hover:shadow-[0_28px_54px_-34px_var(--shadow-color)]',
        `bg-gradient-to-br ${metricToneClassNames[tone]}`,
        className,
      )}
    >
      <p className="text-sm text-[var(--muted)]">{label}</p>
      <p
        className={cx(
          'mt-3 text-3xl font-semibold tracking-tight text-[var(--foreground)]',
          valueClassName,
        )}
      >
        {value}
      </p>
      {caption ? (
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{caption}</p>
      ) : null}
    </article>
  );
}
