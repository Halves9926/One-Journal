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
      className={cx(
        'relative z-10 mx-auto min-h-screen w-full overflow-hidden px-4 pb-12 pt-28 sm:px-6 sm:pt-32 lg:px-8',
        sizeClassNames[size],
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <div className="animate-float-glow absolute left-[-9rem] top-12 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(127,29,29,0.32),transparent_68%)] blur-3xl" />
        <div className="animate-float-glow absolute right-[-8rem] top-44 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(88,28,135,0.16),transparent_70%)] blur-3xl [animation-delay:1.2s]" />
        <div className="absolute inset-x-12 top-24 h-px bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.12),transparent)]" />
      </div>
      <div className="relative z-10">{children}</div>
    </main>
  );
}
