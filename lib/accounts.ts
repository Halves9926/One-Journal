import type { AccountInsert, AccountRow, AccountUpdate } from '@/lib/supabase';
import { scopeRecordsToAccount, type AccountScopeOptions } from '@/lib/account-scope';
import {
  buildTradeSummary,
  type TradeSummary,
  type TradeView,
} from '@/lib/trades';

export const ACCOUNT_TYPES = [
  'Demo Account',
  'Propfirm Account',
  'Live Account',
  'Backtest Account',
] as const;

export const ACCOUNTS_TABLE = 'accounts';

export type AccountType = (typeof ACCOUNT_TYPES)[number];
export type AccountPhaseStatus = 'active' | 'funded' | 'passed';

export const ACCOUNT_SELECT = [
  'id',
  'user_id',
  'name',
  'type',
  'initial_equity',
  'current_equity',
  'is_active',
  'phases_enabled',
  'phase_count',
  'current_phase',
  'passed_phase_count',
  'phase_status',
  'phase_start_equity',
  'phase_started_at',
  'is_funded',
  'max_drawdown',
  'daily_drawdown_max',
  'prop_target',
  'created_at',
  'updated_at',
].join(',');

export type AccountView = {
  createdAt: string | null;
  currentEquity: number;
  currentPhase: number;
  dailyDrawdownMax: number | null;
  id: string;
  initialEquity: number;
  isActive: boolean;
  isFunded: boolean;
  maxDrawdown: number | null;
  name: string;
  passedPhaseCount: number;
  phaseCount: number;
  phasesEnabled: boolean;
  phaseStartEquity: number;
  phaseStartedAt: string | null;
  phaseStatus: AccountPhaseStatus;
  propTarget: number | null;
  type: AccountType;
  updatedAt: string | null;
  userId: string | null;
};

export type AccountMetrics = {
  currentDrawdown: number;
  currentPhaseEquity: number;
  currentPhaseNetPnl: number;
  equityBaseline: number;
  maxObservedDrawdown: number;
  overallCurrentEquity: number;
  peakEquity: number;
  phaseEquityBaseline: number;
  phaseTargetEquity: number | null;
  phaseTargetProgress: number | null;
  phaseTargetReached: boolean;
  phaseTargetRemaining: number | null;
  phaseTrades: TradeView[];
  summary: TradeSummary;
};

export type AccountFormInput = {
  current_equity: string;
  current_phase: string;
  daily_drawdown_max: string;
  initial_equity: string;
  is_funded: boolean;
  max_drawdown: string;
  name: string;
  phase_count: string;
  phases_enabled: boolean;
  prop_target: string;
  type: AccountType;
};

function toNumberString(value: number | null) {
  return value === null ? '' : String(value);
}

function buildAccountConfig(input: AccountFormInput) {
  const initialEquity = toFiniteNumber(input.initial_equity) ?? 0;
  const currentEquity = toFiniteNumber(input.current_equity) ?? initialEquity;
  const isProp = input.type === 'Propfirm Account';
  const isFunded = isProp ? input.is_funded : false;
  const phasesEnabled = isProp && !isFunded ? input.phases_enabled : false;
  const phaseCount =
    isProp && phasesEnabled
      ? clampInteger(toFiniteNumber(input.phase_count), 2)
      : 1;
  const currentPhase =
    isProp && phasesEnabled
      ? Math.min(clampInteger(toFiniteNumber(input.current_phase), 1), phaseCount)
      : 1;

  return {
    currentEquity,
    currentPhase,
    initialEquity,
    isFunded,
    isProp,
    phaseCount,
    phasesEnabled,
  };
}

function toFiniteNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsedValue = Number(value);
    return Number.isFinite(parsedValue) ? parsedValue : null;
  }

  return null;
}

function toBoolean(value: unknown, fallback = false) {
  return typeof value === 'boolean' ? value : fallback;
}

function cleanText(value: unknown) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : null;
}

