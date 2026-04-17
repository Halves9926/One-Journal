'use client';

import { AnimatePresence, motion } from 'framer-motion';

import { cx } from '@/lib/utils';

type FeedbackToastProps = {
  items?: string[];
  message: string;
  onClose?: () => void;
  title: string;
  tone?: 'error' | 'success' | 'neutral';
  visible: boolean;
};

export default function FeedbackToast({
  items,
  message,
  onClose,
  title,
  tone = 'neutral',
  visible,
}: FeedbackToastProps) {
  const toneClassName =
    tone === 'error'
      ? 'border-rose-200 bg-[var(--surface-raised)] text-[var(--foreground)]'
      : tone === 'success'
        ? 'border-emerald-200 bg-[var(--surface-raised)] text-[var(--foreground)]'
        : 'border-[color:var(--border-color)] bg-[var(--surface-raised)] text-[var(--foreground)]';

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          initial={{ opacity: 0, x: 20, y: -8 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          exit={{ opacity: 0, x: 20, y: -8 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="fixed right-4 top-24 z-50 w-[min(92vw,360px)]"
        >
          <div
            className={cx(
              'rounded-[28px] border p-5 shadow-[0_28px_60px_-32px_var(--shadow-color)]',
              toneClassName,
            )}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold">{title}</p>
                <p className="mt-1 text-sm text-[var(--muted)]">{message}</p>
              </div>
              {onClose ? (
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full border border-[color:var(--border-color)] px-2.5 py-1 text-xs text-[var(--muted)] transition hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
                >
                  Close
                </button>
              ) : null}
            </div>

            {items && items.length > 0 ? (
              <ul className="mt-4 space-y-2 text-sm text-[var(--muted-strong)]">
                {items.map((item) => (
                  <li
                    key={item}
                    className="rounded-2xl bg-[var(--surface)] px-3 py-2"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
