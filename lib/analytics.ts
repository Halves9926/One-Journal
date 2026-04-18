import {
  buildTradeSummary,
  formatCompactNumber,
  formatCurrency,
  formatPnl,
  parseTradeNotes,
  type TradeSummary,
  type TradeView,
} from '@/lib/trades';

const WEEKDAY_ORDER = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;

type WeekdayLabel = (typeof WEEKDAY_ORDER)[number];

export type AnalyticsFilters = {
  accountId: string | null;
  dateFrom: string;
  dateTo: string;
  direction: string;
  session: string;
  strategy: string;
  symbol: string;
};

export type AnalyticsTrade = TradeView & {
  durationMinutes: number | null;
  outcome: 'flat' | 'loss' | 'win';
  session: string | null;
  sortTimestamp: number;
  strategy: string | null;
  weekday: WeekdayLabel | null;
};

export type AnalyticsBreakdownItem = {
  avgPnl: number | null;
  avgRr: number | null;
  count: number;
  label: string;
  losses: number;
  netPnl: number;
  winRate: number | null;
  wins: number;
};

export type AnalyticsDirectionStats = {
  avgPnl: number | null;
  avgRr: number | null;
  count: number;
  expectancy: number | null;
  label: 'Long' | 'Short';
  netPnl: number;
  winRate: number | null;
};

export type DistributionBucket = {
  average: number | null;
  count: number;
  max: number;
  min: number;
  netPnl: number;
  positiveCount: number;
  negativeCount: number;
  label: string;
};

export type EquityPoint = {
  date: string | null;
  drawdown: number;
  equity: number;
  label: string;
  pnl: number;
  tradeId: string;
};

export type PnlByDayPoint = {
  count: number;
  date: string;
  label: string;
  netPnl: number;
  wins: number;
};

export type ScatterPoint = {
  date: string | null;
  durationMinutes: number;
  label: string;
  pnl: number;
  symbol: string;
  tradeId: string;
};

export type TrendPoint = {
  index: number;
  label: string;
  rollingPnl: number;
  rollingWinRate: number | null;
};

export type AnalyticsInsight = {
  detail: string;
  title: string;
};

export type AnalyticsFilterOptions = {
  directions: string[];
  sessions: string[];
  strategies: string[];
  symbols: string[];
};

export type AnalyticsSnapshot = {
  averageHoldingMinutes: number | null;
  bestSession: AnalyticsBreakdownItem | null;
  bestSymbol: AnalyticsBreakdownItem | null;
  breakevenCount: number;
  currentDrawdown: number | null;
  directionPerformance: {
    long: AnalyticsDirectionStats;
    short: AnalyticsDirectionStats;
  };
  drawdownCurve: EquityPoint[];
  equityCurve: EquityPoint[];
  expectancy: number | null;
  holdingTradesCount: number;
  insights: AnalyticsInsight[];
  longestLossStreak: number;
  longestWinStreak: number;
  maxDrawdown: number | null;
  mostProfitableDay: AnalyticsBreakdownItem | null;
  mostProfitableSession: AnalyticsBreakdownItem | null;
  pnlByDay: PnlByDayPoint[];
  pnlBySession: AnalyticsBreakdownItem[];
  pnlDistribution: DistributionBucket[];
  profitFactor: number | null;
  recentTrend: TrendPoint[];
  rrDistribution: DistributionBucket[];
  riskAverage: number | null;
  summary: TradeSummary;
  topSymbols: AnalyticsBreakdownItem[];
  totalTrades: number;
  tradeDurationVsPnl: ScatterPoint[];
  weekdayPerformance: AnalyticsBreakdownItem[];
  winRateBySymbol: AnalyticsBreakdownItem[];
  worstDay: AnalyticsBreakdownItem | null;
  worstSession: AnalyticsBreakdownItem | null;
  worstSymbol: AnalyticsBreakdownItem | null;
};

function cleanText(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : null;
}

