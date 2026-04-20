'use client';

import {
  closestCenter,
  defaultDropAnimationSideEffects,
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
  defaultAnimateLayoutChanges,
  SortableContext,
  sortableKeyboardCoordinates,
  type AnimateLayoutChanges,
  type SortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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

import { Button } from '@/components/ui/button';
import {
  ANALYTICS_METRIC_IDS,
  DEFAULT_ANALYTICS_METRIC_IDS,
  analyticsMetricRegistry,
  getAnalyticsMetricById,
  getAnalyticsMetricGridClassName,
  getAnalyticsMetricShellClassName,
  isAnalyticsMetricId,
  normalizeAnalyticsMetricIds,
  type AnalyticsMetricDefinition,
  type AnalyticsMetricId,
} from '@/components/ui/analytics-metrics';
import { Panel, PanelHeader } from '@/components/ui/panel';
import {
  buildAnalyticsLayoutStorageKey,
  parseAnalyticsLayoutPreference,
  writeAnalyticsLayoutPreference,
} from '@/lib/analytics-layout';
import type { AnalyticsFilters, AnalyticsSnapshot } from '@/lib/analytics';
import { cx } from '@/lib/utils';

const ANALYTICS_LAYOUT_CHANGE_EVENT = 'one-journal:analytics-layout-change';

const fastSortableTransition = {
  duration: 120,
  easing: 'cubic-bezier(0.2, 0, 0, 1)',
};

const fastAnimateLayoutChanges: AnimateLayoutChanges = (args) =>
  defaultAnimateLayoutChanges({
    ...args,
    transition: fastSortableTransition,
  });

const stableRectSortingStrategy: SortingStrategy = ({
  activeIndex,
  index,
  overIndex,
  rects,
}) => {
  const oldRect = rects[index];
  const newRect = arrayMove(rects, overIndex, activeIndex)[index];

  if (!oldRect || !newRect) {
    return null;
  }

  return {
    x: newRect.left - oldRect.left,
    y: newRect.top - oldRect.top,
    scaleX: 1,
    scaleY: 1,
  };
};

const analyticsDropAnimation = {
  duration: 120,
  easing: 'cubic-bezier(0.2, 0, 0, 1)',
  sideEffects: defaultDropAnimationSideEffects({
    styles: {
      active: {
        opacity: '0.22',
      },
    },
  }),
};

type DragOverlayRect = {
  height: number;
  width: number;
};

function subscribeToAnalyticsLayout(onStoreChange: () => void) {
  if (typeof window === 'undefined') {
    return () => {};
  }

  function handleStorageChange(event: StorageEvent) {
    if (event.storageArea === window.localStorage) {
      onStoreChange();
    }
  }

  window.addEventListener('storage', handleStorageChange);
  window.addEventListener(ANALYTICS_LAYOUT_CHANGE_EVENT, onStoreChange);

  return () => {
    window.removeEventListener('storage', handleStorageChange);
    window.removeEventListener(ANALYTICS_LAYOUT_CHANGE_EVENT, onStoreChange);
  };
}

function getAnalyticsLayoutSnapshot(storageKey: string) {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage.getItem(storageKey);
}

function getServerAnalyticsLayoutSnapshot() {
  return null;
}

function dispatchAnalyticsLayoutChange() {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new Event(ANALYTICS_LAYOUT_CHANGE_EVENT));
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

function ArrowIcon({
  className,
  direction,
}: {
  className?: string;
  direction: 'down' | 'up';
}) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 20 20"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      {direction === 'up' ? (
        <path d="M10 16V4M5.5 8.5 10 4l4.5 4.5" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <path d="M10 4v12M5.5 11.5 10 16l4.5-4.5" strokeLinecap="round" strokeLinejoin="round" />
      )}
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

