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
        'relative z-10 mx-auto min-h-screen w-full overflow-x-clip px-4 pb-16 sm:px-6 lg:px-8',
        sizeClassNames[size],
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-[-12rem] inset-y-[-8rem] -z-10 overflow-visible"
      >
        <div className="animate-float-glow absolute left-[-10rem] top-0 h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(circle,rgba(127,29,29,0.2),transparent_74%)] blur-[110px]" />
        <div className="animate-float-glow absolute right-[-9rem] top-28 h-[30rem] w-[30rem] rounded-full bg-[radial-gradient(circle,rgba(163,138,120,0.12),transparent_76%)] blur-[120px] [animation-delay:1.2s]" />
      </div>
      <div className="relative z-10">{children}</div>
    </main>
  );
}
