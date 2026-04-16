import type { PropsWithChildren, ReactNode } from 'react';

import { cx } from '@/lib/utils';

type PanelProps = PropsWithChildren<{
  className?: string;
}>;

export function Panel({ children, className }: PanelProps) {
  return (
    <section
      className={cx(
        'relative isolate overflow-hidden rounded-[32px] border border-neutral-200/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(252,250,248,0.96))] shadow-[0_30px_80px_-40px_rgba(15,23,42,0.22),0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-xl before:pointer-events-none before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_top_right,rgba(190,24,93,0.08),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(159,18,57,0.05),transparent_34%)] before:opacity-100 after:pointer-events-none after:absolute after:inset-x-0 after:top-0 after:h-px after:bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.94),transparent)]',
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
        'flex flex-col gap-4 border-b border-neutral-200 px-6 py-6 sm:px-8',
        className,
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-2xl">
          {eyebrow ? (
            <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-rose-700/76">
              {eyebrow}
            </p>
          ) : null}
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-neutral-950 sm:text-3xl">
            {title}
          </h2>
          {description ? (
            <p className="mt-3 text-sm leading-7 text-neutral-600 sm:text-[15px]">
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
  label: string;
  value: string;
  caption?: string;
  tone?: 'neutral' | 'accent' | 'success' | 'danger';
};

const metricToneClassNames: Record<NonNullable<MetricCardProps['tone']>, string> =
  {
    neutral: 'from-neutral-100 via-white to-transparent',
    accent: 'from-rose-100 via-white to-transparent',
    success: 'from-amber-50 via-white to-transparent',
    danger: 'from-rose-100 via-white to-transparent',
  };

export function MetricCard({
  caption,
  label,
  tone = 'neutral',
  value,
}: MetricCardProps) {
  return (
    <article
      className={cx(
        'rounded-[28px] border border-neutral-200/85 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(250,249,247,0.95))] p-5 shadow-[0_22px_44px_-34px_rgba(15,23,42,0.22),inset_0_1px_0_rgba(255,255,255,0.95)] transition duration-300 hover:-translate-y-1 hover:border-rose-200/70',
        `bg-gradient-to-br ${metricToneClassNames[tone]}`,
      )}
    >
      <p className="text-sm text-neutral-500">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-neutral-950">
        {value}
      </p>
      {caption ? (
        <p className="mt-2 text-sm leading-6 text-neutral-600">{caption}</p>
      ) : null}
    </article>
  );
}
