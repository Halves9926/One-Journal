'use client';

import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MeasuringStrategy,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import {
  useEffect,
  useId,
  useMemo,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

import { Button, ButtonLink } from '@/components/ui/button';
import { MessageBanner } from '@/components/ui/form-fields';
import type { ListViewMode } from '@/components/ui/list-view-preferences';
import { MetricCard, Panel, PanelHeader } from '@/components/ui/panel';
import TradeCalendarView from '@/components/ui/trade-calendar-view';
import TradeCard from '@/components/ui/trade-card';
import WinRateWidget, {
  type WinRateWidgetVariant,
} from '@/components/ui/win-rate-widget';
import {
  useWidgetPreferences,
  winRateVariantLabels,
} from '@/components/ui/widget-preferences';
import {
  buildHomeLayoutStorageKey,
  parseHomeLayoutPreference,
  writeHomeLayoutPreference,
} from '@/lib/home-layout';
import {
  formatCompactNumber,
  formatPnl,
  formatTradeDate,
  getPnlCardClassName,
  getPnlTextClassName,
  type TradeSummary,
  type TradeView,
} from '@/lib/trades';
import { cx } from '@/lib/utils';

const HOME_LAYOUT_CHANGE_EVENT = 'one-journal:home-layout-change';

export const HOME_WIDGET_IDS = [
  'total-trades',
  'win-rate',
  'net-pnl',
  'average-rr',
  'average-winning-rr',
  'last-trade',
  'recent-trades',
] as const;

type HomeWidgetId = (typeof HOME_WIDGET_IDS)[number];
type HomeWidgetSize = 'compact' | 'medium' | 'full';
type HomeWidgetVariantMap = Partial<Record<HomeWidgetId, WinRateWidgetVariant>>;

type HomeWidgetDefinition = {
  description: string;
  id: HomeWidgetId;
  name: string;
  render: (context: HomeLayoutRenderContext) => ReactNode;
  size: HomeWidgetSize;
  visualOptions?: Array<{
    description: string;
    id: WinRateWidgetVariant;
    label: string;
  }>;
};

type HomeLayoutRenderContext = {
  activeAccountName: string;
  recentTrades: TradeView[];
  summary: TradeSummary;
  tradeListMode: ListViewMode;
  tradesError: string | null;
  tradesLoading: boolean;
  widgetVariants: HomeWidgetVariantMap;
  onDeleteTrade: (tradeId: string) => Promise<{ error: string | null }>;
};

const DEFAULT_HOME_WIDGET_IDS: HomeWidgetId[] = [...HOME_WIDGET_IDS];

const homeWidgetGridClassNames: Record<HomeWidgetSize, string> = {
  compact: 'sm:col-span-1 xl:col-span-4',
  full: 'sm:col-span-2 xl:col-span-12',
  medium: 'sm:col-span-2 xl:col-span-6',
};

const homeWidgetPreviewSizeClassNames: Record<HomeWidgetSize, string> = {
  compact: 'w-[min(88vw,360px)]',
  full: 'w-[min(92vw,720px)]',
  medium: 'w-[min(90vw,520px)]',
};

function subscribeToHomeLayout(onStoreChange: () => void) {
  if (typeof window === 'undefined') {
    return () => {};
  }

  function handleStorageChange(event: StorageEvent) {
    if (event.storageArea === window.localStorage) {
      onStoreChange();
    }
  }

  window.addEventListener('storage', handleStorageChange);
  window.addEventListener(HOME_LAYOUT_CHANGE_EVENT, onStoreChange);

  return () => {
    window.removeEventListener('storage', handleStorageChange);
    window.removeEventListener(HOME_LAYOUT_CHANGE_EVENT, onStoreChange);
  };
}

function getHomeLayoutSnapshot(storageKey: string) {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage.getItem(storageKey);
}

function getServerHomeLayoutSnapshot() {
  return null;
}

function dispatchHomeLayoutChange() {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new Event(HOME_LAYOUT_CHANGE_EVENT));
}

function isHomeWidgetId(value: string): value is HomeWidgetId {
  return (HOME_WIDGET_IDS as readonly string[]).includes(value);
}