function clampInteger(value: number | null, fallback: number, minimum = 1) {
  if (value === null) {
    return fallback;
  }

  return Math.max(Math.round(value), minimum);
}

function parseAccountType(value: unknown): AccountType {
  return ACCOUNT_TYPES.includes(value as AccountType)
    ? (value as AccountType)
    : 'Demo Account';
}

export function isPropAccount(account: AccountView | null | undefined) {
  return account?.type === 'Propfirm Account';
}

export function normalizeAccount(row: AccountRow, fallbackIndex = 0): AccountView {
  const initialEquity = toFiniteNumber(row.initial_equity) ?? 0;
  const currentEquity = toFiniteNumber(row.current_equity) ?? initialEquity;
  const phaseStartEquity = toFiniteNumber(row.phase_start_equity) ?? currentEquity;
  const phaseStatusRaw = cleanText(row.phase_status);
  const phaseStatus: AccountPhaseStatus =
    phaseStatusRaw === 'passed' || phaseStatusRaw === 'funded'
      ? phaseStatusRaw
      : 'active';

  return {
    createdAt: cleanText(row.created_at),
    currentEquity,
    currentPhase: clampInteger(toFiniteNumber(row.current_phase), 1),
    dailyDrawdownMax: toFiniteNumber(row.daily_drawdown_max),
    id: cleanText(row.id) ?? `account-${fallbackIndex}`,
    initialEquity,
    isActive: toBoolean(row.is_active),
    isFunded: toBoolean(row.is_funded),
    maxDrawdown: toFiniteNumber(row.max_drawdown),
    name: cleanText(row.name) ?? 'Untitled Account',
    passedPhaseCount: Math.max(clampInteger(toFiniteNumber(row.passed_phase_count), 0, 0), 0),
    phaseCount: clampInteger(toFiniteNumber(row.phase_count), 1),
    phasesEnabled: toBoolean(row.phases_enabled),
    phaseStartEquity,
    phaseStartedAt: cleanText(row.phase_started_at),
    phaseStatus: toBoolean(row.is_funded) ? 'funded' : phaseStatus,
    propTarget: toFiniteNumber(row.prop_target),
    type: parseAccountType(row.type),
    updatedAt: cleanText(row.updated_at),
    userId: cleanText(row.user_id),
  };
}

export function createInitialAccountFormValues(): AccountFormInput {
  return {
    current_equity: '',
    current_phase: '1',
    daily_drawdown_max: '',
    initial_equity: '',
    is_funded: false,
    max_drawdown: '',
    name: '',
    phase_count: '2',
    phases_enabled: true,
    prop_target: '',
    type: 'Demo Account',
  };
}

export function mapAccountToFormValues(account: AccountView): AccountFormInput {
  return {
    current_equity: toNumberString(account.currentEquity),
    current_phase: toNumberString(account.currentPhase),
    daily_drawdown_max: toNumberString(account.dailyDrawdownMax),
    initial_equity: toNumberString(account.initialEquity),
    is_funded: account.isFunded,
    max_drawdown: toNumberString(account.maxDrawdown),
    name: account.name,
    phase_count: toNumberString(account.phaseCount),
    phases_enabled: account.type === 'Propfirm Account' ? account.phasesEnabled : false,
    prop_target: toNumberString(account.propTarget),
    type: account.type,
  };
}

export function mapAccountFormToInsert(
  input: AccountFormInput,
  userId: string,
): AccountInsert {
  const {
    currentEquity,
    currentPhase,
    initialEquity,
    isFunded,
    isProp,
    phaseCount,
    phasesEnabled,
  } = buildAccountConfig(input);

  return {
    current_equity: currentEquity,
    current_phase: currentPhase,
    daily_drawdown_max:
      isProp
        ? toFiniteNumber(input.daily_drawdown_max)
        : null,
    initial_equity: initialEquity,
    is_active: false,
    is_funded: isFunded,
    max_drawdown:
      isProp ? toFiniteNumber(input.max_drawdown) : null,
    name: input.name.trim(),
    passed_phase_count: isProp && isFunded ? Math.max(phaseCount, 1) : currentPhase - 1,
    phase_count: phaseCount,
    phase_start_equity: currentEquity,
    phase_started_at: new Date().toISOString(),
    phase_status: isProp && isFunded ? 'funded' : 'active',
    phases_enabled: phasesEnabled,
    prop_target:
      isProp && phasesEnabled ? toFiniteNumber(input.prop_target) : null,
    type: input.type,
    user_id: userId,
  };
}

