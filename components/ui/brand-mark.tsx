import { cx } from '@/lib/utils';

type BrandMarkProps = {
  className?: string;
  title?: string;
};

export default function BrandMark({ className, title }: BrandMarkProps) {
  return (
    <svg
      aria-hidden={title ? undefined : true}
      aria-label={title}
      className={cx('block h-full w-full', className)}
      role={title ? 'img' : undefined}
      viewBox="0 0 120 72"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M6 27.5 36 10h9.5v52H28.25V29.5L6 40.8V27.5Z"
        fill="var(--brand-mark-primary)"
      />
      <path
        clipRule="evenodd"
        d="M61.25 17.75h36.5l-8.2 38.2h2.25c6.1 0 10.75-4.35 12.45-11.65l4.95-21.25h9.6l-5.75 24.5C110.05 60.35 101.65 66 88.4 66H52.2c-9.65 0-15.7-5.8-15.7-15.05V36.5c0-11.15 9.9-18.75 24.75-18.75Zm.2 10.75c-5.25 0-8.45 2.75-8.45 7.2v19.55h25.6c2.35 0 3.9-1.25 4.45-3.6l4.95-23.15H61.45Z"
        fill="var(--brand-mark-primary)"
        fillRule="evenodd"
      />
      <path
        d="M62.5 30.75h21a4.15 4.15 0 0 1 0 8.3h-21a4.15 4.15 0 0 1 0-8.3Zm-7.3 12.4h32.6a4.15 4.15 0 0 1 0 8.3H55.2a4.15 4.15 0 0 1 0-8.3Zm0 12.4h23.2a4.15 4.15 0 0 1 0 8.3H55.2a4.15 4.15 0 0 1 0-8.3Z"
        fill="var(--brand-mark-secondary)"
      />
    </svg>
  );
}
