'use client';

import { useSyncExternalStore } from 'react';

import { useTheme } from '@/components/ui/theme-provider';
import { cx } from '@/lib/utils';

function subscribe() {
  return () => {};
}

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);

  return (
    <button
      type="button"
      onClick={toggleTheme}
      disabled={!mounted}
      className={cx(
        'inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-[color:var(--border-color)] bg-[var(--surface-raised)] px-4 text-sm font-medium text-[var(--foreground)] shadow-[0_16px_36px_-30px_var(--shadow-color)] transition duration-300 hover:-translate-y-0.5 hover:border-[color:var(--border-strong)] hover:bg-[var(--surface-strong)] disabled:cursor-default disabled:hover:translate-y-0',
      )}
      aria-label="Toggle theme"
      aria-pressed={mounted ? theme === 'dark' : undefined}
    >
      <span
        className={cx(
          'h-2.5 w-2.5 rounded-full transition',
          !mounted
            ? 'bg-[var(--muted)]'
            : theme === 'dark'
              ? 'bg-[var(--foreground)]'
              : 'bg-[var(--accent-solid)]',
        )}
      />
      {mounted ? (theme === 'dark' ? 'Dark' : 'Light') : 'Theme'}
    </button>
  );
}
