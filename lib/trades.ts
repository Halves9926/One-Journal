import type { TradeInsert, TradeRow } from '@/lib/supabase';

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
  direction: string;
  entry_price: string;
  mistake: string;
  notes: string;
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

export function mapTradeFormToInsert(
  input: TradeFormInput,
  userId: string,
): TradeInsert {
  const payload: TradeInsert = {
    user_id: userId,
  };

  if (input.account_id.trim()) {
    payload.account_id = input.account_id.trim();
  }

  if (input.trade_date) {
    payload.Date = input.trade_date;
  }

  if (input.symbol.trim()) {
    payload.Symbol = input.symbol.trim().toUpperCase();
  }

  if (input.direction) {
    payload.Bias = input.direction;
  }

  if (input.screenshot_url.trim()) {
    payload.ScreenShotURL = input.screenshot_url.trim();
  }

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
      continue;
    }

    const parsedValue = Number(rawValue);

    if (Number.isFinite(parsedValue)) {
      payload[payloadKey] = parsedValue;
    }
  }

  const notesSegments = [
    input.notes.trim(),
    input.strategy.trim() ? `Strategy: ${input.strategy.trim()}` : null,
    input.session.trim() ? `Session: ${input.session.trim()}` : null,
    input.position_size.trim()
      ? `Position size: ${input.position_size.trim()}`
      : null,
    input.mistake.trim() ? `Mistake: ${input.mistake.trim()}` : null,
  ].filter(Boolean);

  if (notesSegments.length > 0) {
    payload.Notes = notesSegments.join('\n\n');
  }

  return payload;
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

export function formatCompactNumber(value: number | null, digits = 2) {
  if (value === null) {
    return EMPTY_VALUE;
  }

  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: digits,
  }).format(value);
}

export function formatSignedNumber(value: number | null) {
  if (value === null) {
    return EMPTY_VALUE;
  }

  const absValue = formatCompactNumber(Math.abs(value));

  if (value > 0) {
    return `+${absValue}`;
  }

  if (value < 0) {
    return `-${absValue}`;
  }

  return absValue;
}

export function formatPercentValue(value: number | null, digits = 1) {
  if (value === null) {
    return EMPTY_VALUE;
  }

  return `${formatCompactNumber(value, digits)}%`;
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