export function mapAccountFormToUpdate(
  input: AccountFormInput,
  account: AccountView,
): AccountUpdate {
  const {
    currentEquity,
    currentPhase,
    initialEquity,
    isFunded,
    isProp,
    phaseCount,
    phasesEnabled,
  } = buildAccountConfig(input);
  const currentEquityChanged = account.currentEquity !== currentEquity;
  const shouldResetPhaseTracking =
    !isProp ||
    isFunded ||
    !phasesEnabled ||
    !account.phasesEnabled ||
    currentEquityChanged ||
    account.currentPhase !== currentPhase ||
    account.phaseCount !== phaseCount;
  const passedPhaseCount = !isProp
    ? 0
    : isFunded
      ? Math.max(account.passedPhaseCount, phaseCount)
      : phasesEnabled
        ? Math.min(account.passedPhaseCount, Math.max(currentPhase - 1, 0))
        : 0;
  const nextPhaseStatus: AccountPhaseStatus = !isProp
    ? 'active'
    : isFunded
      ? 'funded'
      : phasesEnabled
        ? shouldResetPhaseTracking
          ? 'active'
          : account.phaseStatus === 'funded'
            ? 'active'
            : account.phaseStatus
        : 'active';
  const preservedPhaseStartedAt = account.phaseStartedAt ?? new Date().toISOString();

  return {
    current_equity: currentEquity,
    current_phase: currentPhase,
    daily_drawdown_max:
      isProp ? toFiniteNumber(input.daily_drawdown_max) : null,
    initial_equity: initialEquity,
    is_funded: isFunded,
    max_drawdown: isProp ? toFiniteNumber(input.max_drawdown) : null,
    name: input.name.trim(),
    passed_phase_count: passedPhaseCount,
    phase_count: phaseCount,
    phase_start_equity:
      isProp && phasesEnabled && !isFunded && !shouldResetPhaseTracking
        ? account.phaseStartEquity
        : currentEquity,
    phase_started_at:
      isProp && phasesEnabled && !isFunded && !shouldResetPhaseTracking
        ? preservedPhaseStartedAt
        : new Date().toISOString(),
    phase_status: nextPhaseStatus,
    phases_enabled: phasesEnabled,
    prop_target:
      isProp && phasesEnabled ? toFiniteNumber(input.prop_target) : null,
    type: input.type,
  };
}

export function getTradesForAccount(
  trades: TradeView[],
  accountId: string,
  options?: AccountScopeOptions,
) {
  return scopeRecordsToAccount(trades, accountId, options).items;
}

export function getPhaseTrades(account: AccountView, trades: TradeView[]) {
  if (!isPropAccount(account) || !account.phasesEnabled || !account.phaseStartedAt) {
    return trades;
  }

  const phaseStart = new Date(account.phaseStartedAt).valueOf();

  if (Number.isNaN(phaseStart)) {
    return trades;
  }

  return trades.filter((trade) => {
    if (!trade.createdAt) {
      return true;
    }

    const createdAtValue = new Date(trade.createdAt).valueOf();
    return Number.isNaN(createdAtValue) ? true : createdAtValue >= phaseStart;
  });
}

function getPropTargetEquity(account: AccountView, phaseEquityBaseline: number) {
  if (!isPropAccount(account) || !account.phasesEnabled || account.propTarget === null) {
    return null;
  }

  return account.propTarget > account.initialEquity
    ? account.propTarget
    : phaseEquityBaseline + account.propTarget;
}

