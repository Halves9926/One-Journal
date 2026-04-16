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
      ? 'border-rose-200 bg-white text-neutral-900'
      : tone === 'success'
        ? 'border-emerald-200 bg-white text-neutral-900'
        : 'border-neutral-200 bg-white text-neutral-900';

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
              'rounded-[28px] border p-5 shadow-[0_28px_60px_-32px_rgba(15,23,42,0.28)]',
              toneClassName,
            )}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold">{title}</p>
                <p className="mt-1 text-sm text-neutral-600">{message}</p>
              </div>
              {onClose ? (
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full border border-neutral-200 px-2.5 py-1 text-xs text-neutral-500 transition hover:bg-neutral-50 hover:text-neutral-900"
                >
                  Close
                </button>
              ) : null}
            </div>

            {items && items.length > 0 ? (
              <ul className="mt-4 space-y-2 text-sm text-neutral-700">
                {items.map((item) => (
                  <li key={item} className="rounded-2xl bg-neutral-50 px-3 py-2">
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