function normalizeHomeWidgetIds(values: string[]) {
  const seenWidgetIds = new Set<HomeWidgetId>();
  const widgetIds: HomeWidgetId[] = [];

  for (const value of values) {
    if (!isHomeWidgetId(value) || seenWidgetIds.has(value)) {
      continue;
    }

    seenWidgetIds.add(value);
    widgetIds.push(value);
  }

  return widgetIds;
}

function normalizeHomeWidgetVariants(values: Record<string, string> | undefined) {
  const widgetVariants: HomeWidgetVariantMap = {};

  if (values?.['win-rate'] === 'compact' || values?.['win-rate'] === 'radial') {
    widgetVariants['win-rate'] = values['win-rate'];
  }

  return widgetVariants;
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 20 20"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path
        d="m14.2 14.2 3.05 3.05M8.75 15.5a6.75 6.75 0 1 1 0-13.5 6.75 6.75 0 0 1 0 13.5Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 20 20"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M10 4v12M4 10h12" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 20 20"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="m4.75 10.5 3.25 3.25 7.25-7.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 20 20"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="m5 5 10 10M15 5 5 15" strokeLinecap="round" />
    </svg>
  );
}

function MoveIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 20 20"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path
        d="M10 2.75v14.5M2.75 10h14.5M10 2.75 7.75 5M10 2.75 12.25 5M10 17.25 7.75 15M10 17.25 12.25 15M2.75 10 5 7.75M2.75 10 5 12.25M17.25 10 15 7.75M17.25 10 15 12.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 20 20"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path
        d="M7.25 4.25h5.5M3.75 6.5h12.5M8 9v5M12 9v5M5.75 6.5l.5 9.25a1.5 1.5 0 0 0 1.5 1.42h4.5a1.5 1.5 0 0 0 1.5-1.42l.5-9.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const homeWidgetRegistry = [
  {
    description: 'Trade count for the active account scope.',
    id: 'total-trades',
    name: 'Total Trades',
    size: 'compact',
    render: ({ summary }) => (
      <MetricCard
        caption="for the active account"
        label="Total trades"
        tone="neutral"
        value={String(summary.totalTrades)}
      />
    ),
  },
  {
    description: 'Win-rate widget with selectable visual style.',
    id: 'win-rate',
    name: 'Win Rate',
    size: 'medium',
    visualOptions: [
      {
        description: 'Large radial gauge with outcome cards.',
        id: 'radial',
        label: 'Radial',
      },
      {
        description: 'Dense card for compact home layouts.',
        id: 'compact',
        label: 'Compact',
      },
    ],
    render: ({ summary, widgetVariants }) => (
      <WinRateWidget
        breakeven={summary.breakeven}
        caption={`${summary.totalTrades} trades`}
        losses={summary.losses}
        variant={widgetVariants['win-rate'] ?? 'radial'}
        wins={summary.wins}
      />
    ),
  },
  {
    description: 'Net performance for the active account.',
    id: 'net-pnl',
    name: 'Net PnL',
    size: 'compact',
    render: ({ summary }) => (
      <MetricCard
        caption="net performance on this account"
        className={getPnlCardClassName(summary.netPnl)}
        label="Net PnL"
        tone={summary.netPnl < 0 ? 'danger' : 'accent'}
        value={formatPnl(summary.netPnl)}
        valueClassName={getPnlTextClassName(summary.netPnl)}
      />
    ),
  },
  {
    description: 'Average recorded RR.',
    id: 'average-rr',
    name: 'Average RR',
    size: 'compact',
    render: ({ summary }) => (
      <MetricCard
        caption="average risk-to-reward captured"
        label="Average RR"
        tone="neutral"
        value={
          summary.avgRr === null
            ? 'Not enough history'
            : formatCompactNumber(summary.avgRr)
        }
      />
    ),
  },
  {
    description: 'Average RR on winning trades only.',
    id: 'average-winning-rr',
    name: 'Average Winning RR',
    size: 'compact',
    render: ({ summary }) => (
      <MetricCard
        caption={`${summary.wins} winning trade${summary.wins === 1 ? '' : 's'} with RR`}
        label="Avg Winning RR"
        tone="success"
        value={
          summary.avgWinningRr === null
            ? 'No winning RR'
            : formatCompactNumber(summary.avgWinningRr)
        }
      />
    ),
  },
  {
    description: 'Most recent execution summary.',
    id: 'last-trade',
    name: 'Last Trade',
    size: 'compact',
    render: ({ summary }) => (
      <MetricCard
        caption={
          summary.lastTrade?.date
            ? formatTradeDate(summary.lastTrade.date)
            : 'No trades yet'
        }
        label="Last trade"
        tone="accent"
        value={summary.lastTrade?.symbol || 'Waiting for first trade'}
      />
    ),
  },
  {
    description: 'Recent trade cards with the current list preference.',
    id: 'recent-trades',
    name: 'Recent Trades',
    size: 'full',
    render: ({
      activeAccountName,
      onDeleteTrade,
      recentTrades,
      tradeListMode,
      tradesError,
      tradesLoading,
    }) => (
      <Panel className="h-full overflow-hidden">
        <PanelHeader
          action={
            <div className="flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/dashboard" variant="secondary">
                Full Dashboard
              </ButtonLink>
              <ButtonLink href="/accounts" variant="ghost">
                Manage Accounts
              </ButtonLink>
            </div>
          }
          description="Featured previews first, compact cards after. Screenshots stay embedded when available."
          eyebrow="recent trades"
          title={`${activeAccountName} recap`}
        />

        <div className="px-6 pb-6 pt-2 sm:px-8 sm:pb-8">
          {tradesLoading ? (
            <div className="rounded-[24px] border border-[color:var(--border-color)] bg-[var(--surface)] px-4 py-5 text-sm text-[var(--muted)]">
              Loading recent trades...
            </div>
          ) : null}

          {tradesError ? (
            <MessageBanner
              message={`Trades query error: ${tradesError}`}
              tone="error"
            />
          ) : null}

          {!tradesLoading && !tradesError && recentTrades.length === 0 ? (
            <div className="rounded-[26px] border border-dashed border-[color:var(--border-color)] bg-[var(--surface)] px-5 py-6 text-sm leading-7 text-[var(--muted)]">
              No trades yet for this account. Save the first execution and home becomes a real account recap.
            </div>
          ) : null}

          {!tradesLoading &&
          !tradesError &&
          recentTrades.length > 0 &&
          tradeListMode === 'calendar' ? (
            <TradeCalendarView
              trades={recentTrades}
              emptyMessage="No recent trades available for the calendar."
            />
          ) : null}

          {!tradesLoading &&
          !tradesError &&
          recentTrades.length > 0 &&
          tradeListMode !== 'calendar' ? (
            <div
              className={cx(
                'grid gap-4',
                tradeListMode === 'stacked' || tradeListMode === 'compact'
                  ? 'grid-cols-1'
                  : 'xl:grid-cols-2',
              )}
            >
              {recentTrades.map((trade, index) => (
                <TradeCard
                  key={trade.id}
                  className={
                    tradeListMode === 'cards' && index === 0
                      ? 'xl:col-span-2'
                      : ''
                  }
                  compact={tradeListMode === 'compact'}
                  editHref={`/trades/${trade.id}/edit`}
                  featured={tradeListMode === 'cards' && index === 0}
                  index={index}
                  onDelete={onDeleteTrade}
                  trade={trade}
                  variant={tradeListMode === 'stacked' ? 'stacked' : undefined}
                />
              ))}
            </div>
          ) : null}
        </div>
      </Panel>
    ),
  },
] satisfies HomeWidgetDefinition[];