function normalizeNumericValue(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function getTradeOutcome(pnl: number | null) {
  if ((pnl ?? 0) > 0) {
    return 'win' as const;
  }

  if ((pnl ?? 0) < 0) {
    return 'loss' as const;
  }

  return 'flat' as const;
}

function parseTimeValueToMinutes(value: string | null | undefined) {
  const normalizedValue = cleanText(value);

  if (!normalizedValue) {
    return null;
  }

  const matchedValue = normalizedValue.match(/^(\d{2}):(\d{2})(?::\d{2})?$/);

  if (!matchedValue) {
    return null;
  }

  const hours = Number(matchedValue[1]);
  const minutes = Number(matchedValue[2]);

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return null;
  }

  return hours * 60 + minutes;
}

function getDurationMinutes(trade: Pick<TradeView, 'openTime' | 'closeTime'>) {
  const openMinutes = parseTimeValueToMinutes(trade.openTime);
  const closeMinutes = parseTimeValueToMinutes(trade.closeTime);

  if (openMinutes === null || closeMinutes === null) {
    return null;
  }

  let durationMinutes = closeMinutes - openMinutes;

  if (durationMinutes < 0) {
    durationMinutes += 24 * 60;
  }

  return durationMinutes >= 0 ? durationMinutes : null;
}

function getTradeDateTimeValue(trade: Pick<TradeView, 'createdAt' | 'date' | 'openTime'>) {
  const normalizedDate = cleanText(trade.date);
  const normalizedOpenTime = cleanText(trade.openTime);

  if (normalizedDate) {
    const parsedValue = normalizedOpenTime
      ? new Date(`${normalizedDate}T${normalizedOpenTime}:00`).valueOf()
      : new Date(`${normalizedDate}T00:00:00`).valueOf();

    if (!Number.isNaN(parsedValue)) {
      return parsedValue;
    }
  }

  if (trade.createdAt) {
    const createdAtValue = new Date(trade.createdAt).valueOf();

    if (!Number.isNaN(createdAtValue)) {
      return createdAtValue;
    }
  }

  return 0;
}

function getWeekdayLabel(date: string | null): WeekdayLabel | null {
  if (!date) {
    return null;
  }

  const parsedValue = new Date(`${date}T00:00:00`);

  if (Number.isNaN(parsedValue.valueOf())) {
    return null;
  }

  return parsedValue.toLocaleDateString('en-US', {
    weekday: 'long',
  }) as WeekdayLabel;
}

function getShortDateLabel(date: string | null, fallbackLabel: string) {
  if (!date) {
    return fallbackLabel;
  }

  const parsedValue = new Date(`${date}T00:00:00`);

  if (Number.isNaN(parsedValue.valueOf())) {
    return fallbackLabel;
  }

  return parsedValue.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
  });
}

function sortTradesAscending(left: AnalyticsTrade, right: AnalyticsTrade) {
  return left.sortTimestamp - right.sortTimestamp;
}

function sortTradesDescending(left: AnalyticsTrade, right: AnalyticsTrade) {
  return right.sortTimestamp - left.sortTimestamp;
}

function buildAverage(values: Array<number | null>) {
  const validValues = values.filter(
    (value): value is number => typeof value === 'number' && Number.isFinite(value),
  );

  if (validValues.length === 0) {
    return null;
  }

  return validValues.reduce((total, value) => total + value, 0) / validValues.length;
}

function buildBreakdownItem(label: string, trades: AnalyticsTrade[]): AnalyticsBreakdownItem {
  const count = trades.length;
  const wins = trades.filter((trade) => trade.outcome === 'win').length;
  const losses = trades.filter((trade) => trade.outcome === 'loss').length;
  const netPnl = trades.reduce((total, trade) => total + (trade.pnl ?? 0), 0);
  const avgPnl = count > 0 ? netPnl / count : null;
  const avgRr = buildAverage(trades.map((trade) => normalizeNumericValue(trade.rr)));

  return {
    avgPnl,
    avgRr,
    count,
    label,
    losses,
    netPnl,
    winRate: count > 0 ? (wins / count) * 100 : null,
    wins,
  };
}

