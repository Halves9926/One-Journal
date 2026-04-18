import type {
  InputHTMLAttributes,
  PropsWithChildren,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';
import { useId } from 'react';

import { Switch } from '@/components/ui/switch';
import { cx } from '@/lib/utils';

type BaseFieldProps = {
  error?: string;
  hint?: string;
  label: string;
  required?: boolean;
  wrapperClassName?: string;
};

const sharedFieldClassName =
  'w-full rounded-[24px] border border-[color:var(--border-color)] bg-[linear-gradient(180deg,var(--surface-raised),var(--surface))] px-4 py-3.5 text-sm text-[var(--foreground)] shadow-[0_16px_34px_-28px_var(--shadow-color),inset_0_1px_0_rgba(255,255,255,0.08)] outline-none transition duration-300 placeholder:text-[var(--muted)] focus:border-[color:var(--accent-border-strong)] focus:bg-[var(--surface-raised)] focus:ring-2 focus:ring-[color:var(--accent-focus-ring)]';

function SelectChevron() {
  return (
    <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-[var(--muted)]">
      <svg
        aria-hidden="true"
        viewBox="0 0 16 16"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
      >
        <path d="M4.25 6.5 8 10.25 11.75 6.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

function FieldShell({
  children,
  error,
  hint,
  label,
  required,
  wrapperClassName,
}: PropsWithChildren<BaseFieldProps>) {
  return (
    <label className={cx('block', wrapperClassName)}>
      <span className="mb-2.5 flex items-center gap-2 text-sm font-medium text-[var(--foreground)]">
        <span>{label}</span>
        {required ? (
          <span className="rounded-full border border-[color:var(--accent-border-soft)] bg-[var(--accent-soft-bg)] px-2 py-0.5 text-[10px] uppercase tracking-[0.22em] text-[var(--accent-text)]">
            Required
          </span>
        ) : null}
      </span>
      {children}
      {error ? (
        <span className="mt-2 block text-xs leading-5 text-[var(--danger)]">
          {error}
        </span>
      ) : hint ? (
        <span className="mt-2 block text-xs leading-5 text-[var(--muted)]">
          {hint}
        </span>
      ) : null}
    </label>
  );
}

type InputFieldProps = BaseFieldProps &
  InputHTMLAttributes<HTMLInputElement> & {
    inputClassName?: string;
  };

export function InputField({
  error,
  hint,
  inputClassName,
  label,
  required,
  wrapperClassName,
  ...props
}: InputFieldProps) {
  return (
    <FieldShell
      error={error}
      hint={hint}
      label={label}
      required={required}
      wrapperClassName={wrapperClassName}
    >
      <input
        aria-invalid={Boolean(error)}
        className={cx(
          sharedFieldClassName,
          error && 'border-[color:var(--danger)] bg-[color:color-mix(in_srgb,var(--danger)_8%,var(--surface-raised))] ring-2 ring-[color:color-mix(in_srgb,var(--danger)_22%,transparent)]',
          inputClassName,
        )}
        {...props}
      />
    </FieldShell>
  );
}

type SelectFieldProps = BaseFieldProps &
  SelectHTMLAttributes<HTMLSelectElement> & {
    inputClassName?: string;
  };

export function SelectField({
  children,
  error,
  hint,
  inputClassName,
  label,
  required,
  wrapperClassName,
  ...props
}: PropsWithChildren<SelectFieldProps>) {
  return (
    <FieldShell
      error={error}
      hint={hint}
      label={label}
      required={required}
      wrapperClassName={wrapperClassName}
    >
      <div className="relative">
        <select
          aria-invalid={Boolean(error)}
          className={cx(
            sharedFieldClassName,
            'appearance-none pr-12',
            error &&
              'border-[color:var(--danger)] bg-[color:color-mix(in_srgb,var(--danger)_8%,var(--surface-raised))] ring-2 ring-[color:color-mix(in_srgb,var(--danger)_22%,transparent)]',
            inputClassName,
          )}
          {...props}
        >
          {children}
        </select>
        <SelectChevron />
      </div>
    </FieldShell>
  );
}

type TextareaFieldProps = BaseFieldProps &
  TextareaHTMLAttributes<HTMLTextAreaElement> & {
    inputClassName?: string;
  };

export function TextareaField({
  error,
  hint,
  inputClassName,
  label,
  required,
  wrapperClassName,
  ...props
}: TextareaFieldProps) {
  return (
    <FieldShell
      error={error}
      hint={hint}
      label={label}
      required={required}
      wrapperClassName={wrapperClassName}
    >
      <textarea
        aria-invalid={Boolean(error)}
        className={cx(
          sharedFieldClassName,
          'min-h-32 resize-y',
          error && 'border-[color:var(--danger)] bg-[color:color-mix(in_srgb,var(--danger)_8%,var(--surface-raised))] ring-2 ring-[color:color-mix(in_srgb,var(--danger)_22%,transparent)]',
          inputClassName,
        )}
        {...props}
      />
    </FieldShell>
  );
}

type SwitchFieldProps = {
  checked: boolean;
  description?: string;
  disabled?: boolean;
  label: string;
  onCheckedChange: (checked: boolean) => void;
  wrapperClassName?: string;
};

export function SwitchField({
  checked,
  description,
  disabled,
  label,
  onCheckedChange,
  wrapperClassName,
}: SwitchFieldProps) {
  const descriptionId = useId();

  return (
    <div
      className={cx(
        'group flex min-h-[92px] items-center justify-between gap-4 rounded-[26px] border border-[color:var(--border-color)] bg-[linear-gradient(180deg,var(--surface-raised),var(--surface))] p-5 shadow-[0_18px_42px_-34px_var(--shadow-color),inset_0_1px_0_rgba(255,255,255,0.08)] transition duration-300 hover:-translate-y-1 hover:border-[color:var(--accent-border-soft)] hover:shadow-[0_24px_50px_-34px_var(--shadow-color)]',
        wrapperClassName,
      )}
    >
      <span className="block">
        <span className="block text-sm font-medium text-[var(--foreground)]">{label}</span>
        {description ? (
          <span
            id={descriptionId}
            className="mt-1.5 block max-w-xs text-xs leading-5 text-[var(--muted)]"
          >
            {description}
          </span>
        ) : null}
      </span>
      <Switch
        checked={checked}
        disabled={disabled}
        aria-describedby={description ? descriptionId : undefined}
        onCheckedChange={onCheckedChange}
      />
    </div>
  );
}

export function CheckboxField({
  checked,
  description,
  disabled,
  label,
  onCheckedChange,
  wrapperClassName,
}: SwitchFieldProps) {
  return (
    <SwitchField
      checked={checked}
      description={description}
      disabled={disabled}
      label={label}
      onCheckedChange={onCheckedChange}
      wrapperClassName={wrapperClassName}
    />
  );
}

type MessageBannerProps = {
  message: string;
  tone: 'error' | 'success' | 'neutral';
};

export function MessageBanner({ message, tone }: MessageBannerProps) {
  const toneClassName =
    tone === 'error'
      ? 'border-rose-200 bg-rose-50 text-rose-700'
      : tone === 'success'
        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
        : 'border-[color:var(--border-color)] bg-[var(--surface-raised)] text-[var(--muted-strong)]';

  return (
    <p className={cx('rounded-[22px] border px-4 py-3 text-sm', toneClassName)}>
      {message}
    </p>
  );
}
