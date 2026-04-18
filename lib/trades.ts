import type { TradeInsert, TradeRow, TradeUpdate } from '@/lib/supabase';

import { cx } from '@/lib/utils';

export const TRADE_COLUMNS = {
  accountId: 'account_id',
  createdAt: 'created_at',
  id: 'ID',
  date: 'Date',
  symbol: 'Symbol',
  bias: 'Bias',
  entryPrice: 'Entry Price',
  stoploss: 'Stoploss',
  takeProfit: 'Take Profit',
  riskPercent: 'Risk %',
  rr: 'RrisktoRewardRatio',
  pnl: 'PnL',
  notes: 'Notes',
  screenshotUrl: 'ScreenShotURL',
  openTime: 'open_time',
  closeTime: 'close_time',
  updatedAt: 'updated_at',
  userId: 'user_id',
} as const;

export const TRADE_SELECT = [
  'ID',
  'Date',
  'Symbol',
  'Bias',
  '"Entry Price"',
  'Stoploss',
  '"Take Profit"',
  '"Risk %"',
  'RrisktoRewardRatio',
  'PnL',
  'Notes',
  'ScreenShotURL',
  'open_time',
  'close_time',
  'account_id',
  'created_at',
  'updated_at',
  'user_id',
].join(',');

export type TradeView = {
  accountId: string | null;
  createdAt: string | null;
  id: string;
  date: string | null;
  openTime: string | null;
  closeTime: string | null;
  symbol: string;
  bias: string | null;
  entryPrice: number | null;
  stoploss: number | null;
  takeProfit: number | null;
  riskPercent: number | null;
  rr: number | null;
  pnl: number | null;
  notes: string | null;
  screenshotUrl: string | null;
  updatedAt: string | null;
  userId: string | null;
};

export type TradeSummary = {
  avgLoss: number | null;
  avgPnl: number | null;
  avgRr: number | null;
  avgWin: number | null;
  bestSymbol: string | null;
  bestTrade: number | null;
  breakeven: number;
  currentStreak: number;
  currentStreakDirection: 'flat' | 'loss' | 'win' | null;
  lastTrade: TradeView | null;
  longCount: number;
  losses: number;
  latestTradeWithScreenshot: TradeView | null;
  netPnl: number;
  profitFactor: number | null;
  recentSymbol: string | null;
  recentWindowNetPnl: number | null;
  riskAverage: number | null;
  screenshotCount: number;
  screenshotRate: number | null;
  shortCount: number;
  totalTrades: number;
  winRate: number | null;
  wins: number;
  worstTrade: number | null;
};

export const EMPTY_VALUE = '--';

function cleanText(value: unknown) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : null;
}

function toNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsedValue = Number(value);
    return Number.isFinite(parsedValue) ? parsedValue : null;
  }

  return null;
}

function normalizeTimeValue(value: unknown) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return null;
  }

  const matchedParts = trimmedValue.match(/^(\d{2}):(\d{2})(?::\d{2})?$/);

  if (!matchedParts) {
    return trimmedValue;
  }

  return `${matchedParts[1]}:${matchedParts[2]}`;
}

function getTradeOutcome(trade: TradeView) {
  if ((trade.pnl ?? 0) > 0) {
    return 'win' as const;
  }

  if ((trade.pnl ?? 0) < 0) {
    return 'loss' as const;
  }

  return 'flat' as const;
}

export function normalizeTrade(row: TradeRow, fallbackIndex = 0): TradeView {
  return {
    accountId: cleanText(row.account_id),
    createdAt: cleanText(row.created_at),
    id:
      typeof row.ID === 'string' || typeof row.ID === 'number'
        ? String(row.ID)
        : `trade-${fallbackIndex}`,
    date: typeof row.Date === 'string' ? row.Date : null,
    openTime: normalizeTimeValue(row.open_time),
    closeTime: normalizeTimeValue(row.close_time),
    symbol: cleanText(row.Symbol)?.toUpperCase() ?? '',
    bias: cleanText(row.Bias),
    entryPrice: toNumber(row['Entry Price']),
    stoploss: toNumber(row.Stoploss),
    takeProfit: toNumber(row['Take Profit']),
    riskPercent: toNumber(row['Risk %']),
    rr: toNumber(row.RrisktoRewardRatio),
    pnl: toNumber(row.PnL),
    notes: cleanText(row.Notes),
    screenshotUrl: cleanText(row.ScreenShotURL),
    updatedAt: cleanText(row.updated_at),
    userId: cleanText(row.user_id),
  };
}