function buildGroupedBreakdown(
  trades: AnalyticsTrade[],
  getLabel: (trade: AnalyticsTrade) => string | null,
) {
  const groupedTrades = new Map<string, AnalyticsTrade[]>();

  for (const trade of trades) {
    const label = cleanText(getLabel(trade));

    if (!label) {
      continue;
    }

    const currentTrades = groupedTrades.get(label) ?? [];
    currentTrades.push(trade);
    groupedTrades.set(label, currentTrades);
  }

  return [...groupedTrades.entries()]
    .map(([label, items]) => buildBreakdownItem(label, items))
    .sort((left, right) => {
      if (right.netPnl !== left.netPnl) {
        return right.netPnl - left.netPnl;
      }

      return right.count - left.count;
    });
}

function buildWeekdayBreakdown(trades: AnalyticsTrade[]) {
  const groupedTrades = new Map<WeekdayLabel, AnalyticsTrade[]>();

  for (const weekday of WEEKDAY_ORDER) {
    groupedTrades.set(weekday, []);
  }

  for (const trade of trades) {
    if (!trade.weekday) {
      continue;
    }

    groupedTrades.get(trade.weekday)?.push(trade);
  }

  return WEEKDAY_ORDER.map((weekday) =>
    buildBreakdownItem(weekday, groupedTrades.get(weekday) ?? []),
  ).filter((item) => item.count > 0);
}

function createSymmetricDistribution(values: number[], bucketCount: number) {
  if (values.length === 0) {
    return [];
  }

  const maxAbsValue = Math.max(...values.map((value) => Math.abs(value)));

  if (maxAbsValue === 0) {
    return [
      {
        average: 0,
        count: values.length,
        label: '$0',
        max: 0,
        min: 0,
        negativeCount: 0,
        netPnl: 0,
        positiveCount: 0,
      },
    ] satisfies DistributionBucket[];
  }

  const minValue = -maxAbsValue;
  const maxValue = maxAbsValue;
  const step = (maxValue - minValue) / bucketCount;
  const buckets = Array.from({ length: bucketCount }, (_, index) => {
    const bucketMin = minValue + step * index;
    const bucketMax = index === bucketCount - 1 ? maxValue : bucketMin + step;

    return {
      average: null,
      count: 0,
      label: `${formatPnl(bucketMin, 0)} to ${formatPnl(bucketMax, 0)}`,
      max: bucketMax,
      min: bucketMin,
      negativeCount: 0,
      netPnl: 0,
      positiveCount: 0,
      values: [] as number[],
    };
  });

  for (const value of values) {
    const rawIndex = Math.floor((value - minValue) / step);
    const index = Math.max(0, Math.min(bucketCount - 1, rawIndex));
    const bucket = buckets[index];
    bucket.count += 1;
    bucket.netPnl += value;
    bucket.values.push(value);

    if (value > 0) {
      bucket.positiveCount += 1;
    } else if (value < 0) {
      bucket.negativeCount += 1;
    }
  }

  return buckets
    .map(({ values: bucketValues, ...bucket }) => ({
      ...bucket,
      average:
        bucketValues.length > 0
          ? bucketValues.reduce((total, value) => total + value, 0) / bucketValues.length
          : null,
    }))
    .filter((bucket) => bucket.count > 0);
}