const homeWidgetMap = new Map<HomeWidgetId, HomeWidgetDefinition>(
  homeWidgetRegistry.map((widget) => [widget.id, widget]),
);

function HomeWidgetFinderModal({
  activeWidgetIds,
  allWidgetsActive,
  onAdd,
  onAddAll,
  onClose,
  onRemove,
  onVariantChange,
  open,
  widgetVariants,
}: {
  activeWidgetIds: HomeWidgetId[];
  allWidgetsActive: boolean;
  onAdd: (widgetId: HomeWidgetId, variant?: WinRateWidgetVariant) => void;
  onAddAll: () => void;
  onClose: () => void;
  onRemove: (widgetId: HomeWidgetId) => void;
  onVariantChange: (
    widgetId: HomeWidgetId,
    variant: WinRateWidgetVariant,
  ) => void;
  open: boolean;
  widgetVariants: HomeWidgetVariantMap;
}) {
  const searchId = useId();
  const [query, setQuery] = useState('');
  const activeWidgetIdSet = useMemo(
    () => new Set<HomeWidgetId>(activeWidgetIds),
    [activeWidgetIds],
  );
  const filteredWidgets = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return homeWidgetRegistry;
    }

    return homeWidgetRegistry.filter((widget) =>
      `${widget.name} ${widget.description}`.toLowerCase().includes(normalizedQuery),
    );
  }, [query]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, open]);

  if (!open || typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[1000] flex items-end justify-center overflow-x-hidden px-3 py-4 sm:items-center sm:px-6">
      <button
        aria-label="Close home widget finder"
        className="absolute inset-0 bg-black/45 backdrop-blur-sm"
        type="button"
        onClick={onClose}
      />
      <div
        aria-modal="true"
        className="relative z-10 flex max-h-[calc(100vh-2rem)] w-full max-w-5xl flex-col overflow-hidden rounded-[32px] border border-[color:var(--border-strong)] bg-[linear-gradient(180deg,var(--surface-raised),var(--surface))] shadow-[0_34px_90px_-36px_rgba(0,0,0,0.48)]"
        role="dialog"
      >
        <div className="border-b border-[color:var(--border-color)] px-5 py-5 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-[var(--accent-text)]">
                Home
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--foreground)]">
                Find Widgets
              </h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                {activeWidgetIds.length} active of {homeWidgetRegistry.length}
              </p>
            </div>
            <button
              aria-label="Close"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[color:var(--border-color)] bg-[var(--surface)] text-[var(--muted-strong)] transition hover:border-[color:var(--border-strong)] hover:text-[var(--foreground)]"
              type="button"
              onClick={onClose}
            >
              <CloseIcon className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <div className="relative min-w-0 flex-1">
              <label className="sr-only" htmlFor={searchId}>
                Search home widgets
              </label>
              <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
              <input
                autoComplete="off"
                className="min-h-12 w-full rounded-full border border-[color:var(--border-color)] bg-[var(--surface)] py-3 pl-11 pr-4 text-sm text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted)] focus:border-[color:var(--accent-border-strong)] focus:ring-2 focus:ring-[color:var(--accent-focus-ring)]"
                id={searchId}
                placeholder="Search widgets"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
            <Button
              className="shrink-0"
              disabled={allWidgetsActive}
              size="md"
              type="button"
              variant="secondary"
              onClick={onAddAll}
            >
              {allWidgetsActive ? (
                <CheckIcon className="h-4 w-4" />
              ) : (
                <PlusIcon className="h-4 w-4" />
              )}
              {allWidgetsActive ? 'All widgets active' : 'Add all widgets'}
            </Button>
          </div>
        </div>

        <div className="overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
          {filteredWidgets.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2">
              {filteredWidgets.map((widget) => {
                const isActive = activeWidgetIdSet.has(widget.id);
                const activeVariant = widgetVariants[widget.id];

                return (
                  <article
                    key={widget.id}
                    className={cx(
                      'rounded-[26px] border border-[color:var(--border-color)] bg-[linear-gradient(180deg,var(--surface-raised),var(--surface))] p-4 shadow-[0_18px_42px_-34px_var(--shadow-color)] transition duration-300',
                      isActive &&
                        'border-[color:var(--accent-border-soft)] bg-[linear-gradient(180deg,var(--accent-soft-bg),var(--surface))]',
                    )}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-[color:var(--border-color)] bg-[var(--surface)] px-3 py-1 text-[11px] text-[var(--muted-strong)]">
                        {widget.size}
                      </span>
                      {isActive ? (
                        <span className="rounded-full border border-[color:var(--accent-border-soft)] bg-[var(--accent-soft-bg)] px-3 py-1 text-[11px] text-[var(--accent-text)]">
                          Active
                        </span>
                      ) : null}
                      {activeVariant ? (
                        <span className="rounded-full border border-[color:var(--border-color)] bg-[var(--surface)] px-3 py-1 text-[11px] text-[var(--muted-strong)]">
                          {winRateVariantLabels[activeVariant]}
                        </span>
                      ) : null}
                    </div>
                    <h3 className="mt-3 text-lg font-semibold tracking-tight text-[var(--foreground)]">
                      {widget.name}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                      {widget.description}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {widget.visualOptions ? (
                        widget.visualOptions.map((option) => {
                          const isSelected = activeVariant === option.id;

                          return (
                            <Button
                              key={option.id}
                              size="sm"
                              type="button"
                              variant={
                                isActive && isSelected ? 'primary' : 'secondary'
                              }
                              onClick={() => {
                                if (isActive) {
                                  onVariantChange(widget.id, option.id);
                                  return;
                                }

                                onAdd(widget.id, option.id);
                              }}
                            >
                              {isActive && isSelected ? (
                                <CheckIcon className="h-4 w-4" />
                              ) : (
                                <PlusIcon className="h-4 w-4" />
                              )}
                              {isActive ? option.label : `Add ${option.label}`}
                            </Button>
                          );
                        })
                      ) : isActive ? (
                        <Button
                          size="sm"
                          type="button"
                          variant="secondary"
                          onClick={() => onRemove(widget.id)}
                        >
                          <TrashIcon className="h-4 w-4" />
                          Remove
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          type="button"
                          variant="primary"
                          onClick={() => onAdd(widget.id)}
                        >
                          <PlusIcon className="h-4 w-4" />
                          Add
                        </Button>
                      )}
                      {isActive && widget.visualOptions ? (
                        <Button
                          size="sm"
                          type="button"
                          variant="secondary"
                          onClick={() => onRemove(widget.id)}
                        >
                          <TrashIcon className="h-4 w-4" />
                          Remove
                        </Button>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="rounded-[26px] border border-dashed border-[color:var(--border-color)] bg-[var(--surface)] px-5 py-8 text-center text-sm leading-7 text-[var(--muted)]">
              No widgets match this search.
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function SortableHomeWidget({
  canRemove,
  children,
  editing,
  onRemove,
  onVariantChange,
  widget,
  widgetVariants,
}: {
  canRemove: boolean;
  children: ReactNode;
  editing: boolean;
  onRemove: () => void;
  onVariantChange: (variant: WinRateWidgetVariant) => void;
  widget: HomeWidgetDefinition;
  widgetVariants: HomeWidgetVariantMap;
}) {
  const {
    attributes,
    isDragging,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
  } = useSortable({
    disabled: !editing,
    id: widget.id,
  });
  const translatedTransform = transform
    ? `translate3d(${Math.round(transform.x)}px, ${Math.round(transform.y)}px, 0)`
    : undefined;
  const style: CSSProperties = {
    opacity: isDragging ? 0.22 : undefined,
    transform: translatedTransform,
    transition: isDragging ? undefined : transition,
    zIndex: isDragging ? 20 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      className={cx(homeWidgetGridClassNames[widget.size], 'relative min-w-0')}
      style={style}
    >
      {editing ? (
        <div className="mb-3 flex min-w-0 flex-wrap items-center gap-2 rounded-[22px] border border-[color:var(--accent-border-soft)] bg-[linear-gradient(180deg,var(--accent-soft-bg),var(--surface))] px-3 py-2 shadow-[0_14px_30px_-26px_var(--shadow-color)]">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <button
              ref={setActivatorNodeRef}
              aria-label={`Drag ${widget.name}`}
              className="inline-flex h-10 w-10 shrink-0 touch-none items-center justify-center rounded-full border border-[color:var(--accent-border-soft)] bg-[var(--surface-raised)] text-[var(--accent-text)] transition duration-150 hover:border-[color:var(--accent-border-strong)] hover:bg-[var(--accent-soft-bg)] active:scale-95"
              title="Drag"
              type="button"
              {...attributes}
              {...(listeners ?? {})}
            >
              <MoveIcon className="h-4 w-4" />
            </button>
            <span className="truncate text-sm font-medium text-[var(--foreground)]">
              {widget.name}
            </span>
          </div>
          {widget.visualOptions ? (
            <div className="flex min-w-0 flex-wrap gap-1.5">
              {widget.visualOptions.map((option) => (
                <button
                  key={option.id}
                  className={cx(
                    'rounded-full border px-3 py-1.5 text-[11px] font-medium transition',
                    widgetVariants[widget.id] === option.id
                      ? 'border-[color:var(--accent-border-soft)] bg-[var(--accent-soft-bg)] text-[var(--accent-text)]'
                      : 'border-[color:var(--border-color)] bg-[var(--surface-raised)] text-[var(--muted-strong)] hover:border-[color:var(--border-strong)] hover:text-[var(--foreground)]',
                  )}
                  type="button"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    onVariantChange(option.id);
                  }}
                  onPointerDown={(event) => event.stopPropagation()}
                >
                  {option.label}
                </button>
              ))}
            </div>
          ) : null}
          {canRemove ? (
            <button
              aria-label={`Remove ${widget.name}`}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-rose-200/70 bg-[var(--surface-raised)] text-rose-600 transition duration-150 hover:bg-rose-50 hover:text-rose-700 active:scale-95 dark:border-rose-500/35 dark:text-rose-300 dark:hover:bg-rose-500/12"
              title="Remove"
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onRemove();
              }}
              onPointerDown={(event) => event.stopPropagation()}
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      ) : null}
      <div
        className={cx(
          'h-full min-w-0 transition-[box-shadow,border-color,opacity] duration-150 [&>article]:h-full [&>section]:h-full',
          editing &&
            'overflow-hidden rounded-[34px] ring-1 ring-[color:var(--accent-border-soft)] ring-offset-2 ring-offset-[var(--background)]',
        )}
      >
        {children}
      </div>
    </div>
  );
}

function HomeWidgetDragPreview({
  children,
  widget,
}: {
  children: ReactNode;
  widget: HomeWidgetDefinition;
}) {
  return (
    <div
      className={cx(
        'pointer-events-none overflow-hidden rounded-[34px] border border-[color:var(--accent-border-soft)] bg-[linear-gradient(180deg,var(--surface-raised),var(--surface))] p-3 shadow-[0_34px_90px_-36px_rgba(0,0,0,0.45)]',
        'max-h-[min(72vh,560px)]',
        homeWidgetPreviewSizeClassNames[widget.size],
      )}
    >
      <div className="mb-2 flex items-center gap-2 rounded-[18px] border border-[color:var(--border-color)] bg-[var(--surface)] px-3 py-2">
        <MoveIcon className="h-4 w-4 text-[var(--accent-text)]" />
        <span className="truncate text-sm font-medium text-[var(--foreground)]">
          {widget.name}
        </span>
      </div>
      <div className="min-w-0 overflow-hidden rounded-[28px] [&>article]:h-auto [&>section]:h-auto">
        {children}
      </div>
    </div>
  );
}

export function HomeLayoutWorkspace({
  accountId,
  activeAccountName,
  onDeleteTrade,
  recentTrades,
  summary,
  tradeListMode,
  tradesError,
  tradesLoading,
  userId,
}: {
  accountId: string | null;
  activeAccountName: string;
  onDeleteTrade: (tradeId: string) => Promise<{ error: string | null }>;
  recentTrades: TradeView[];
  summary: TradeSummary;
  tradeListMode: ListViewMode;
  tradesError: string | null;
  tradesLoading: boolean;
  userId: string;
}) {
  const [finderOpen, setFinderOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [activeWidgetId, setActiveWidgetId] = useState<HomeWidgetId | null>(null);
  const { preferences: widgetPreferences } = useWidgetPreferences();
  const storageKey = useMemo(
    () => buildHomeLayoutStorageKey({ accountId, userId }),
    [accountId, userId],
  );
  const layoutSnapshot = useSyncExternalStore(
    subscribeToHomeLayout,
    () => getHomeLayoutSnapshot(storageKey),
    getServerHomeLayoutSnapshot,
  );
  const widgetIds = useMemo(() => {
    const preference = parseHomeLayoutPreference(layoutSnapshot);

    return preference
      ? normalizeHomeWidgetIds(preference.widgetIds)
      : DEFAULT_HOME_WIDGET_IDS;
  }, [layoutSnapshot]);
  const widgetVariants = useMemo(() => {
    const preference = parseHomeLayoutPreference(layoutSnapshot);
    const defaultVariants: HomeWidgetVariantMap = {
      'win-rate': widgetPreferences.defaultWinRateVariant,
    };

    return preference
      ? {
          ...defaultVariants,
          ...normalizeHomeWidgetVariants(preference.widgetVariants),
        }
      : defaultVariants;
  }, [layoutSnapshot, widgetPreferences.defaultWinRateVariant]);
  const selectedWidgets = useMemo(
    () =>
      widgetIds
        .map((widgetId) => homeWidgetMap.get(widgetId) ?? null)
        .filter((widget): widget is HomeWidgetDefinition => Boolean(widget)),
    [widgetIds],
  );
  const activeWidget = activeWidgetId
    ? homeWidgetMap.get(activeWidgetId) ?? null
    : null;
  const allWidgetsActive = widgetIds.length === HOME_WIDGET_IDS.length;
  const isDefaultLayout =
    widgetIds.length === DEFAULT_HOME_WIDGET_IDS.length &&
    widgetIds.every(
      (widgetId, index) => widgetId === DEFAULT_HOME_WIDGET_IDS[index],
    ) &&
    (widgetVariants['win-rate'] ?? 'radial') ===
      widgetPreferences.defaultWinRateVariant;
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 4,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 80,
        tolerance: 6,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const renderContext = useMemo(
    () => ({
      activeAccountName,
      onDeleteTrade,
      recentTrades,
      summary,
      tradeListMode,
      tradesError,
      tradesLoading,
      widgetVariants,
    }),
    [
      activeAccountName,
      onDeleteTrade,
      recentTrades,
      summary,
      tradeListMode,
      tradesError,
      tradesLoading,
      widgetVariants,
    ],
  );

  function saveLayout(
    nextWidgetIds: HomeWidgetId[],
    nextWidgetVariants: HomeWidgetVariantMap = widgetVariants,
  ) {
    const activeWidgetIdSet = new Set(nextWidgetIds);
    const prunedWidgetVariants = Object.fromEntries(
      Object.entries(nextWidgetVariants).filter(
        (entry): entry is [HomeWidgetId, WinRateWidgetVariant] =>
          activeWidgetIdSet.has(entry[0] as HomeWidgetId) &&
          typeof entry[1] === 'string',
      ),
    );

    writeHomeLayoutPreference(storageKey, nextWidgetIds, prunedWidgetVariants);
    dispatchHomeLayoutChange();
  }

  function addWidget(widgetId: HomeWidgetId, variant?: WinRateWidgetVariant) {
    if (widgetIds.includes(widgetId)) {
      if (variant) {
        updateWidgetVariant(widgetId, variant);
      }
      return;
    }

    saveLayout([...widgetIds, widgetId], {
      ...widgetVariants,
      ...(widgetId === 'win-rate'
        ? { [widgetId]: variant ?? widgetPreferences.defaultWinRateVariant }
        : {}),
    });
  }

  function addAllWidgets() {
    if (allWidgetsActive) {
      return;
    }

    saveLayout([...HOME_WIDGET_IDS]);
  }

  function removeWidget(widgetId: HomeWidgetId) {
    const nextWidgetIds = widgetIds.filter(
      (currentWidgetId) => currentWidgetId !== widgetId,
    );

    if (nextWidgetIds.length === 0) {
      setEditing(false);
    }

    saveLayout(nextWidgetIds);
  }

  function restoreDefaultLayout() {
    saveLayout(DEFAULT_HOME_WIDGET_IDS, {
      'win-rate': widgetPreferences.defaultWinRateVariant,
    });
  }

  function updateWidgetVariant(
    widgetId: HomeWidgetId,
    variant: WinRateWidgetVariant,
  ) {
    saveLayout(widgetIds, {
      ...widgetVariants,
      [widgetId]: variant,
    });
  }

  function handleDragStart(event: DragStartEvent) {
    const activeId = String(event.active.id);

    if (isHomeWidgetId(activeId)) {
      setActiveWidgetId(activeId);
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveWidgetId(null);

    const activeId = String(event.active.id);
    const overId = event.over ? String(event.over.id) : null;

    if (
      !overId ||
      activeId === overId ||
      !isHomeWidgetId(activeId) ||
      !isHomeWidgetId(overId)
    ) {
      return;
    }

    const oldIndex = widgetIds.indexOf(activeId);
    const newIndex = widgetIds.indexOf(overId);

    if (oldIndex < 0 || newIndex < 0) {
      return;
    }

    saveLayout(arrayMove(widgetIds, oldIndex, newIndex));
  }

  return (
    <div className="space-y-4">
      <Panel className="overflow-hidden">
        <PanelHeader
          action={
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
              <Button
                size="md"
                type="button"
                variant="secondary"
                onClick={() => setFinderOpen(true)}
              >
                <SearchIcon className="h-4 w-4" />
                Find Widgets
              </Button>
              <Button
                disabled={allWidgetsActive}
                size="md"
                type="button"
                variant="secondary"
                onClick={addAllWidgets}
              >
                {allWidgetsActive ? (
                  <CheckIcon className="h-4 w-4" />
                ) : (
                  <PlusIcon className="h-4 w-4" />
                )}
                {allWidgetsActive ? 'All widgets active' : 'Add all widgets'}
              </Button>
              <Button
                disabled={widgetIds.length === 0}
                size="md"
                type="button"
                variant={editing ? 'primary' : 'secondary'}
                onClick={() => setEditing((currentValue) => !currentValue)}
              >
                {editing ? (
                  <CheckIcon className="h-4 w-4" />
                ) : (
                  <MoveIcon className="h-4 w-4" />
                )}
                {editing ? 'Done' : 'Modify Layout'}
              </Button>
            </div>
          }
          description={`Saved locally for ${activeAccountName}.`}
          eyebrow="workspace"
          title="Home layout"
        />
        <div className="flex flex-wrap gap-2 px-6 pb-6 text-xs text-[var(--muted)] sm:px-8 sm:pb-7">
          <span className="rounded-full border border-[color:var(--border-color)] bg-[var(--surface)] px-3 py-1.5">
            {widgetIds.length} active widgets
          </span>
          <span className="rounded-full border border-[color:var(--border-color)] bg-[var(--surface)] px-3 py-1.5">
            {homeWidgetRegistry.length} available
          </span>
          {!isDefaultLayout ? (
            <button
              className="rounded-full border border-[color:var(--border-color)] bg-[var(--surface)] px-3 py-1.5 text-[var(--muted-strong)] transition hover:border-[color:var(--border-strong)] hover:text-[var(--foreground)]"
              type="button"
              onClick={restoreDefaultLayout}
            >
              Restore default
            </button>
          ) : null}
        </div>
      </Panel>

      {selectedWidgets.length === 0 ? (
        <Panel className="p-6 sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-[var(--accent-text)]">
                Empty layout
              </p>
              <h3 className="mt-3 text-2xl font-semibold tracking-tight text-[var(--foreground)]">
                Choose the widgets for Home
              </h3>
            </div>
            <Button type="button" variant="primary" onClick={() => setFinderOpen(true)}>
              <SearchIcon className="h-4 w-4" />
              Find Widgets
            </Button>
          </div>
        </Panel>
      ) : (
        <DndContext
          collisionDetection={closestCenter}
          measuring={{
            droppable: {
              strategy: MeasuringStrategy.Always,
            },
          }}
          sensors={sensors}
          onDragCancel={() => setActiveWidgetId(null)}
          onDragEnd={handleDragEnd}
          onDragStart={handleDragStart}
        >
          <SortableContext items={widgetIds} strategy={rectSortingStrategy}>
            <div
              className={cx(
                'grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 xl:grid-cols-12',
                editing && 'gap-7 select-none sm:gap-8 xl:gap-9',
              )}
            >
              {selectedWidgets.map((widget) => (
                <SortableHomeWidget
                  key={widget.id}
                  canRemove={selectedWidgets.length > 1}
                  editing={editing}
                  widget={widget}
                  widgetVariants={widgetVariants}
                  onRemove={() => removeWidget(widget.id)}
                  onVariantChange={(variant) =>
                    updateWidgetVariant(widget.id, variant)
                  }
                >
                  {widget.render(renderContext)}
                </SortableHomeWidget>
              ))}
            </div>
          </SortableContext>
          <DragOverlay adjustScale={false} dropAnimation={null}>
            {activeWidget ? (
              <HomeWidgetDragPreview widget={activeWidget}>
                {activeWidget.render(renderContext)}
              </HomeWidgetDragPreview>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      <HomeWidgetFinderModal
        activeWidgetIds={widgetIds}
        allWidgetsActive={allWidgetsActive}
        onAdd={addWidget}
        onAddAll={addAllWidgets}
        onClose={() => setFinderOpen(false)}
        onRemove={removeWidget}
        onVariantChange={updateWidgetVariant}
        open={finderOpen}
        widgetVariants={widgetVariants}
      />
    </div>
  );
}