export type TradeFormInput = {
  account_id: string;
  close_time: string;
  direction: string;
  entry_price: string;
  mistake: string;
  notes: string;
  open_time: string;
  pnl: string;
  position_size: string;
  rr: string;
  risk_amount: string;
  screenshot_url: string;
  session: string;
  stop_loss: string;
  strategy: string;
  symbol: string;
  take_profit: string;
  trade_date: string;
};

const TRADE_NOTE_PREFIX_MAP = {
  mistake: 'Mistake:',
  position_size: 'Position size:',
  session: 'Session:',
  strategy: 'Strategy:',
} as const satisfies Record<
  'mistake' | 'position_size' | 'session' | 'strategy',
  string
>;

function getTodayValue() {
  const now = new Date();
  const timezoneOffset = now.getTimezoneOffset() * 60_000;

  return new Date(now.getTime() - timezoneOffset).toISOString().slice(0, 10);
}

function toTrimmedNumberString(value: number | null) {
  if (value === null) {
    return '';
  }

  return String(value);
}

function buildTradeNotes(input: TradeFormInput) {
  return [
    input.notes.trim(),
    input.strategy.trim() ? `Strategy: ${input.strategy.trim()}` : null,
    input.session.trim() ? `Session: ${input.session.trim()}` : null,
    input.position_size.trim()
      ? `Position size: ${input.position_size.trim()}`
      : null,
    input.mistake.trim() ? `Mistake: ${input.mistake.trim()}` : null,
  ].filter(Boolean);
}

function mapTradeFormToPayload(
  input: TradeFormInput,
  userId: string,
  clearEmptyFields: boolean,
) {
  const payload: TradeInsert | TradeUpdate = {
    user_id: userId,
  };

  payload.account_id = input.account_id.trim() || null;
  payload.Date = input.trade_date || null;
  payload.Symbol = input.symbol.trim() ? input.symbol.trim().toUpperCase() : null;
  payload.Bias = input.direction || null;
  payload.ScreenShotURL = input.screenshot_url.trim() || null;
  payload.open_time = input.open_time.trim() || null;
  payload.close_time = input.close_time.trim() || null;

  const numericFields: Array<
    [
      'entry_price' | 'stop_loss' | 'take_profit' | 'risk_amount' | 'rr' | 'pnl',
      keyof TradeInsert,
    ]
  > = [
    ['entry_price', 'Entry Price'],
    ['stop_loss', 'Stoploss'],
    ['take_profit', 'Take Profit'],
    ['risk_amount', 'Risk %'],
    ['rr', 'RrisktoRewardRatio'],
    ['pnl', 'PnL'],
  ];

  for (const [inputKey, payloadKey] of numericFields) {
    const rawValue = input[inputKey];

    if (!rawValue.trim()) {
      if (clearEmptyFields) {
        payload[payloadKey] = null;
      }
      continue;
    }

    const parsedValue = Number(rawValue);

    if (Number.isFinite(parsedValue)) {
      payload[payloadKey] = parsedValue;
    } else if (clearEmptyFields) {
      payload[payloadKey] = null;
    }
  }

  const notesSegments = buildTradeNotes(input);

  if (notesSegments.length > 0) {
    payload.Notes = notesSegments.join('\n\n');
  } else if (clearEmptyFields) {
    payload.Notes = null;
  }

  return payload;
}

