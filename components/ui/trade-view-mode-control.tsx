'use client';

import {
  getListViewModeLabel,
  LIST_VIEW_MODES,
  type ListViewMode,
} from '@/components/ui/list-view-preferences';
import { cx } from '@/lib/utils';

export function TradeViewModeControl({
  label = 'View',
  mode,
  onChange,
}: {
  label?: string;
  mode: ListViewMode;
  onChange: (mode: ListViewMode) => void;
}) {
  return (
    <div
      className="flex flex-wrap items-center gap-1.5"
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <span className="mr-1 text-xs text-[var(--muted)]">{label}</span>
      {LIST_VIEW_MODES.map((item) => (
        <button
          key={item}
          className={cx(
            'rounded-full border px-2.5 py-1.5 text-xs font-medium transition',
            mode === item
              ? 'border-[color:var(--accent-border-soft)] bg-[var(--accent-soft-bg)] text-[var(--accent-text)]'
              : 'border-[color:var(--border-color)] bg-[var(--surface)] text-[var(--muted-strong)] hover:border-[color:var(--border-strong)] hover:text-[var(--foreground)]',
          )}
          title={getListViewModeLabel(item)}
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onChange(item);
          }}
          onPointerDown={(event) => event.stopPropagation()}
        >
          {getListViewModeLabel(item)}
        </button>
      ))}
    </div>
  );
}

