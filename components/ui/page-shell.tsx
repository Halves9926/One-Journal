import type { PropsWithChildren } from 'react';

import { cx } from '@/lib/utils';

type PageShellProps = PropsWithChildren<{
  className?: string;
  size?: 'default' | 'wide' | 'narrow';
}>;

const sizeClassNames = {
  default: 'max-w-6xl',
  wide: 'max-w-7xl',
  narrow: 'max-w-5xl',
};

export default function PageShell({
  children,
  className,
  size = 'default',
}: PageShellProps) {
  return (
    <main
      style={{
        paddingTop: 'calc(var(--topbar-offset, 13rem) + 1rem)',
      }}
      className={cx(
        'relative z-10 mx-auto min-h-[100svh] w-full overflow-x-clip px-4 pb-24 sm:px-6 sm:pb-28 lg:px-8 lg:pb-32',
        sizeClassNames[size],
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-[-12rem] inset-y-[-8rem] -z-10 overflow-visible"
      >
        <div className="animate-float-glow absolute left-[-10rem] top-0 h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(circle,var(--accent-primary-glow),transparent_74%)] blur-[110px]" />
        <div className="animate-float-glow absolute right-[-9rem] top-28 h-[30rem] w-[30rem] rounded-full bg-[radial-gradient(circle,var(--accent-secondary-glow),transparent_76%)] blur-[120px] [animation-delay:1.2s]" />
        <div className="absolute inset-x-[-18rem] bottom-[-18rem] h-[34rem] bg-[radial-gradient(ellipse_at_center,var(--accent-panel-glow-soft),transparent_76%)] blur-[110px] opacity-80" />
      </div>
      <div className="relative z-10">{children}</div>
    </main>
  );
}