export function mapTradeFormToInsert(
  input: TradeFormInput,
  userId: string,
): TradeInsert {
  return mapTradeFormToPayload(input, userId, false) as TradeInsert;
}

export function mapTradeFormToUpdate(
  input: TradeFormInput,
  userId: string,
): TradeUpdate {
  return mapTradeFormToPayload(input, userId, true) as TradeUpdate;
}

export function createInitialTradeFormValues(accountId = ''): TradeFormInput {
  return {
    account_id: accountId,
    close_time: '',
    direction: '',
    entry_price: '',
    mistake: '',
    notes: '',
    open_time: '',
    pnl: '',
    position_size: '',
    risk_amount: '',
    rr: '',
    screenshot_url: '',
    session: '',
    stop_loss: '',
    strategy: '',
    symbol: '',
    take_profit: '',
    trade_date: getTodayValue(),
  };
}

export function parseTradeNotes(notes: string | null) {
  const parsedValues: Pick<
    TradeFormInput,
    'mistake' | 'notes' | 'position_size' | 'session' | 'strategy'
  > = {
    mistake: '',
    notes: '',
    position_size: '',
    session: '',
    strategy: '',
  };

  if (!notes) {
    return parsedValues;
  }

  const plainNoteSegments: string[] = [];

  for (const segment of notes
    .split(/\n\s*\n/)
    .map((value) => value.trim())
    .filter(Boolean)) {
    const matchingEntry = Object.entries(TRADE_NOTE_PREFIX_MAP).find(([, prefix]) =>
      segment.startsWith(prefix),
    );

    if (!matchingEntry) {
      plainNoteSegments.push(segment);
      continue;
    }

    const [fieldKey, prefix] = matchingEntry;
    parsedValues[fieldKey as keyof typeof parsedValues] = segment
      .slice(prefix.length)
      .trim();
  }

  parsedValues.notes = plainNoteSegments.join('\n\n');
  return parsedValues;
}

export function mapTradeToFormValues(
  trade: TradeView,
  fallbackAccountId = '',
): TradeFormInput {
  const parsedNotes = parseTradeNotes(trade.notes);

  return {
    account_id: trade.accountId ?? fallbackAccountId,
    close_time: trade.closeTime ?? '',
    direction: trade.bias ?? '',
    entry_price: toTrimmedNumberString(trade.entryPrice),
    mistake: parsedNotes.mistake,
    notes: parsedNotes.notes,
    open_time: trade.openTime ?? '',
    pnl: toTrimmedNumberString(trade.pnl),
    position_size: parsedNotes.position_size,
    risk_amount: toTrimmedNumberString(trade.riskPercent),
    rr: toTrimmedNumberString(trade.rr),
    screenshot_url: trade.screenshotUrl ?? '',
    session: parsedNotes.session,
    stop_loss: toTrimmedNumberString(trade.stoploss),
    strategy: parsedNotes.strategy,
    symbol: trade.symbol,
    take_profit: toTrimmedNumberString(trade.takeProfit),
    trade_date: trade.date ?? getTodayValue(),
  };
}

export function formatTradeDate(date: string | null) {
  if (!date) {
    return EMPTY_VALUE;
  }

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.valueOf())) {
    return date;
  }

  return parsedDate.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatTradeTime(value: string | null) {
  const normalizedValue = normalizeTimeValue(value);

  if (!normalizedValue) {
    return EMPTY_VALUE;
  }

  return normalizedValue;
}

export function getTradeTimeRangeLabel(trade: Pick<TradeView, 'openTime' | 'closeTime'>) {
  const openTime = formatTradeTime(trade.openTime);
  const closeTime = formatTradeTime(trade.closeTime);

  if (openTime === EMPTY_VALUE && closeTime === EMPTY_VALUE) {
    return null;
  }

  if (openTime !== EMPTY_VALUE && closeTime !== EMPTY_VALUE) {
    return `${openTime} -> ${closeTime}`;
  }

  return openTime !== EMPTY_VALUE ? `Open ${openTime}` : `Close ${closeTime}`;
}

