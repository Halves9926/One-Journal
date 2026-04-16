import type { TradeInsert, TradeRow } from '@/lib/supabase';

export const TRADE_COLUMNS = {
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
  'user_id',
].join(',');

export type TradeView = {
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
  userId: string | null;
};

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

export function normalizeTrade(row: TradeRow, fallbackIndex = 0): TradeView {
  return {
    id:
      typeof row.ID === 'string' || typeof row.ID === 'number'
        ? String(row.ID)
        : `trade-${fallbackIndex}`,
    date: typeof row.Date === 'string' ? row.Date : null,
    symbol: typeof row.Symbol === 'string' ? row.Symbol : 'N/A',
    bias: typeof row.Bias === 'string' ? row.Bias : null,
    entryPrice: toNumber(row['Entry Price']),
    stoploss: toNumber(row.Stoploss),
    takeProfit: toNumber(row['Take Profit']),
    riskPercent: toNumber(row['Risk %']),
    rr: toNumber(row.RrisktoRewardRatio),
    pnl: toNumber(row.PnL),
    notes: typeof row.Notes === 'string' ? row.Notes : null,
    screenshotUrl:
      typeof row.ScreenShotURL === 'string' ? row.ScreenShotURL : null,
    userId: typeof row.user_id === 'string' ? row.user_id : null,
  };
}

export type TradeFormInput = {
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
    return 'No date';
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
    return 'n/d';
  }

  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: digits,
  }).format(value);
}

export function formatSignedNumber(value: number | null) {
  if (value === null) {
    return 'n/d';
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
