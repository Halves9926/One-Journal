'use client';

import { useTheme } from '@/components/ui/theme-provider';
import { cx } from '@/lib/utils';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      suppressHydrationWarning
      className={cx(
        'inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-[color:var(--border-color)] bg-[var(--surface-raised)] px-4 text-sm font-medium text-[var(--foreground)] shadow-[0_16px_36px_-30px_var(--shadow-color)] transition duration-300 hover:-translate-y-0.5 hover:border-[color:var(--border-strong)] hover:bg-[var(--surface-strong)]',
      )}
      aria-label="Toggle theme"
    >
      <span
        className={cx(
          'h-2.5 w-2.5 rounded-full transition',
          theme === 'dark' ? 'bg-emerald-400' : 'bg-rose-500',
        )}
      />
      {theme === 'dark' ? 'Dark' : 'Light'}
    </button>
  );
}