export function formatCompactNumber(value: number | null, digits = 2) {
  if (value === null) {
    return EMPTY_VALUE;
  }

  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: digits,
  }).format(value);
}

export function getPnlTone(value: number | null) {
  if (value === null || value === 0) {
    return 'flat' as const;
  }

  return value > 0 ? ('profit' as const) : ('loss' as const);
}

export function formatCurrency(value: number | null, digits = 2) {
  if (value === null) {
    return EMPTY_VALUE;
  }

  return `$${formatCompactNumber(value, digits)}`;
}

export function formatPnl(value: number | null, digits = 2) {
  if (value === null) {
    return EMPTY_VALUE;
  }

  const absValue = formatCurrency(Math.abs(value), digits);

  if (value > 0) {
    return `+${absValue}`;
  }

  if (value < 0) {
    return `-${absValue}`;
  }

  return absValue;
}

export function formatCurrencyNumber(value: number | null, digits = 2) {
  return formatCurrency(value, digits);
}

export function formatSignedNumber(value: number | null, digits = 2) {
  return formatPnl(value, digits);
}

export function getPnlTextClassName(value: number | null) {
  const tone = getPnlTone(value);

  if (tone === 'profit') {
    return 'text-[color:var(--pnl-positive-text)] [text-shadow:var(--pnl-positive-glow)]';
  }

  if (tone === 'loss') {
    return 'text-[color:var(--pnl-negative-text)] [text-shadow:var(--pnl-negative-glow)]';
  }

  return 'text-[var(--foreground)]';
}

export function getPnlBadgeClassName(value: number | null) {
  const tone = getPnlTone(value);

  if (tone === 'profit') {
    return cx(
      'border-[color:var(--pnl-positive-border)] bg-[var(--pnl-positive-surface)]',
      'text-[color:var(--pnl-positive-text)] shadow-[0_22px_42px_-34px_var(--pnl-positive-shadow)]',
    );
  }

  if (tone === 'loss') {
    return cx(
      'border-[color:var(--pnl-negative-border)] bg-[var(--pnl-negative-surface)]',
      'text-[color:var(--pnl-negative-text)] shadow-[0_22px_42px_-34px_var(--pnl-negative-shadow)]',
    );
  }

  return 'border-[color:var(--border-color)] bg-[var(--surface-raised)] text-[var(--muted-strong)]';
}

export function getPnlCardClassName(value: number | null) {
  const tone = getPnlTone(value);

  if (tone === 'profit') {
    return 'border-[color:var(--pnl-positive-border)] shadow-[0_30px_60px_-42px_var(--pnl-positive-shadow)]';
  }

  if (tone === 'loss') {
    return 'border-[color:var(--pnl-negative-border)] shadow-[0_30px_60px_-42px_var(--pnl-negative-shadow)]';
  }

  return '';
}

export function formatPercentValue(value: number | null, digits = 1) {
  if (value === null) {
    return EMPTY_VALUE;
  }

  return `${formatCompactNumber(value, digits)}%`;
}

export function getTradeSearchText(trade: TradeView) {
  const parsedNotes = parseTradeNotes(trade.notes);
  const timeRange = getTradeTimeRangeLabel(trade);

  return [
    trade.symbol,
    trade.date ?? '',
    formatTradeDate(trade.date),
    trade.bias ?? '',
    trade.notes ?? '',
    parsedNotes.strategy,
    parsedNotes.session,
    parsedNotes.mistake,
    timeRange ?? '',
    trade.openTime ?? '',
    trade.closeTime ?? '',
  ]
    .join(' ')
    .toLowerCase();
}

function getMostFrequentSymbol(trades: TradeView[]) {
  const map = new Map<string, number>();

  for (const trade of trades) {
    const key = trade.symbol.trim();

    if (!key) {
      continue;
    }

    map.set(key, (map.get(key) ?? 0) + 1);
  }

  let bestSymbol: string | null = null;
  let bestCount = 0;

  for (const [symbol, count] of map.entries()) {
    if (count > bestCount) {
      bestSymbol = symbol;
      bestCount = count;
    }
  }

  return bestSymbol;
}

