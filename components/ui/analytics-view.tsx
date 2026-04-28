'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

import { useAccounts } from '@/components/ui/accounts-provider';
import { AnalyticsLayoutWorkspace } from '@/components/ui/analytics-layout-workspace';
import AuthRequired from '@/components/ui/auth-required';
import { useAuth } from '@/components/ui/auth-provider';
import { Button, ButtonLink } from '@/components/ui/button';
import { MessageBanner } from '@/components/ui/form-fields';
import PageShell from '@/components/ui/page-shell';
import { Panel, PanelHeader } from '@/components/ui/panel';
import { Reveal } from '@/components/ui/reveal';
import { TradeViewModeControl } from '@/components/ui/trade-view-mode-control';
import TradeCalendarView from '@/components/ui/trade-calendar-view';
import TradeCard from '@/components/ui/trade-card';
import { useWidgetTradeViewMode } from '@/components/ui/use-widget-trade-view-mode';
import { useUserTrades } from '@/components/ui/use-user-trades';
import { scopeRecordsToAccount } from '@/lib/account-scope';
import { buildAccountMetrics } from '@/lib/accounts';
import {
  DEFAULT_LIST_VIEW_PREFERENCES,
  type ListViewMode,
} from '@/components/ui/list-view-preferences';
import {
  buildAnalyticsFilterOptions,
  buildAnalyticsSnapshot,
  describeAnalyticsRange,
  enrichTradesForAnalytics,
  filterAnalyticsTrades,
  getAnalyticsEmptyMessage,
  type AnalyticsTrade,
} from '@/lib/analytics';
import { cx } from '@/lib/utils';

type AnalyticsFilterKey =
  | 'account'
  | 'dateFrom'
  | 'dateTo'
  | 'direction'
  | 'session'
  | 'strategy'
  | 'symbol';

const analyticsFilterOrder: AnalyticsFilterKey[] = [
  'account',
  'dateFrom',
  'dateTo',
  'symbol',
  'session',
  'direction',
  'strategy',
];

const analyticsFilterLabels: Record<AnalyticsFilterKey, string> = {
  account: 'Account',
  dateFrom: 'Date from',
  dateTo: 'Date to',
  direction: 'Direction',
  session: 'Session',
  strategy: 'Strategy',
  symbol: 'Symbol',
};

function AddFilterIcon({ className }: { className?: string }) {
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

function FilterCloseIcon({ className }: { className?: string }) {
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

function InsightCard({
  detail,
  title,
}: {
  detail: string;
  title: string;
}) {
  return (
    <div className="rounded-[26px] border border-[color:var(--accent-border-soft)] bg-[linear-gradient(180deg,var(--surface-raised),var(--surface))] px-5 py-5 shadow-[0_22px_48px_-34px_var(--shadow-color)]">
      <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--accent-text)]">
        Insight
      </p>
      <h3 className="mt-3 text-lg font-semibold tracking-tight text-[var(--foreground)]">
        {title}
      </h3>
      <p className="mt-3 text-sm leading-7 text-[var(--muted)]">{detail}</p>
    </div>
  );
}

function buildAccountLabel(accountName: string | null) {
  return accountName ?? 'All accounts';
}

function resolvedAnalyticsWidgetKey(activeAccountId: string | null | undefined) {
  return activeAccountId
    ? `analytics:${activeAccountId}:matched-trades`
    : 'analytics:matched-trades';
}

