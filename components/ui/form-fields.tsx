import type {
  InputHTMLAttributes,
  PropsWithChildren,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';

import { cx } from '@/lib/utils';

type BaseFieldProps = {
  error?: string;
  hint?: string;
  label: string;
  required?: boolean;
  wrapperClassName?: string;
};

const sharedFieldClassName =
  'w-full rounded-[24px] border border-neutral-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(250,249,247,0.96))] px-4 py-3.5 text-sm text-neutral-950 shadow-[0_16px_34px_-28px_rgba(15,23,42,0.18),inset_0_1px_0_rgba(255,255,255,0.96)] outline-none transition duration-300 placeholder:text-neutral-400 focus:border-rose-300/55 focus:bg-white focus:ring-2 focus:ring-rose-300/18';

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
      <span className="mb-2.5 flex items-center gap-2 text-sm font-medium text-neutral-800">
        <span>{label}</span>
        {required ? (
          <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] uppercase tracking-[0.22em] text-rose-700">
            Required
          </span>
        ) : null}
      </span>
      {children}
      {error ? (
        <span className="mt-2 block text-xs leading-5 text-rose-600">
          {error}
        </span>
      ) : hint ? (
        <span className="mt-2 block text-xs leading-5 text-neutral-500">
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
          error && 'border-rose-300 bg-rose-50/70 ring-2 ring-rose-200/40',
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
      <select
        aria-invalid={Boolean(error)}
        className={cx(
          sharedFieldClassName,
          error && 'border-rose-300 bg-rose-50/70 ring-2 ring-rose-200/40',
          inputClassName,
        )}
        {...props}
      >
        {children}
      </select>
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
          error && 'border-rose-300 bg-rose-50/70 ring-2 ring-rose-200/40',
          inputClassName,
        )}
        {...props}
      />
    </FieldShell>
  );
}

type CheckboxFieldProps = {
  checked: boolean;
  description?: string;
  label: string;
  onChange: InputHTMLAttributes<HTMLInputElement>['onChange'];
  wrapperClassName?: string;
};

export function CheckboxField({
  checked,
  description,
  label,
  onChange,
  wrapperClassName,
}: CheckboxFieldProps) {
  return (
    <label
      className={cx(
        'group flex min-h-[92px] items-center justify-between gap-4 rounded-[26px] border border-neutral-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(250,249,247,0.94))] p-5 shadow-[0_18px_42px_-34px_rgba(15,23,42,0.18),inset_0_1px_0_rgba(255,255,255,0.96)] transition duration-300 hover:-translate-y-1 hover:border-rose-200 hover:bg-white',
        wrapperClassName,
      )}
    >
      <span className="block">
        <span className="block text-sm font-medium text-neutral-900">{label}</span>
        {description ? (
          <span className="mt-1.5 block max-w-xs text-xs leading-5 text-neutral-500">
            {description}
          </span>
        ) : null}
      </span>
      <span className="relative shrink-0">
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="peer sr-only"
        />
        <span className="flex h-7 w-12 items-center rounded-full border border-neutral-200 bg-neutral-200/90 px-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] transition peer-checked:border-rose-300 peer-checked:bg-rose-100">
          <span className="h-5 w-5 rounded-full bg-white shadow-[0_10px_20px_-12px_rgba(15,23,42,0.32)] transition peer-checked:translate-x-5 peer-checked:bg-rose-700" />
        </span>
      </span>
    </label>
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
        : 'border-neutral-200 bg-white text-neutral-700';

  return (
    <p className={cx('rounded-[22px] border px-4 py-3 text-sm', toneClassName)}>
      {message}
    </p>
  );
}
