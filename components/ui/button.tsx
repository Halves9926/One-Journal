import Link, { type LinkProps } from 'next/link';
import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  PropsWithChildren,
} from 'react';

import { cx } from '@/lib/utils';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';
type ButtonSize = 'sm' | 'md' | 'lg';

type ButtonVariantsProps = {
  className?: string;
  size?: ButtonSize;
  variant?: ButtonVariant;
};

const baseButtonClassName =
  'inline-flex min-w-0 touch-manipulation items-center justify-center gap-2 rounded-full border text-sm font-semibold tracking-tight transition duration-300 ease-out will-change-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/24 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] disabled:cursor-not-allowed disabled:opacity-60';

const sizeClassNames: Record<ButtonSize, string> = {
  sm: 'min-h-11 px-4',
  md: 'min-h-11 px-5',
  lg: 'min-h-12 px-6 text-[15px]',
};

const variantClassNames: Record<ButtonVariant, string> = {
  primary:
    'border-[#65172d]/10 bg-[linear-gradient(135deg,#8f1d40,#5f132a_60%,#40101f)] text-white shadow-[0_24px_54px_-24px_rgba(127,29,29,0.42),inset_0_1px_0_rgba(255,255,255,0.2)] hover:-translate-y-1 hover:shadow-[0_30px_62px_-24px_rgba(127,29,29,0.46)] active:translate-y-0 active:scale-[0.99]',
  secondary:
    'border-[color:var(--border-color)] bg-[linear-gradient(180deg,var(--surface-raised),var(--surface))] text-[var(--foreground)] shadow-[0_20px_40px_-28px_var(--shadow-color),inset_0_1px_0_rgba(255,255,255,0.08)] hover:-translate-y-1 hover:border-[color:var(--border-strong)] hover:shadow-[0_26px_46px_-28px_var(--shadow-color)] active:translate-y-0 active:scale-[0.99]',
  ghost:
    'border-transparent bg-transparent text-[var(--muted-strong)] hover:border-[color:var(--border-color)] hover:bg-[var(--surface)] hover:text-[var(--foreground)]',
  destructive:
    'border-rose-200 bg-rose-50 text-rose-700 shadow-[0_18px_38px_-30px_rgba(190,24,93,0.24)] hover:-translate-y-1 hover:bg-rose-100 active:translate-y-0 active:scale-[0.99]',
};

export function buttonVariants({
  className,
  size = 'md',
  variant = 'primary',
}: ButtonVariantsProps = {}) {
  return cx(
    baseButtonClassName,
    sizeClassNames[size],
    variantClassNames[variant],
    className,
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  PropsWithChildren<ButtonVariantsProps>;

export function Button({
  children,
  className,
  size,
  variant,
  ...props
}: ButtonProps) {
  return (
    <button
      className={buttonVariants({ className, size, variant })}
      {...props}
    >
      {children}
    </button>
  );
}

type ButtonLinkProps = PropsWithChildren<
  LinkProps &
    Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> &
    ButtonVariantsProps
>;

export function ButtonLink({
  children,
  className,
  size,
  variant,
  ...props
}: ButtonLinkProps) {
  return (
    <Link
      className={buttonVariants({ className, size, variant })}
      {...props}
    >
      {children}
    </Link>
  );
}