function AddFilterMenu({
  availableFilterKeys,
  onAdd,
  onClose,
  open,
}: {
  availableFilterKeys: AnalyticsFilterKey[];
  onAdd: (filterKey: AnalyticsFilterKey) => void;
  onClose: () => void;
  open: boolean;
}) {
  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, open]);

  if (!open || typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[1000]">
      <button
        aria-label="Close filters menu"
        className="absolute inset-0 cursor-default bg-transparent"
        type="button"
        onClick={onClose}
      />
      <div
        className="absolute left-4 top-[calc(var(--topbar-offset,8rem)+1rem)] w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-[24px] border border-[color:var(--border-strong)] bg-[var(--surface-raised)] p-2 shadow-[0_26px_70px_-38px_var(--shadow-color)] sm:left-8"
        role="menu"
      >
        {availableFilterKeys.length > 0 ? (
          availableFilterKeys.map((filterKey) => (
            <button
              key={filterKey}
              className="flex w-full items-center justify-between gap-3 rounded-[18px] px-3 py-3 text-left text-sm font-medium text-[var(--foreground)] transition duration-150 hover:bg-[var(--surface)]"
              role="menuitem"
              type="button"
              onClick={() => onAdd(filterKey)}
            >
              {analyticsFilterLabels[filterKey]}
              <AddFilterIcon className="h-3.5 w-3.5 text-[var(--muted)]" />
            </button>
          ))
        ) : (
          <div className="px-3 py-3 text-sm text-[var(--muted)]">
            All filters are visible.
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

function AllMatchedTradesDrawer({
  onClose,
  open,
  tradeViewMode,
  trades,
}: {
  onClose: () => void;
  open: boolean;
  tradeViewMode: ListViewMode;
  trades: AnalyticsTrade[];
}) {
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
    <div className="fixed inset-0 z-[1000] flex items-end justify-center overflow-hidden px-3 py-4 sm:items-center sm:px-6">
      <button
        aria-label="Close all matched trades"
        className="absolute inset-0 bg-black/45 backdrop-blur-sm"
        type="button"
        onClick={onClose}
      />
      <div
        aria-modal="true"
        className="relative z-10 flex max-h-[calc(100vh-2rem)] w-full max-w-6xl flex-col overflow-hidden rounded-[32px] border border-[color:var(--border-strong)] bg-[linear-gradient(180deg,var(--surface-raised),var(--surface))] shadow-[0_34px_90px_-36px_rgba(0,0,0,0.48)]"
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[color:var(--border-color)] px-5 py-5 sm:px-6">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-[var(--accent-text)]">
              Filtered results
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--foreground)]">
              All matched trades
            </h2>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Showing {trades.length} matched trade{trades.length === 1 ? '' : 's'}.
            </p>
          </div>
          <button
            aria-label="Close"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[color:var(--border-color)] bg-[var(--surface)] text-[var(--muted-strong)] transition hover:border-[color:var(--border-strong)] hover:text-[var(--foreground)]"
            type="button"
            onClick={onClose}
          >
            <FilterCloseIcon className="h-4 w-4" />
          </button>
        </div>
        <div className="overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
          {trades.length > 0 && tradeViewMode === 'calendar' ? (
            <TradeCalendarView
              trades={trades}
              emptyMessage="No matched trades available for this calendar."
            />
          ) : null}
          {trades.length > 0 && tradeViewMode !== 'calendar' ? (
            <div className="grid items-start gap-4">
              {trades.map((trade, index) => (
                <TradeCard
                  key={`analytics-all-trade-${trade.id}`}
                  trade={trade}
                  index={index}
                  compact={tradeViewMode === 'compact'}
                  editHref={`/trades/${trade.id}/edit`}
                  featured={tradeViewMode === 'cards' && index === 0}
                  variant={tradeViewMode === 'stacked' ? 'stacked' : undefined}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-[26px] border border-dashed border-[color:var(--border-color)] bg-[var(--surface)] px-5 py-6 text-sm text-[var(--muted)]">
              No trades match the current filters.
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default function AnalyticsView() {
  const { loading: authLoading, supabase, user } = useAuth();
  const {
    activeAccount,
    accounts,
    error: accountsError,
    loading: accountsLoading,
  } = useAccounts();
  const tradesState = useUserTrades({
    enabled: Boolean(user),
    limit: null,
  });
  const [accountScope, setAccountScope] = useState<'active' | 'all' | string>('active');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [direction, setDirection] = useState('all');
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [session, setSession] = useState('all');
  const [strategy, setStrategy] = useState('all');
  const [symbol, setSymbol] = useState('all');
  const [matchedTradesDrawerOpen, setMatchedTradesDrawerOpen] = useState(false);
  const [matchedTradesVisibleCount, setMatchedTradesVisibleCount] = useState(3);
  const [visibleFilterKeys, setVisibleFilterKeys] = useState<AnalyticsFilterKey[]>([]);
  const [matchedTradesViewMode, setMatchedTradesViewMode] = useWidgetTradeViewMode(
    resolvedAnalyticsWidgetKey(activeAccount?.id),
    DEFAULT_LIST_VIEW_PREFERENCES.trades,
  );

  const analyticsTrades = useMemo(
    () => enrichTradesForAnalytics(tradesState.items),
    [tradesState.items],
  );
  const resolvedAccountId =
    accountScope === 'active'
      ? activeAccount?.id ?? null
      : accountScope === 'all'
        ? null
        : accountScope;
  const accountScopeResult = useMemo(
    () =>
      resolvedAccountId
        ? scopeRecordsToAccount(analyticsTrades, resolvedAccountId, {
            fallbackToAllWhenEmpty: false,
            includeUnassigned: true,
          })
        : {
            items: analyticsTrades,
            usedFallback: false,
          },
    [analyticsTrades, resolvedAccountId],
  );
  const accountScopedTrades = accountScopeResult.items;
  const effectiveAccountFilterId = accountScopeResult.usedFallback
    ? null
    : resolvedAccountId;
  const filterOptions = useMemo(
    () => buildAnalyticsFilterOptions(accountScopedTrades),
    [accountScopedTrades],
  );
  const resolvedDirection =
    direction === 'all' || filterOptions.directions.includes(direction)
      ? direction
      : 'all';
  const resolvedSession =
    session === 'all' || filterOptions.sessions.includes(session)
      ? session
      : 'all';
  const resolvedStrategy =
    strategy === 'all' || filterOptions.strategies.includes(strategy)
      ? strategy
      : 'all';
  const resolvedSymbol =
    symbol === 'all' || filterOptions.symbols.includes(symbol) ? symbol : 'all';
  const filters = useMemo(
    () => ({
      accountId: effectiveAccountFilterId,
      dateFrom,
      dateTo,
      direction: resolvedDirection,
      session: resolvedSession,
      strategy: resolvedStrategy,
      symbol: resolvedSymbol,
    }),
    [
      dateFrom,
      dateTo,
      effectiveAccountFilterId,
      resolvedDirection,
      resolvedSession,
      resolvedStrategy,
      resolvedSymbol,
    ],
  );

  const hasInvalidDateRange =
    Boolean(filters.dateFrom) &&
    Boolean(filters.dateTo) &&
    filters.dateFrom > filters.dateTo;
  const filteredTrades = useMemo(
    () => (hasInvalidDateRange ? [] : filterAnalyticsTrades(analyticsTrades, filters)),
    [analyticsTrades, filters, hasInvalidDateRange],
  );
  const analytics = useMemo(
    () => buildAnalyticsSnapshot(filteredTrades),
    [filteredTrades],
  );
  const visibleFilteredTrades = filteredTrades.slice(0, matchedTradesVisibleCount);
  const selectedAccount = accounts.find((account) => account.id === resolvedAccountId) ?? null;
  const pnlBaseline = useMemo(() => {
    if (selectedAccount) {
      return buildAccountMetrics(selectedAccount, accountScopedTrades).equityBaseline;
    }

    const accountBaseline = accounts.reduce(
      (total, account) => total + account.initialEquity,
      0,
    );

    return accountBaseline > 0 ? accountBaseline : null;
  }, [accountScopedTrades, accounts, selectedAccount]);
  const scopeLabel =
    accountScope === 'all'
      ? 'All accounts'
      : buildAccountLabel(selectedAccount?.name ?? activeAccount?.name ?? null);
  const scopeTypeLabel =
    accountScope === 'all'
      ? 'Cross-account aggregate'
      : selectedAccount?.type ?? activeAccount?.type ?? 'Account-aware analytics';
  const emptyMessage = getAnalyticsEmptyMessage(analytics.totalTrades);
  const limitedSample = analytics.totalTrades > 0 && analytics.totalTrades < 5;
  const activeFilterKeys = useMemo(() => {
    const keys: AnalyticsFilterKey[] = [];

    if (accountScope !== 'active') {
      keys.push('account');
    }

    if (dateFrom) {
      keys.push('dateFrom');
    }

    if (dateTo) {
      keys.push('dateTo');
    }

    if (resolvedSymbol !== 'all') {
      keys.push('symbol');
    }

    if (resolvedSession !== 'all') {
      keys.push('session');
    }

    if (resolvedDirection !== 'all') {
      keys.push('direction');
    }

    if (resolvedStrategy !== 'all') {
      keys.push('strategy');
    }

    return keys;
  }, [
    accountScope,
    dateFrom,
    dateTo,
    resolvedDirection,
    resolvedSession,
    resolvedStrategy,
    resolvedSymbol,
  ]);
  const renderedFilterKeys = useMemo(() => {
    const visibleKeys = new Set<AnalyticsFilterKey>([
      ...visibleFilterKeys,
      ...activeFilterKeys,
    ]);

    return analyticsFilterOrder.filter((filterKey) => visibleKeys.has(filterKey));
  }, [activeFilterKeys, visibleFilterKeys]);
  const hasActiveFilters = activeFilterKeys.length > 0;
  const accountSelectValue =
    accountScope === 'active' ||
    accountScope === 'all' ||
    accounts.some((account) => account.id === accountScope)
      ? accountScope
      : 'all';
  const availableFilterKeys = analyticsFilterOrder.filter(
    (filterKey) => !renderedFilterKeys.includes(filterKey),
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setMatchedTradesVisibleCount(3);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [filters]);

  function resetFilters() {
    setAccountScope('active');
    setDateFrom('');
    setDateTo('');
    setDirection('all');
    setFilterMenuOpen(false);
    setSession('all');
    setStrategy('all');
    setSymbol('all');
    setVisibleFilterKeys([]);
  }

  function addVisibleFilter(filterKey: AnalyticsFilterKey) {
    setVisibleFilterKeys((currentKeys) =>
      currentKeys.includes(filterKey) ? currentKeys : [...currentKeys, filterKey],
    );
    setFilterMenuOpen(false);
  }

  function resetFilter(filterKey: AnalyticsFilterKey) {
    switch (filterKey) {
      case 'account':
        setAccountScope('active');
        break;
      case 'dateFrom':
        setDateFrom('');
        break;
      case 'dateTo':
        setDateTo('');
        break;
      case 'direction':
        setDirection('all');
        break;
      case 'session':
        setSession('all');
        break;
      case 'strategy':
        setStrategy('all');
        break;
      case 'symbol':
        setSymbol('all');
        break;
    }

    setVisibleFilterKeys((currentKeys) =>
      currentKeys.filter((currentKey) => currentKey !== filterKey),
    );
  }

  function renderFilterControl(filterKey: AnalyticsFilterKey) {
    const closeButton = (
      <button
        aria-label={`Remove ${analyticsFilterLabels[filterKey]} filter`}
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--muted)] transition duration-150 hover:bg-[var(--surface-raised)] hover:text-[var(--foreground)]"
        type="button"
        onClick={() => resetFilter(filterKey)}
      >
        <FilterCloseIcon className="h-3.5 w-3.5" />
      </button>
    );
    const chipClassName =
      'flex min-h-11 max-w-full items-center gap-2 rounded-full border border-[color:var(--border-color)] bg-[var(--surface)] px-3 py-1.5 shadow-[0_14px_32px_-30px_var(--shadow-color)]';
    const labelClassName =
      'shrink-0 font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]';
    const controlClassName =
      'min-w-0 bg-transparent text-sm font-medium text-[var(--foreground)] outline-none placeholder:text-[var(--muted)] focus:text-[var(--foreground)]';

    switch (filterKey) {
      case 'account':
        return (
          <div key={filterKey} className={cx(chipClassName, 'w-full sm:w-auto')}>
            <span className={labelClassName}>Account</span>
            <select
              className={cx(controlClassName, 'max-w-full flex-1 sm:w-[170px]')}
              value={accountSelectValue}
              onChange={(event) => setAccountScope(event.target.value || 'active')}
            >
              <option value="active">Active account</option>
              <option value="all">All accounts</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
            {closeButton}
          </div>
        );
      case 'dateFrom':
        return (
          <div key={filterKey} className={cx(chipClassName, 'w-full sm:w-auto')}>
            <span className={labelClassName}>From</span>
            <input
              className={cx(controlClassName, 'min-w-[135px] flex-1 sm:w-[140px]')}
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
            />
            {closeButton}
          </div>
        );
      case 'dateTo':
        return (
          <div key={filterKey} className={cx(chipClassName, 'w-full sm:w-auto')}>
            <span className={labelClassName}>To</span>
            <input
              className={cx(controlClassName, 'min-w-[135px] flex-1 sm:w-[140px]')}
              type="date"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
            />
            {closeButton}
          </div>
        );
      case 'symbol':
        return (
          <div key={filterKey} className={cx(chipClassName, 'w-full sm:w-auto')}>
            <span className={labelClassName}>Symbol</span>
            <select
              className={cx(controlClassName, 'max-w-full flex-1 sm:w-[140px]')}
              value={resolvedSymbol}
              onChange={(event) => setSymbol(event.target.value)}
            >
              <option value="all">All symbols</option>
              {filterOptions.symbols.map((currentSymbol) => (
                <option key={currentSymbol} value={currentSymbol}>
                  {currentSymbol}
                </option>
              ))}
            </select>
            {closeButton}
          </div>
        );
      case 'session':
        return (
          <div key={filterKey} className={cx(chipClassName, 'w-full sm:w-auto')}>
            <span className={labelClassName}>Session</span>
            <select
              className={cx(controlClassName, 'max-w-full flex-1 sm:w-[150px]')}
              value={resolvedSession}
              onChange={(event) => setSession(event.target.value)}
            >
              <option value="all">All sessions</option>
              {filterOptions.sessions.map((currentSession) => (
                <option key={currentSession} value={currentSession}>
                  {currentSession}
                </option>
              ))}
            </select>
            {closeButton}
          </div>
        );
      case 'direction':
        return (
          <div key={filterKey} className={cx(chipClassName, 'w-full sm:w-auto')}>
            <span className={labelClassName}>Direction</span>
            <select
              className={cx(controlClassName, 'max-w-full flex-1 sm:w-[145px]')}
              value={resolvedDirection}
              onChange={(event) => setDirection(event.target.value)}
            >
              <option value="all">All directions</option>
              {filterOptions.directions.map((currentDirection) => (
                <option key={currentDirection} value={currentDirection}>
                  {currentDirection}
                </option>
              ))}
            </select>
            {closeButton}
          </div>
        );
      case 'strategy':
        return (
          <div key={filterKey} className={cx(chipClassName, 'w-full sm:w-auto')}>
            <span className={labelClassName}>Strategy</span>
            <select
              className={cx(controlClassName, 'max-w-full flex-1 sm:w-[155px]')}
              value={resolvedStrategy}
              onChange={(event) => setStrategy(event.target.value)}
            >
              <option value="all">All strategies</option>
              {filterOptions.strategies.map((currentStrategy) => (
                <option key={currentStrategy} value={currentStrategy}>
                  {currentStrategy}
                </option>
              ))}
            </select>
            {closeButton}
          </div>
        );
    }
  }

  if (authLoading || !supabase || accountsLoading) {
    return (
      <PageShell>
        <Panel className="p-6 sm:p-8">
          <p className="text-sm text-[var(--muted)]">Loading analytics workspace...</p>
        </Panel>
      </PageShell>
    );
  }

  if (!user) {
    return (
      <PageShell>
        <AuthRequired
          title="Analytics locked"
          description="Sign in to open the advanced analytics workspace."
        />
      </PageShell>
    );
  }

  if (!activeAccount && accounts.length === 0) {
    return (
      <PageShell size="wide">
        <Reveal>
          <Panel className="px-6 py-7 sm:px-8 sm:py-8">
            <PanelHeader
              eyebrow="analytics"
              title="Create an account before opening advanced analytics"
              description="Analytics follow the active account workspace. Create the first account and the data view will light up automatically."
              action={
                <div className="flex flex-col gap-3 sm:flex-row">
                  <ButtonLink href="/accounts/new" size="lg" variant="primary">
                    New Account
                  </ButtonLink>
                  <ButtonLink href="/accounts" size="lg" variant="secondary">
                    Open Accounts
                  </ButtonLink>
                </div>
              }
            />
          </Panel>
        </Reveal>
      </PageShell>
    );
  }

  return (
    <PageShell size="wide">
      <div className="space-y-6">
        <Reveal>
          <Panel className="overflow-hidden">
            <PanelHeader
              eyebrow="analytics"
              title="Advanced analytics"
              description="Premium execution intelligence for the current journal scope."
              action={
                <div className="flex flex-col gap-3 sm:flex-row">
                  <ButtonLink href="/trades/new" size="lg" variant="primary">
                    Add Trade
                  </ButtonLink>
                  <ButtonLink href="/dashboard" size="lg" variant="secondary">
                    Dashboard
                  </ButtonLink>
                </div>
              }
            />
            <div className="grid gap-4 px-6 pb-6 sm:grid-cols-2 xl:grid-cols-4 sm:px-8 sm:pb-8">
              <div className="rounded-[26px] border border-[color:var(--border-color)] bg-[linear-gradient(180deg,var(--surface-raised),var(--surface))] px-5 py-5 shadow-[0_24px_48px_-34px_var(--shadow-color)]">
                <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">
                  Scope
                </p>
                <p className="mt-3 text-xl font-semibold tracking-tight text-[var(--foreground)]">
                  {scopeLabel}
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  {scopeTypeLabel}
                </p>
              </div>
              <div className="rounded-[26px] border border-[color:var(--border-color)] bg-[linear-gradient(180deg,var(--surface-raised),var(--surface))] px-5 py-5 shadow-[0_24px_48px_-34px_var(--shadow-color)]">
                <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">
                  Range
                </p>
                <p className="mt-3 text-xl font-semibold tracking-tight text-[var(--foreground)]">
                  {describeAnalyticsRange(filters)}
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  Filters update metrics, charts and insights live.
                </p>
              </div>
              <div className="rounded-[26px] border border-[color:var(--border-color)] bg-[linear-gradient(180deg,var(--surface-raised),var(--surface))] px-5 py-5 shadow-[0_24px_48px_-34px_var(--shadow-color)]">
                <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">
                  Matched trades
                </p>
                <p className="mt-3 text-xl font-semibold tracking-tight text-[var(--foreground)]">
                  {analytics.totalTrades}
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  {tradesState.items.length} trades in the current journal view.
                </p>
              </div>
              <div className="rounded-[26px] border border-[color:var(--border-color)] bg-[linear-gradient(180deg,var(--surface-raised),var(--surface))] px-5 py-5 shadow-[0_24px_48px_-34px_var(--shadow-color)]">
                <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">
                  Data quality
                </p>
                <p className="mt-3 text-xl font-semibold tracking-tight text-[var(--foreground)]">
                  {analytics.holdingTradesCount} timed trades
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  {limitedSample
                    ? 'Limited sample. Insights stay conservative until the journal grows.'
                    : 'Open and close times are included when present for duration analytics.'}
                </p>
              </div>
            </div>
          </Panel>
        </Reveal>

        {accountsError ? <MessageBanner message={accountsError} tone="error" /> : null}
        {tradesState.error ? (
          <MessageBanner
            message={`Trades query error: ${tradesState.error}`}
            tone="error"
          />
        ) : null}
        {hasInvalidDateRange ? (
          <MessageBanner
            message="Date range invalid: the start date must be earlier than the end date."
            tone="error"
          />
        ) : null}
        {limitedSample ? (
          <MessageBanner
            message="Not enough data yet for stable insights. Metrics still render, but keep the sample size in mind."
            tone="neutral"
          />
        ) : null}

        <Reveal delay={0.04}>
          <Panel className="overflow-visible">
            <div className="px-6 py-5 sm:px-8">
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Button
                    aria-expanded={filterMenuOpen}
                    aria-haspopup="menu"
                    size="md"
                    type="button"
                    variant="secondary"
                    onClick={() => setFilterMenuOpen((currentValue) => !currentValue)}
                  >
                    <AddFilterIcon className="h-4 w-4" />
                    Add filter
                  </Button>
                </div>

                {renderedFilterKeys.map((filterKey) => renderFilterControl(filterKey))}

                {hasActiveFilters ? (
                  <Button size="md" type="button" variant="ghost" onClick={resetFilters}>
                    Reset
                  </Button>
                ) : null}

                <span className="rounded-full border border-[color:var(--border-color)] bg-[var(--surface)] px-3 py-2 text-xs text-[var(--muted-strong)]">
                  {analytics.totalTrades} matched
                </span>
              </div>
            </div>
          </Panel>
        </Reveal>

        <AddFilterMenu
          availableFilterKeys={availableFilterKeys}
          onAdd={addVisibleFilter}
          onClose={() => setFilterMenuOpen(false)}
          open={filterMenuOpen}
        />

        <Reveal delay={0.05}>
          <Panel className="overflow-hidden">
            <PanelHeader
              eyebrow="trades"
              title="Matched trades"
              description={`Showing ${Math.min(visibleFilteredTrades.length, filteredTrades.length)} of ${filteredTrades.length} matched trade${filteredTrades.length === 1 ? '' : 's'}.`}
              action={
                <div className="flex flex-col gap-2 sm:flex-row">
                  <TradeViewModeControl
                    mode={matchedTradesViewMode}
                    onChange={setMatchedTradesViewMode}
                  />
                  <Button
                    disabled={filteredTrades.length === 0}
                    size="lg"
                    type="button"
                    variant="secondary"
                    onClick={() => setMatchedTradesDrawerOpen(true)}
                  >
                    See all trades
                  </Button>
                  <ButtonLink href="/trades/new" size="lg" variant="secondary">
                    Add Trade
                  </ButtonLink>
                </div>
              }
            />
            <div className="px-6 pb-6 pt-2 sm:px-8 sm:pb-8">
              {tradesState.loading ? (
                <div className="rounded-[24px] border border-[color:var(--border-color)] bg-[var(--surface)] px-4 py-5 text-sm text-[var(--muted)]">
                  Loading trades...
                </div>
              ) : null}

              {!tradesState.loading && !tradesState.error && visibleFilteredTrades.length === 0 ? (
                <div className="rounded-[26px] border border-dashed border-[color:var(--border-color)] bg-[var(--surface)] px-5 py-6 text-sm leading-7 text-[var(--muted)]">
                  No trades match the current analytics filters.
                </div>
              ) : null}

              {!tradesState.loading && !tradesState.error && visibleFilteredTrades.length > 0 ? (
                <>
                  {matchedTradesViewMode === 'calendar' ? (
                    <TradeCalendarView
                      trades={filteredTrades}
                      emptyMessage="No matched trades available for this calendar."
                    />
                  ) : (
                    <div className="grid items-start gap-4">
                      {visibleFilteredTrades.map((trade, index) => (
                        <TradeCard
                          key={`analytics-trade-${trade.id}`}
                          trade={trade}
                          index={index}
                          compact={matchedTradesViewMode === 'compact'}
                          editHref={`/trades/${trade.id}/edit`}
                          featured={matchedTradesViewMode === 'cards' && index === 0}
                          variant={matchedTradesViewMode === 'stacked' ? 'stacked' : undefined}
                        />
                      ))}
                    </div>
                  )}
                  {visibleFilteredTrades.length < filteredTrades.length ? (
                    <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() =>
                          setMatchedTradesVisibleCount((current) =>
                            Math.min(current + 8, filteredTrades.length),
                          )
                        }
                      >
                        See more trades
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setMatchedTradesDrawerOpen(true)}
                      >
                        See all trades
                      </Button>
                    </div>
                  ) : null}
                </>
              ) : null}
            </div>
          </Panel>
        </Reveal>

        <AllMatchedTradesDrawer
          onClose={() => setMatchedTradesDrawerOpen(false)}
          open={matchedTradesDrawerOpen}
          tradeViewMode={matchedTradesViewMode}
          trades={filteredTrades}
        />

        {analytics.totalTrades === 0 ? (
          <Reveal delay={0.06}>
            <Panel className="overflow-hidden">
              <PanelHeader
                eyebrow="empty"
                title="No analytics in this scope yet"
                description={emptyMessage ?? 'No trades available for the current filter combination.'}
                action={
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <ButtonLink href="/trades/new" size="lg" variant="primary">
                      Add Trade
                    </ButtonLink>
                    <Button type="button" size="lg" variant="secondary" onClick={resetFilters}>
                      Reset filters
                    </Button>
                  </div>
                }
              />
            </Panel>
          </Reveal>
        ) : null}

        <Reveal delay={0.08}>
          <AnalyticsLayoutWorkspace
            analytics={analytics}
            filters={filters}
            pnlBaseline={pnlBaseline}
            scopeLabel={scopeLabel}
            totalTradesAvailable={tradesState.items.length}
            userId={user.id}
          />
        </Reveal>

        <Reveal delay={0.24}>
          <Panel className="overflow-hidden">
            <PanelHeader
              eyebrow="insights"
              title="Insights"
              description="Simple interpretations generated only from the current filtered data."
            />
            <div className="px-6 pb-6 sm:px-8 sm:pb-8">
              {analytics.insights.length > 0 ? (
                <div className="grid gap-4 xl:grid-cols-2">
                  {analytics.insights.map((insight) => (
                    <InsightCard
                      key={insight.title}
                      detail={insight.detail}
                      title={insight.title}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-[26px] border border-dashed border-[color:var(--border-color)] bg-[var(--surface)] px-5 py-6 text-sm leading-7 text-[var(--muted)]">
                  Not enough data yet. Add more trades or widen the filters to unlock stable insights.
                </div>
              )}
            </div>
          </Panel>
        </Reveal>

      </div>
    </PageShell>
  );
}
