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
        'relative z-10 mx-auto min-h-screen w-full overflow-hidden px-4 pb-16 sm:px-6 lg:px-8',
        sizeClassNames[size],
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <div className="animate-float-glow absolute left-[-9rem] top-12 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(127,29,29,0.28),transparent_68%)] blur-3xl" />
        <div className="animate-float-glow absolute right-[-8rem] top-44 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(163,138,120,0.14),transparent_70%)] blur-3xl [animation-delay:1.2s]" />
      </div>
      <div className="relative z-10">{children}</div>
    </main>
  );
}