function createPositiveDistribution(values: number[], bucketCount: number) {
  if (values.length === 0) {
    return [];
  }

  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);

  if (minValue === maxValue) {
    return [
      {
        average: minValue,
        count: values.length,
        label: `${formatCompactNumber(minValue, 1)} RR`,
        max: maxValue,
        min: minValue,
        negativeCount: 0,
        netPnl: values.reduce((total, value) => total + value, 0),
        positiveCount: values.filter((value) => value > 0).length,
      },
    ] satisfies DistributionBucket[];
  }

  const step = (maxValue - minValue) / bucketCount;
  const buckets = Array.from({ length: bucketCount }, (_, index) => {
    const bucketMin = minValue + step * index;
    const bucketMax = index === bucketCount - 1 ? maxValue : bucketMin + step;

    return {
      average: null,
      count: 0,
      label: `${formatCompactNumber(bucketMin, 1)}-${formatCompactNumber(bucketMax, 1)}`,
      max: bucketMax,
      min: bucketMin,
      negativeCount: 0,
      netPnl: 0,
      positiveCount: 0,
      values: [] as number[],
    };
  });

  for (const value of values) {
    const rawIndex = Math.floor((value - minValue) / step);
    const index = Math.max(0, Math.min(bucketCount - 1, rawIndex));
    const bucket = buckets[index];
    bucket.count += 1;
    bucket.netPnl += value;
    bucket.values.push(value);

    if (value > 0) {
      bucket.positiveCount += 1;
    } else if (value < 0) {
      bucket.negativeCount += 1;
    }
  }

  return buckets
    .map(({ values: bucketValues, ...bucket }) => ({
      ...bucket,
      average:
        bucketValues.length > 0
          ? bucketValues.reduce((total, value) => total + value, 0) / bucketValues.length
          : null,
    }))
    .filter((bucket) => bucket.count > 0);
}

function getBestBreakdownItem(items: AnalyticsBreakdownItem[]) {
  if (items.length === 0) {
    return null;
  }

  return [...items].sort((left, right) => {
    if (right.netPnl !== left.netPnl) {
      return right.netPnl - left.netPnl;
    }

    return right.count - left.count;
  })[0] ?? null;
}

function getWorstBreakdownItem(items: AnalyticsBreakdownItem[]) {
  if (items.length === 0) {
    return null;
  }

  return [...items].sort((left, right) => {
    if (left.netPnl !== right.netPnl) {
      return left.netPnl - right.netPnl;
    }

    return right.count - left.count;
  })[0] ?? null;
}

function buildEquityCurve(trades: AnalyticsTrade[]) {
  const chronologicalTrades = [...trades].sort(sortTradesAscending);
  const points: EquityPoint[] = [];
  let cumulativeEquity = 0;
  let peakEquity = 0;

  chronologicalTrades.forEach((trade, index) => {
    cumulativeEquity += trade.pnl ?? 0;
    peakEquity = Math.max(peakEquity, cumulativeEquity);

    points.push({
      date: trade.date,
      drawdown: Math.max(peakEquity - cumulativeEquity, 0),
      equity: cumulativeEquity,
      label: getShortDateLabel(trade.date, `T${index + 1}`),
      pnl: trade.pnl ?? 0,
      tradeId: trade.id,
    });
  });

  return points;
}

function buildPnlByDay(trades: AnalyticsTrade[]) {
  const groupedTrades = new Map<
    string,
    { count: number; netPnl: number; wins: number }
  >();

  for (const trade of [...trades].sort(sortTradesAscending)) {
    if (!trade.date) {
      continue;
    }

    const currentValue = groupedTrades.get(trade.date) ?? {
      count: 0,
      netPnl: 0,
      wins: 0,
    };

    currentValue.count += 1;
    currentValue.netPnl += trade.pnl ?? 0;
    currentValue.wins += trade.outcome === 'win' ? 1 : 0;
    groupedTrades.set(trade.date, currentValue);
  }

  return [...groupedTrades.entries()].map(([date, item]) => ({
    count: item.count,
    date,
    label: getShortDateLabel(date, date),
    netPnl: item.netPnl,
    wins: item.wins,
  }));
}