function MetricFinderModal({
  activeMetricIds,
  allMetricsActive,
  onAdd,
  onAddAll,
  onClose,
  onRemove,
  open,
}: {
  activeMetricIds: AnalyticsMetricId[];
  allMetricsActive: boolean;
  onAdd: (metricId: AnalyticsMetricId) => void;
  onAddAll: () => void;
  onClose: () => void;
  onRemove: (metricId: AnalyticsMetricId) => void;
  open: boolean;
}) {
  const searchId = useId();
  const [query, setQuery] = useState('');
  const activeMetricIdSet = useMemo(
    () => new Set<AnalyticsMetricId>(activeMetricIds),
    [activeMetricIds],
  );
  const filteredMetrics = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return analyticsMetricRegistry;
    }

    return analyticsMetricRegistry.filter((metric) =>
      metric.name.toLowerCase().includes(normalizedQuery),
    );
  }, [query]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const root = document.documentElement;
    const previousOverlay = root.dataset.oneJournalOverlay;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    root.dataset.oneJournalOverlay = 'find-metrics';
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      if (previousOverlay) {
        root.dataset.oneJournalOverlay = previousOverlay;
      } else {
        delete root.dataset.oneJournalOverlay;
      }

      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  if (typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[1000] flex items-end justify-center overflow-x-hidden px-3 py-4 sm:items-center sm:px-6">
      <button
        aria-label="Close metrics finder"
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
                Metrics
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--foreground)]">
                Find Metrics
              </h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                {activeMetricIds.length} active of {analyticsMetricRegistry.length}
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
                Search metrics
              </label>
              <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
              <input
                autoComplete="off"
                className="min-h-12 w-full rounded-full border border-[color:var(--border-color)] bg-[var(--surface)] py-3 pl-11 pr-4 text-sm text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted)] focus:border-[color:var(--accent-border-strong)] focus:ring-2 focus:ring-[color:var(--accent-focus-ring)]"
                id={searchId}
                placeholder="Search by name"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
            <Button
              className="shrink-0"
              disabled={allMetricsActive}
              size="md"
              type="button"
              variant="secondary"
              onClick={onAddAll}
            >
              {allMetricsActive ? (
                <CheckIcon className="h-4 w-4" />
              ) : (
                <PlusIcon className="h-4 w-4" />
              )}
              {allMetricsActive ? 'All metrics active' : 'Add all metrics'}
            </Button>
          </div>
        </div>

        <div className="overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
          {filteredMetrics.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2">
              {filteredMetrics.map((metric) => {
                const isActive = activeMetricIdSet.has(metric.id);

                return (
                  <article
                    key={metric.id}
                    className={cx(
                      'rounded-[26px] border border-[color:var(--border-color)] bg-[linear-gradient(180deg,var(--surface-raised),var(--surface))] p-4 shadow-[0_18px_42px_-34px_var(--shadow-color)] transition duration-300',
                      isActive &&
                        'border-[color:var(--accent-border-soft)] bg-[linear-gradient(180deg,var(--accent-soft-bg),var(--surface))]',
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full border border-[color:var(--border-color)] bg-[var(--surface)] px-3 py-1 text-[11px] text-[var(--muted-strong)]">
                            {metric.category}
                          </span>
                          <span className="rounded-full border border-[color:var(--border-color)] bg-[var(--surface)] px-3 py-1 text-[11px] text-[var(--muted-strong)]">
                            {metric.size}
                          </span>
                          {isActive ? (
                            <span className="rounded-full border border-[color:var(--accent-border-soft)] bg-[var(--accent-soft-bg)] px-3 py-1 text-[11px] text-[var(--accent-text)]">
                              Active
                            </span>
                          ) : null}
                        </div>
                        <h3 className="mt-3 text-lg font-semibold tracking-tight text-[var(--foreground)]">
                          {metric.name}
                        </h3>
                        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                          {metric.description}
                        </p>
                      </div>
                    </div>

                    {metric.requiredData && metric.requiredData.length > 0 ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {metric.requiredData.map((item) => (
                          <span
                            key={item}
                            className="rounded-full bg-[var(--surface)] px-3 py-1 text-[11px] text-[var(--muted)]"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    ) : null}

                    <div className="mt-4 flex flex-wrap gap-2">
                      {isActive ? (
                        <Button
                          size="sm"
                          type="button"
                          variant="secondary"
                          onClick={() => onRemove(metric.id)}
                        >
                          <TrashIcon className="h-4 w-4" />
                          Remove
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          type="button"
                          variant="primary"
                          onClick={() => onAdd(metric.id)}
                        >
                          <PlusIcon className="h-4 w-4" />
                          Add
                        </Button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="rounded-[26px] border border-dashed border-[color:var(--border-color)] bg-[var(--surface)] px-5 py-8 text-center text-sm leading-7 text-[var(--muted)]">
              No metrics match this search.
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function SortableAnalyticsWidget({
  canMoveDown,
  canMoveUp,
  children,
  editing,
  metric,
  onMoveDown,
  onMoveUp,
  onRemove,
}: {
  canMoveDown: boolean;
  canMoveUp: boolean;
  children: ReactNode;
  editing: boolean;
  metric: AnalyticsMetricDefinition;
  onMoveDown: () => void;
  onMoveUp: () => void;
  onRemove: () => void;
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
    animateLayoutChanges: fastAnimateLayoutChanges,
    disabled: !editing,
    id: metric.id,
    transition: fastSortableTransition,
  });
  const normalizedTransform = transform
    ? {
        ...transform,
        scaleX: 1,
        scaleY: 1,
      }
    : null;
  const style: CSSProperties = {
    opacity: isDragging ? 0.22 : undefined,
    transform: CSS.Transform.toString(normalizedTransform),
    transition: isDragging ? 'none' : transition,
    zIndex: isDragging ? 1 : undefined,
  };
  const handleProps = editing ? { ...attributes, ...(listeners ?? {}) } : {};

  return (
    <div
      ref={setNodeRef}
      className={cx(
        getAnalyticsMetricGridClassName(metric.size),
        'relative min-w-0 will-change-transform',
      )}
      style={style}
    >
      {editing ? (
        <>
          <button
            ref={setActivatorNodeRef}
            aria-label={`Drag ${metric.name}`}
            className="absolute left-4 top-4 z-20 inline-flex h-12 w-12 touch-none items-center justify-center rounded-full border border-[color:var(--accent-border-soft)] bg-[var(--surface-raised)] text-[var(--accent-text)] shadow-[0_14px_32px_-26px_var(--shadow-color)] transition duration-150 hover:border-[color:var(--accent-border-strong)] hover:bg-[var(--accent-soft-bg)] active:scale-95"
            title="Drag"
            type="button"
            {...handleProps}
          >
            <MoveIcon className="h-4 w-4" />
          </button>
          <button
            aria-label={`Remove ${metric.name}`}
            className="absolute right-4 top-4 z-20 inline-flex h-10 w-10 items-center justify-center rounded-full border border-rose-200/70 bg-[var(--surface-raised)] text-rose-600 shadow-[0_14px_32px_-26px_var(--shadow-color)] transition duration-150 hover:bg-rose-50 hover:text-rose-700 active:scale-95 dark:border-rose-500/35 dark:text-rose-300 dark:hover:bg-rose-500/12"
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
        </>
      ) : null}
      <div
        className={cx(
          getAnalyticsMetricShellClassName(metric.size),
          'relative h-full min-w-0 transition-[box-shadow,border-color,opacity] duration-150 [&>article]:h-full [&>section]:h-full',
          editing &&
            'rounded-[34px] ring-1 ring-[color:var(--accent-border-soft)] ring-offset-4 ring-offset-[var(--background)]',
        )}
      >
        {children}
      </div>
      {editing ? (
        <div className="mt-3 grid grid-cols-2 gap-2 sm:hidden">
          <Button
            disabled={!canMoveUp}
            size="sm"
            type="button"
            variant="secondary"
            onClick={onMoveUp}
          >
            <ArrowIcon className="h-4 w-4" direction="up" />
            Up
          </Button>
          <Button
            disabled={!canMoveDown}
            size="sm"
            type="button"
            variant="secondary"
            onClick={onMoveDown}
          >
            <ArrowIcon className="h-4 w-4" direction="down" />
            Down
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export function AnalyticsLayoutWorkspace({
  analytics,
  filters,
  scopeLabel,
  totalTradesAvailable,
  userId,
}: {
  analytics: AnalyticsSnapshot;
  filters: AnalyticsFilters;
  scopeLabel: string;
  totalTradesAvailable: number;
  userId: string;
}) {
  const [finderOpen, setFinderOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [activeMetricId, setActiveMetricId] = useState<AnalyticsMetricId | null>(null);
  const [activeDragRect, setActiveDragRect] = useState<DragOverlayRect | null>(null);
  const storageKey = useMemo(
    () =>
      buildAnalyticsLayoutStorageKey({
        accountId: filters.accountId,
        userId,
      }),
    [filters.accountId, userId],
  );
  const layoutSnapshot = useSyncExternalStore(
    subscribeToAnalyticsLayout,
    () => getAnalyticsLayoutSnapshot(storageKey),
    getServerAnalyticsLayoutSnapshot,
  );
  const metricIds = useMemo(() => {
    const preference = parseAnalyticsLayoutPreference(layoutSnapshot);

    return preference
      ? normalizeAnalyticsMetricIds(preference.metricIds)
      : DEFAULT_ANALYTICS_METRIC_IDS;
  }, [layoutSnapshot]);
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
      analytics,
      filters,
      scopeLabel,
      totalTradesAvailable,
    }),
    [analytics, filters, scopeLabel, totalTradesAvailable],
  );
  const selectedMetrics = useMemo(
    () =>
      metricIds
        .map((metricId) => getAnalyticsMetricById(metricId))
        .filter((metric): metric is AnalyticsMetricDefinition => Boolean(metric)),
    [metricIds],
  );
  const allMetricsActive = metricIds.length === ANALYTICS_METRIC_IDS.length;
  const activeMetric = activeMetricId ? getAnalyticsMetricById(activeMetricId) : null;
  const isDefaultLayout = useMemo(
    () =>
      metricIds.length === DEFAULT_ANALYTICS_METRIC_IDS.length &&
      metricIds.every(
        (metricId, index) => metricId === DEFAULT_ANALYTICS_METRIC_IDS[index],
      ),
    [metricIds],
  );

  function saveMetricIds(nextMetricIds: AnalyticsMetricId[]) {
    writeAnalyticsLayoutPreference(storageKey, nextMetricIds);
    dispatchAnalyticsLayoutChange();
  }

  function addMetric(metricId: AnalyticsMetricId) {
    if (metricIds.includes(metricId)) {
      return;
    }

    saveMetricIds([...metricIds, metricId]);
  }

  function addAllMetrics() {
    if (allMetricsActive) {
      return;
    }

    saveMetricIds([...ANALYTICS_METRIC_IDS]);
  }

  function removeMetric(metricId: AnalyticsMetricId) {
    const nextMetricIds = metricIds.filter(
      (currentMetricId) => currentMetricId !== metricId,
    );

    if (nextMetricIds.length === 0) {
      setEditing(false);
    }

    saveMetricIds(nextMetricIds);
  }

  function restoreDefaultMetrics() {
    saveMetricIds(DEFAULT_ANALYTICS_METRIC_IDS);
  }

  function moveMetric(metricId: AnalyticsMetricId, direction: 'down' | 'up') {
    const currentIndex = metricIds.indexOf(metricId);
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

    if (
      currentIndex < 0 ||
      targetIndex < 0 ||
      targetIndex >= metricIds.length
    ) {
      return;
    }

    saveMetricIds(arrayMove(metricIds, currentIndex, targetIndex));
  }

  function handleDragStart(event: DragStartEvent) {
    const activeId = String(event.active.id);

    if (!isAnalyticsMetricId(activeId)) {
      return;
    }

    const initialRect = event.active.rect.current.initial;

    setActiveMetricId(activeId);
    setActiveDragRect(
      initialRect
        ? {
            height: initialRect.height,
            width: initialRect.width,
          }
        : null,
    );
  }

  function clearActiveDragState() {
    setActiveMetricId(null);
    setActiveDragRect(null);
  }

  function handleDragEnd(event: DragEndEvent) {
    const activeId = String(event.active.id);
    const overId = event.over ? String(event.over.id) : null;

    if (
      !overId ||
      activeId === overId ||
      !isAnalyticsMetricId(activeId) ||
      !isAnalyticsMetricId(overId)
    ) {
      clearActiveDragState();
      return;
    }

    const oldIndex = metricIds.indexOf(activeId);
    const newIndex = metricIds.indexOf(overId);

    if (oldIndex < 0 || newIndex < 0) {
      clearActiveDragState();
      return;
    }

    saveMetricIds(arrayMove(metricIds, oldIndex, newIndex));
    clearActiveDragState();
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
                Find Metrics
              </Button>
              <Button
                disabled={allMetricsActive}
                size="md"
                type="button"
                variant="secondary"
                onClick={addAllMetrics}
              >
                {allMetricsActive ? (
                  <CheckIcon className="h-4 w-4" />
                ) : (
                  <PlusIcon className="h-4 w-4" />
                )}
                {allMetricsActive ? 'All metrics active' : 'Add all metrics'}
              </Button>
              <Button
                disabled={metricIds.length === 0}
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
          description={`Saved locally for ${scopeLabel}.`}
          eyebrow="workspace"
          title="Analytics layout"
        />
        <div className="flex flex-wrap gap-2 px-6 pb-6 text-xs text-[var(--muted)] sm:px-8 sm:pb-7">
          <span className="rounded-full border border-[color:var(--border-color)] bg-[var(--surface)] px-3 py-1.5">
            {metricIds.length} active widgets
          </span>
          <span className="rounded-full border border-[color:var(--border-color)] bg-[var(--surface)] px-3 py-1.5">
            {analyticsMetricRegistry.length} available
          </span>
          {!isDefaultLayout ? (
            <button
              className="rounded-full border border-[color:var(--border-color)] bg-[var(--surface)] px-3 py-1.5 text-[var(--muted-strong)] transition hover:border-[color:var(--border-strong)] hover:text-[var(--foreground)]"
              type="button"
              onClick={restoreDefaultMetrics}
            >
              Restore default
            </button>
          ) : null}
        </div>
      </Panel>

      {selectedMetrics.length === 0 ? (
        <Panel className="p-6 sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-[var(--accent-text)]">
                Empty layout
              </p>
              <h3 className="mt-3 text-2xl font-semibold tracking-tight text-[var(--foreground)]">
                Choose the metrics for this workspace
              </h3>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button type="button" variant="primary" onClick={() => setFinderOpen(true)}>
                <SearchIcon className="h-4 w-4" />
                Find Metrics
              </Button>
              <Button
                disabled={allMetricsActive}
                type="button"
                variant="secondary"
                onClick={addAllMetrics}
              >
                <PlusIcon className="h-4 w-4" />
                Add all metrics
              </Button>
            </div>
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
          onDragCancel={clearActiveDragState}
          onDragEnd={handleDragEnd}
          onDragStart={handleDragStart}
        >
          <SortableContext items={metricIds} strategy={stableRectSortingStrategy}>
            <div
              className={cx(
                'grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 xl:grid-cols-12',
                editing && 'select-none',
              )}
            >
              {selectedMetrics.map((metric, index) => (
                <SortableAnalyticsWidget
                  key={metric.id}
                  canMoveDown={index < selectedMetrics.length - 1}
                  canMoveUp={index > 0}
                  editing={editing}
                  metric={metric}
                  onMoveDown={() => moveMetric(metric.id, 'down')}
                  onMoveUp={() => moveMetric(metric.id, 'up')}
                  onRemove={() => removeMetric(metric.id)}
                >
                  {metric.render(renderContext)}
                </SortableAnalyticsWidget>
              ))}
            </div>
          </SortableContext>
          <DragOverlay dropAnimation={analyticsDropAnimation}>
            {activeMetric ? (
              <div
                className={cx(
                  getAnalyticsMetricShellClassName(activeMetric.size),
                  'pointer-events-none min-w-0 overflow-hidden rounded-[32px] shadow-[0_30px_80px_-44px_var(--shadow-color)] [&>article]:h-full [&>section]:h-full',
                )}
                style={{
                  height: activeDragRect?.height,
                  maxHeight: 'min(70vh, 520px)',
                  maxWidth: 'calc(100vw - 2rem)',
                  width: activeDragRect?.width,
                }}
              >
                {activeMetric.render(renderContext)}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      <MetricFinderModal
        activeMetricIds={metricIds}
        allMetricsActive={allMetricsActive}
        onAdd={addMetric}
        onAddAll={addAllMetrics}
        onClose={() => setFinderOpen(false)}
        onRemove={removeMetric}
        open={finderOpen}
      />
    </div>
  );
}
