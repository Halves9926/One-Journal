'use client';

import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';

import { useClientReady } from '@/components/ui/use-client-ready';
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
  const isClient = useClientReady();

  const toneClassName =
    tone === 'error'
      ? 'border-[color:color-mix(in_srgb,var(--danger)_24%,transparent)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--danger)_7%,transparent),var(--surface-raised))] text-[var(--foreground)]'
      : tone === 'success'
        ? 'border-emerald-500/24 bg-[linear-gradient(180deg,rgba(16,185,129,0.08),var(--surface-raised))] text-[var(--foreground)]'
        : 'border-[color:var(--border-color)] bg-[linear-gradient(180deg,var(--surface-raised),var(--surface))] text-[var(--foreground)]';

  if (!isClient) {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      {visible ? (
        <motion.div
          initial={{ opacity: 0, x: 20, y: 24 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          exit={{ opacity: 0, x: 20, y: 18 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="pointer-events-none fixed inset-x-0 bottom-0 z-[90] flex justify-center px-4 pb-4 sm:justify-end sm:px-6"
          style={{
            paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
            paddingLeft: 'max(1rem, env(safe-area-inset-left))',
            paddingRight: 'max(1rem, env(safe-area-inset-right))',
          }}
        >
          <div
            className={cx(
              'pointer-events-auto w-[min(100%,380px)] rounded-[28px] border p-5 shadow-[0_28px_60px_-32px_var(--shadow-color)] backdrop-blur',
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
                    className="rounded-2xl border border-[color:var(--border-color)] bg-[var(--surface)] px-3 py-2"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