function buildDirectionStats(trades: AnalyticsTrade[]) {
  const directions: Record<'Long' | 'Short', AnalyticsTrade[]> = {
    Long: [],
    Short: [],
  };

  for (const trade of trades) {
    if (trade.bias === 'Long' || trade.bias === 'Short') {
      directions[trade.bias].push(trade);
    }
  }

  function createDirectionStats(label: 'Long' | 'Short'): AnalyticsDirectionStats {
    const items = directions[label];
    const netPnl = items.reduce((total, trade) => total + (trade.pnl ?? 0), 0);
    const wins = items.filter((trade) => trade.outcome === 'win').length;
    const avgPnl = items.length > 0 ? netPnl / items.length : null;

    return {
      avgPnl,
      avgRr: buildAverage(items.map((trade) => trade.rr)),
      count: items.length,
      expectancy: avgPnl,
      label,
      netPnl,
      winRate: items.length > 0 ? (wins / items.length) * 100 : null,
    };
  }

  return {
    long: createDirectionStats('Long'),
    short: createDirectionStats('Short'),
  };
}

function buildLongestStreaks(trades: AnalyticsTrade[]) {
  const chronologicalTrades = [...trades].sort(sortTradesAscending);
  let longestWinStreak = 0;
  let longestLossStreak = 0;
  let currentWinStreak = 0;
  let currentLossStreak = 0;

  for (const trade of chronologicalTrades) {
    if (trade.outcome === 'win') {
      currentWinStreak += 1;
      currentLossStreak = 0;
    } else if (trade.outcome === 'loss') {
      currentLossStreak += 1;
      currentWinStreak = 0;
    } else {
      currentWinStreak = 0;
      currentLossStreak = 0;
    }

    longestWinStreak = Math.max(longestWinStreak, currentWinStreak);
    longestLossStreak = Math.max(longestLossStreak, currentLossStreak);
  }

  return {
    longestLossStreak,
    longestWinStreak,
  };
}

function buildRecentTrend(trades: AnalyticsTrade[], windowSize = 5, limit = 12) {
  const chronologicalTrades = [...trades].sort(sortTradesAscending);
  const trendPoints: TrendPoint[] = chronologicalTrades.map((trade, index) => {
    const windowTrades = chronologicalTrades.slice(Math.max(0, index - windowSize + 1), index + 1);
    const rollingPnl = windowTrades.reduce((total, item) => total + (item.pnl ?? 0), 0);
    const rollingWins = windowTrades.filter((item) => item.outcome === 'win').length;

    return {
      index: index + 1,
      label: getShortDateLabel(trade.date, `T${index + 1}`),
      rollingPnl,
      rollingWinRate:
        windowTrades.length > 0 ? (rollingWins / windowTrades.length) * 100 : null,
    };
  });

  return trendPoints.slice(-limit);
}

function buildDurationScatter(trades: AnalyticsTrade[]) {
  return [...trades]
    .filter(
      (trade): trade is AnalyticsTrade & { durationMinutes: number; pnl: number } =>
        trade.durationMinutes !== null && trade.pnl !== null,
    )
    .sort(sortTradesAscending)
    .map((trade, index) => ({
      date: trade.date,
      durationMinutes: trade.durationMinutes,
      label: trade.symbol || `T${index + 1}`,
      pnl: trade.pnl,
      symbol: trade.symbol || `Trade ${index + 1}`,
      tradeId: trade.id,
    }));
}

export function createInitialAnalyticsFilters(
  accountId: string | null,
): AnalyticsFilters {
  return {
    accountId,
    dateFrom: '',
    dateTo: '',
    direction: 'all',
    session: 'all',
    strategy: 'all',
    symbol: 'all',
  };
}

export function enrichTradesForAnalytics(trades: TradeView[]) {
  return trades.map((trade) => {
    const parsedNotes = parseTradeNotes(trade.notes);

    return {
      ...trade,
      durationMinutes: getDurationMinutes(trade),
      outcome: getTradeOutcome(trade.pnl),
      session: cleanText(parsedNotes.session),
      sortTimestamp: getTradeDateTimeValue(trade),
      strategy: cleanText(parsedNotes.strategy),
      weekday: getWeekdayLabel(trade.date),
    } satisfies AnalyticsTrade;
  });
}

