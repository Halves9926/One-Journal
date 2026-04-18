'use client';

import { cx } from '@/lib/utils';

type SwitchProps = {
  'aria-describedby'?: string;
  checked: boolean;
  className?: string;
  disabled?: boolean;
  onCheckedChange: (checked: boolean) => void;
};

export function Switch({
  'aria-describedby': ariaDescribedBy,
  checked,
  className,
  disabled = false,
  onCheckedChange,
}: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-describedby={ariaDescribedBy}
      disabled={disabled}
      onClick={() => {
        if (disabled) {
          return;
        }

        onCheckedChange(!checked);
      }}
      className={cx(
        'relative inline-flex h-8 w-14 shrink-0 items-center rounded-full border outline-none transition duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
        'focus-visible:ring-2 focus-visible:ring-[color:var(--accent-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent',
        'disabled:cursor-not-allowed disabled:opacity-60',
        checked
          ? 'border-[color:var(--accent-border-strong)] bg-[linear-gradient(135deg,var(--accent-gradient-start),var(--accent-gradient-mid)_60%,var(--accent-gradient-end))] shadow-[0_18px_34px_-22px_var(--accent-button-shadow)]'
          : 'border-[color:var(--border-color)] bg-[linear-gradient(180deg,var(--surface-soft),rgba(0,0,0,0.08))] shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_12px_22px_-18px_var(--shadow-color)]',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cx(
          'pointer-events-none absolute left-1 top-1 h-6 w-6 rounded-full bg-[var(--surface-raised)] shadow-[0_14px_24px_-16px_var(--shadow-color),inset_0_1px_0_rgba(255,255,255,0.32)] transition duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
          checked && 'translate-x-6 bg-white',
        )}
      />
      <span
        aria-hidden="true"
        className={cx(
          'pointer-events-none absolute left-[0.45rem] top-[0.45rem] h-[1.1rem] w-[1.1rem] rounded-full blur-[8px] transition duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
          checked
            ? 'translate-x-6 bg-white/35 opacity-100'
            : 'bg-white/12 opacity-0',
        )}
      />
    </button>
  );
}