export function buildAccountMetrics(
  account: AccountView,
  trades: TradeView[],
): AccountMetrics {
  const summary = buildTradeSummary(trades);
  const phaseTrades = getPhaseTrades(account, trades);
  const currentPhaseNetPnl = phaseTrades.reduce(
    (total, trade) => total + (trade.pnl ?? 0),
    0,
  );
  const sortedTrades = [...trades].sort((leftTrade, rightTrade) => {
    const leftTime = leftTrade.date
      ? new Date(leftTrade.date).valueOf()
      : leftTrade.createdAt
        ? new Date(leftTrade.createdAt).valueOf()
        : 0;
    const rightTime = rightTrade.date
      ? new Date(rightTrade.date).valueOf()
      : rightTrade.createdAt
        ? new Date(rightTrade.createdAt).valueOf()
        : 0;

    return leftTime - rightTime;
  });
  const equityBaseline = account.currentEquity - summary.netPnl;
  let runningEquity = equityBaseline;
  let peakEquity = Math.max(account.initialEquity, equityBaseline);
  let maxObservedDrawdown = Math.max(peakEquity - runningEquity, 0);

  for (const trade of sortedTrades) {
    runningEquity += trade.pnl ?? 0;
    peakEquity = Math.max(peakEquity, runningEquity);
    maxObservedDrawdown = Math.max(maxObservedDrawdown, peakEquity - runningEquity);
  }

  const overallCurrentEquity = account.currentEquity;
  const currentDrawdown = Math.max(peakEquity - overallCurrentEquity, 0);
  const phaseEquityBaseline =
    isPropAccount(account) && account.phasesEnabled && !account.isFunded
      ? account.phaseStartEquity
      : equityBaseline;
  const currentPhaseEquity =
    isPropAccount(account) && account.phasesEnabled && !account.isFunded
      ? phaseEquityBaseline + currentPhaseNetPnl
      : overallCurrentEquity;
  const phaseTargetEquity = getPropTargetEquity(account, phaseEquityBaseline);
  const phaseTargetReached =
    phaseTargetEquity !== null && currentPhaseEquity >= phaseTargetEquity;
  const phaseTargetRemaining =
    phaseTargetEquity !== null
      ? Math.max(phaseTargetEquity - currentPhaseEquity, 0)
      : null;
  const phaseTargetDistance =
    phaseTargetEquity !== null ? phaseTargetEquity - phaseEquityBaseline : null;
  const phaseTargetProgress =
    phaseTargetDistance !== null && phaseTargetDistance > 0
      ? Math.max(
          0,
          Math.min(
            ((currentPhaseEquity - phaseEquityBaseline) / phaseTargetDistance) *
              100,
            100,
          ),
        )
      : phaseTargetReached
        ? 100
        : null;

  return {
    currentDrawdown,
    currentPhaseEquity,
    currentPhaseNetPnl,
    equityBaseline,
    maxObservedDrawdown,
    overallCurrentEquity,
    peakEquity,
    phaseEquityBaseline,
    phaseTargetEquity,
    phaseTargetProgress,
    phaseTargetReached,
    phaseTargetRemaining,
    phaseTrades,
    summary,
  };
}

export function buildPropPhasePassUpdate(account: AccountView): AccountUpdate {
  const nextPassedCount = Math.max(account.passedPhaseCount, account.currentPhase);

  return {
    passed_phase_count: nextPassedCount,
    phase_status: 'passed',
  };
}

export function buildPropAdvancePhaseUpdate(account: AccountView): AccountUpdate {
  const nextPhase = Math.min(account.currentPhase + 1, account.phaseCount);

  return {
    current_phase: nextPhase,
    phase_start_equity: account.currentEquity,
    phase_started_at: new Date().toISOString(),
    phase_status: 'active',
  };
}

export function buildPropFundedUpdate(account: AccountView): AccountUpdate {
  return {
    is_funded: true,
    passed_phase_count: Math.max(account.passedPhaseCount, account.phaseCount),
    phase_status: 'funded',
  };
}