export function buildAnalyticsFilterOptions(trades: AnalyticsTrade[]): AnalyticsFilterOptions {
  function buildOptionValues(values: Array<string | null | undefined>) {
    return [
      ...new Set(
        values
          .map((value) => cleanText(value))
          .filter((value): value is string => Boolean(value)),
      ),
    ]
      .sort((left, right) => left.localeCompare(right)) as string[];
  }

  return {
    directions: buildOptionValues(trades.map((trade) => trade.bias)),
    sessions: buildOptionValues(trades.map((trade) => trade.session)),
    strategies: buildOptionValues(trades.map((trade) => trade.strategy)),
    symbols: buildOptionValues(trades.map((trade) => trade.symbol)),
  };
}

export function filterAnalyticsTrades(
  trades: AnalyticsTrade[],
  filters: AnalyticsFilters,
) {
  const normalizedDateFrom = cleanText(filters.dateFrom);
  const normalizedDateTo = cleanText(filters.dateTo);
  const normalizedSymbol = cleanText(filters.symbol);
  const normalizedSession = cleanText(filters.session);
  const normalizedDirection = cleanText(filters.direction);
  const normalizedStrategy = cleanText(filters.strategy);

  return trades.filter((trade) => {
    if (filters.accountId && trade.accountId !== filters.accountId) {
      return false;
    }

    if (normalizedDateFrom && (!trade.date || trade.date < normalizedDateFrom)) {
      return false;
    }

    if (normalizedDateTo && (!trade.date || trade.date > normalizedDateTo)) {
      return false;
    }

    if (normalizedSymbol && normalizedSymbol !== 'all' && trade.symbol !== normalizedSymbol) {
      return false;
    }

    if (
      normalizedSession &&
      normalizedSession !== 'all' &&
      trade.session !== normalizedSession
    ) {
      return false;
    }

    if (
      normalizedDirection &&
      normalizedDirection !== 'all' &&
      trade.bias !== normalizedDirection
    ) {
      return false;
    }

    if (
      normalizedStrategy &&
      normalizedStrategy !== 'all' &&
      trade.strategy !== normalizedStrategy
    ) {
      return false;
    }

    return true;
  });
}

export function formatRatioMetric(value: number | null, digits = 2) {
  if (value === null) {
    return '--';
  }

  if (!Number.isFinite(value)) {
    return '∞';
  }

  return formatCompactNumber(value, digits);
}

export function formatHoldingTime(value: number | null) {
  if (value === null) {
    return '--';
  }

  const totalMinutes = Math.max(Math.round(value), 0);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes}m`;
  }

  if (minutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${minutes}m`;
}

export function formatHoldingAxisValue(value: number | null) {
  if (value === null) {
    return '--';
  }

  if (value >= 60) {
    return `${formatCompactNumber(value / 60, 1)}h`;
  }

  return `${formatCompactNumber(value, 0)}m`;
}

export function formatBreakdownSummary(item: AnalyticsBreakdownItem | null) {
  if (!item) {
    return '--';
  }

  return `${item.label} • ${formatPnl(item.netPnl, 0)}`;
}