export function buildTradeSummary(trades: TradeView[]): TradeSummary {
  const positiveTrades = trades.filter((trade) => (trade.pnl ?? 0) > 0);
  const negativeTrades = trades.filter((trade) => (trade.pnl ?? 0) < 0);
  const wins = positiveTrades.length;
  const losses = negativeTrades.length;
  const breakeven = trades.length - wins - losses;
  const netPnl = trades.reduce((total, trade) => total + (trade.pnl ?? 0), 0);
  const totalWinsValue = positiveTrades.reduce(
    (total, trade) => total + (trade.pnl ?? 0),
    0,
  );
  const totalLossesValue = negativeTrades.reduce(
    (total, trade) => total + Math.abs(trade.pnl ?? 0),
    0,
  );
  const avgRr =
    trades.length > 0
      ? trades.reduce((total, trade) => total + (trade.rr ?? 0), 0) / trades.length
      : null;
  const avgPnl =
    trades.length > 0
      ? trades.reduce((total, trade) => total + (trade.pnl ?? 0), 0) / trades.length
      : null;
  const bestTrade =
    trades.length > 0
      ? Math.max(...trades.map((trade) => trade.pnl ?? Number.NEGATIVE_INFINITY))
      : null;
  const worstTrade =
    trades.length > 0
      ? Math.min(...trades.map((trade) => trade.pnl ?? Number.POSITIVE_INFINITY))
      : null;
  const longCount = trades.filter((trade) => trade.bias === 'Long').length;
  const shortCount = trades.filter((trade) => trade.bias === 'Short').length;
  const riskAverage =
    trades.length > 0
      ? trades.reduce((total, trade) => total + (trade.riskPercent ?? 0), 0) /
        trades.length
      : null;
  const avgWin = wins > 0 ? totalWinsValue / wins : null;
  const avgLoss =
    losses > 0
      ? negativeTrades.reduce((total, trade) => total + (trade.pnl ?? 0), 0) / losses
      : null;
  const profitFactor =
    totalWinsValue > 0 && totalLossesValue > 0
      ? totalWinsValue / totalLossesValue
      : null;
  const screenshotCount = trades.filter((trade) => Boolean(trade.screenshotUrl)).length;
  const latestTradeWithScreenshot =
    trades.find((trade) => Boolean(trade.screenshotUrl)) ?? null;
  const currentStreakDirection = trades[0] ? getTradeOutcome(trades[0]) : null;
  let currentStreak = 0;

  if (currentStreakDirection) {
    for (const trade of trades) {
      if (getTradeOutcome(trade) !== currentStreakDirection) {
        break;
      }

      currentStreak += 1;
    }
  }

  const recentWindowNetPnl =
    trades.length > 0
      ? trades.slice(0, Math.min(trades.length, 5)).reduce(
          (total, trade) => total + (trade.pnl ?? 0),
          0,
        )
      : null;

  return {
    avgLoss,
    avgPnl,
    avgRr,
    avgWin,
    bestSymbol: getMostFrequentSymbol(trades),
    bestTrade: bestTrade === Number.NEGATIVE_INFINITY ? null : bestTrade,
    breakeven,
    currentStreak,
    currentStreakDirection,
    lastTrade: trades[0] ?? null,
    longCount,
    losses,
    latestTradeWithScreenshot,
    netPnl,
    profitFactor,
    recentSymbol: trades[0]?.symbol || null,
    recentWindowNetPnl,
    riskAverage,
    screenshotCount,
    screenshotRate: trades.length > 0 ? (screenshotCount / trades.length) * 100 : null,
    shortCount,
    totalTrades: trades.length,
    winRate: trades.length > 0 ? (wins / trades.length) * 100 : null,
    wins,
    worstTrade: worstTrade === Number.POSITIVE_INFINITY ? null : worstTrade,
  };
}