export function buildAnalyticsSnapshot(trades: AnalyticsTrade[]): AnalyticsSnapshot {
  const orderedTrades = [...trades].sort(sortTradesDescending);
  const summary = buildTradeSummary(orderedTrades);
  const equityCurve = buildEquityCurve(orderedTrades);
  const pnlByDay = buildPnlByDay(orderedTrades);
  const pnlBySession = buildGroupedBreakdown(orderedTrades, (trade) => trade.session);
  const symbolBreakdown = buildGroupedBreakdown(orderedTrades, (trade) => trade.symbol);
  const weekdayPerformance = buildWeekdayBreakdown(orderedTrades);
  const directionPerformance = buildDirectionStats(orderedTrades);
  const rrDistribution = createPositiveDistribution(
    orderedTrades
      .map((trade) => normalizeNumericValue(trade.rr))
      .filter((value): value is number => value !== null),
    6,
  );
  const pnlDistribution = createSymmetricDistribution(
    orderedTrades
      .map((trade) => normalizeNumericValue(trade.pnl))
      .filter((value): value is number => value !== null),
    7,
  );
  const { longestLossStreak, longestWinStreak } = buildLongestStreaks(orderedTrades);
  const durationTrades = orderedTrades.filter(
    (trade): trade is AnalyticsTrade & { durationMinutes: number } =>
      trade.durationMinutes !== null,
  );
  const averageHoldingMinutes =
    durationTrades.length > 0
      ? durationTrades.reduce((total, trade) => total + trade.durationMinutes, 0) /
        durationTrades.length
      : null;
  const topSymbols = symbolBreakdown.slice(0, 6);
  const insights = buildAnalyticsInsights({
    directionPerformance,
    longestLossStreak,
    longestWinStreak,
    pnlBySession,
    summary,
    symbolBreakdown,
    totalTrades: orderedTrades.length,
    weekdayPerformance,
  });

  return {
    averageHoldingMinutes,
    bestSession: getBestBreakdownItem(pnlBySession),
    bestSymbol: getBestBreakdownItem(symbolBreakdown),
    breakevenCount: summary.breakeven,
    currentDrawdown: equityCurve.length > 0 ? equityCurve.at(-1)?.drawdown ?? 0 : null,
    directionPerformance,
    drawdownCurve: equityCurve,
    equityCurve,
    expectancy: summary.avgPnl,
    holdingTradesCount: durationTrades.length,
    insights,
    longestLossStreak,
    longestWinStreak,
    maxDrawdown:
      equityCurve.length > 0
        ? Math.max(...equityCurve.map((point) => point.drawdown))
        : null,
    mostProfitableDay: getBestBreakdownItem(weekdayPerformance),
    mostProfitableSession: getBestBreakdownItem(pnlBySession),
    pnlByDay,
    pnlBySession,
    pnlDistribution,
    profitFactor:
      summary.profitFactor ??
      (summary.wins > 0 && summary.losses === 0 ? Number.POSITIVE_INFINITY : null),
    recentTrend: buildRecentTrend(orderedTrades),
    rrDistribution,
    riskAverage: summary.riskAverage,
    summary,
    topSymbols,
    totalTrades: orderedTrades.length,
    tradeDurationVsPnl: buildDurationScatter(orderedTrades),
    weekdayPerformance,
    winRateBySymbol: [...symbolBreakdown]
      .filter((item) => item.count > 0)
      .sort((left, right) => {
        const leftWinRate = left.winRate ?? -1;
        const rightWinRate = right.winRate ?? -1;

        if (rightWinRate !== leftWinRate) {
          return rightWinRate - leftWinRate;
        }

        return right.count - left.count;
      })
      .slice(0, 8),
    worstDay: getWorstBreakdownItem(weekdayPerformance),
    worstSession: getWorstBreakdownItem(pnlBySession),
    worstSymbol: getWorstBreakdownItem(symbolBreakdown),
  };
}

function buildAnalyticsInsights({
  directionPerformance,
  longestLossStreak,
  longestWinStreak,
  pnlBySession,
  summary,
  symbolBreakdown,
  totalTrades,
  weekdayPerformance,
}: {
  directionPerformance: {
    long: AnalyticsDirectionStats;
    short: AnalyticsDirectionStats;
  };
  longestLossStreak: number;
  longestWinStreak: number;
  pnlBySession: AnalyticsBreakdownItem[];
  summary: TradeSummary;
  symbolBreakdown: AnalyticsBreakdownItem[];
  totalTrades: number;
  weekdayPerformance: AnalyticsBreakdownItem[];
}) {
  if (totalTrades < 5) {
    return [];
  }

  const insights: AnalyticsInsight[] = [];
  const bestSession = getBestBreakdownItem(pnlBySession);
  const worstWeekday = getWorstBreakdownItem(weekdayPerformance);
  const bestSymbol = getBestBreakdownItem(symbolBreakdown);
  const worstSymbol = getWorstBreakdownItem(symbolBreakdown);
  const longPerformance = directionPerformance.long;
  const shortPerformance = directionPerformance.short;

  if (bestSession && bestSession.count >= 2 && bestSession.netPnl > 0) {
    insights.push({
      detail: `${bestSession.count} trades, ${formatPnl(bestSession.netPnl, 0)} net.`,
      title: `Best performance comes from ${bestSession.label}`,
    });
  }

  if (
    longPerformance.count >= 2 &&
    shortPerformance.count >= 2 &&
    longPerformance.netPnl !== shortPerformance.netPnl
  ) {
    const betterSide =
      longPerformance.netPnl > shortPerformance.netPnl ? longPerformance : shortPerformance;
    const weakerSide =
      betterSide.label === 'Long' ? shortPerformance : longPerformance;

    insights.push({
      detail: `${betterSide.label} trades are ${formatPnl(betterSide.netPnl, 0)} vs ${formatPnl(weakerSide.netPnl, 0)} on ${weakerSide.label.toLowerCase()} setups.`,
      title: `${weakerSide.label} trades underperform ${betterSide.label.toLowerCase()} trades`,
    });
  }

  if ((summary.avgRr ?? 0) >= 1.5 && (summary.winRate ?? 0) < 50) {
    insights.push({
      detail: `Average RR is ${formatRatioMetric(summary.avgRr, 2)} with a ${formatCompactNumber(summary.winRate, 0)}% win rate.`,
      title: 'Average RR is strong but conversion is still low',
    });
  }

  if (worstWeekday && worstWeekday.count >= 2 && worstWeekday.netPnl < 0) {
    insights.push({
      detail: `${worstWeekday.count} trades combine for ${formatPnl(worstWeekday.netPnl, 0)}.`,
      title: `Most losses cluster on ${worstWeekday.label}`,
    });
  }

  if (
    bestSymbol &&
    worstSymbol &&
    bestSymbol.label !== worstSymbol.label &&
    bestSymbol.count >= 2 &&
    worstSymbol.count >= 2
  ) {
    insights.push({
      detail: `${bestSymbol.label} returns ${formatPnl(bestSymbol.netPnl, 0)} vs ${formatPnl(worstSymbol.netPnl, 0)} on ${worstSymbol.label}.`,
      title: `You perform better on ${bestSymbol.label} than ${worstSymbol.label}`,
    });
  }

  if (longestLossStreak >= 3 && longestLossStreak > longestWinStreak) {
    insights.push({
      detail: `Longest loss streak is ${longestLossStreak} trades. Tight filters may help slow drawdown clusters.`,
      title: 'Loss streaks currently extend longer than win streaks',
    });
  }

  return insights.slice(0, 4);
}

export function getAnalyticsEmptyMessage(totalTrades: number) {
  if (totalTrades === 0) {
    return 'No trades match the current analytics scope.';
  }

  if (totalTrades < 5) {
    return 'Not enough data yet for stable advanced analytics.';
  }

  return null;
}

export function describeAnalyticsRange(filters: Pick<AnalyticsFilters, 'dateFrom' | 'dateTo'>) {
  if (filters.dateFrom && filters.dateTo) {
    return `${filters.dateFrom} -> ${filters.dateTo}`;
  }

  if (filters.dateFrom) {
    return `From ${filters.dateFrom}`;
  }

  if (filters.dateTo) {
    return `Up to ${filters.dateTo}`;
  }

  return 'All dates';
}

export function formatDistributionBucketLabel(
  bucket: Pick<DistributionBucket, 'label' | 'max' | 'min'>,
  mode: 'pnl' | 'rr',
) {
  if (mode === 'rr') {
    return bucket.label;
  }

  if (bucket.min === bucket.max) {
    return formatCurrency(bucket.min, 0);
  }

  return `${formatPnl(bucket.min, 0)} to ${formatPnl(bucket.max, 0)}`;
}
