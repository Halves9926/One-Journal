export type SmartYAxisDomain = {
  domain: [number, number];
  hasData: boolean;
  ticks: number[];
};

export type SmartYAxisOptions = {
  includeZero?: boolean;
  maxValue?: number;
  minRange?: number;
  minValue?: number;
  paddingRatio?: number;
  tickCount?: number;
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function normalizeZero(value: number) {
  return Object.is(value, -0) ? 0 : value;
}

function niceNumber(value: number, round: boolean) {
  if (!Number.isFinite(value) || value <= 0) {
    return 1;
  }

  const exponent = Math.floor(Math.log10(value));
  const fraction = value / 10 ** exponent;
  let niceFraction: number;

  if (round) {
    if (fraction < 1.5) {
      niceFraction = 1;
    } else if (fraction < 3) {
      niceFraction = 2;
    } else if (fraction < 7) {
      niceFraction = 5;
    } else {
      niceFraction = 10;
    }
  } else if (fraction <= 1) {
    niceFraction = 1;
  } else if (fraction <= 2) {
    niceFraction = 2;
  } else if (fraction <= 5) {
    niceFraction = 5;
  } else {
    niceFraction = 10;
  }

  return niceFraction * 10 ** exponent;
}

export function buildCurveTicks(
  domain: [number, number],
  tickCount = 5,
) {
  const [domainMin, domainMax] = domain;
  const safeTickCount = Math.max(Math.round(tickCount), 2);
  const range = Math.max(domainMax - domainMin, 1);
  const step = niceNumber(range / (safeTickCount - 1), true);
  const ticks: number[] = [];
  const start = Math.ceil(domainMin / step) * step;
  const end = Math.floor(domainMax / step) * step;

  for (
    let value = start, index = 0;
    value <= end + step / 2 && index < safeTickCount + 4;
    value += step, index += 1
  ) {
    ticks.push(normalizeZero(Number(value.toFixed(10))));
  }

  if (ticks.length === 0) {
    ticks.push(normalizeZero(domainMin), normalizeZero(domainMax));
  }

  if (domainMin <= 0 && domainMax >= 0 && !ticks.includes(0)) {
    ticks.push(0);
  }

  return [...new Set(ticks)]
    .filter((value) => value >= domainMin && value <= domainMax)
    .sort((left, right) => left - right);
}

export function getSmartYAxisDomain(
  values: Array<number | null | undefined>,
  options: SmartYAxisOptions = {},
): SmartYAxisDomain {
  const finiteValues = values.filter(isFiniteNumber);
  const {
    includeZero = false,
    maxValue,
    minRange = 1,
    minValue,
    paddingRatio = 0.16,
    tickCount = 5,
  } = options;

  if (finiteValues.length === 0) {
    const fallbackDomain: [number, number] = [
      minValue ?? (includeZero ? 0 : -1),
      maxValue ?? 1,
    ];

    return {
      domain: fallbackDomain,
      hasData: false,
      ticks: buildCurveTicks(fallbackDomain, tickCount),
    };
  }

  let rawMin = Math.min(...finiteValues);
  let rawMax = Math.max(...finiteValues);

  if (includeZero) {
    rawMin = Math.min(rawMin, 0);
    rawMax = Math.max(rawMax, 0);
  }

  if (minValue !== undefined) {
    rawMin = Math.max(rawMin, minValue);
  }

  if (maxValue !== undefined) {
    rawMax = Math.min(rawMax, maxValue);
  }

  const rawRange = rawMax - rawMin;
  const absoluteMagnitude = Math.max(Math.abs(rawMin), Math.abs(rawMax), 1);
  const equalValuePadding = Math.max(absoluteMagnitude * 0.025, minRange);
  const rangePadding = Math.max(rawRange * paddingRatio, minRange);
  const padding = rawRange === 0 ? equalValuePadding : rangePadding;
  let paddedMin = rawMin - padding;
  let paddedMax = rawMax + padding;

  if (includeZero) {
    paddedMin = Math.min(paddedMin, 0);
    paddedMax = Math.max(paddedMax, 0);
  }

  if (minValue !== undefined) {
    paddedMin = Math.max(paddedMin, minValue);
  }

  if (maxValue !== undefined) {
    paddedMax = Math.min(paddedMax, maxValue);
  }

  if (paddedMin === paddedMax) {
    paddedMin -= minRange;
    paddedMax += minRange;
  }

  const niceRange = niceNumber(paddedMax - paddedMin, false);
  const step = niceNumber(niceRange / Math.max(tickCount - 1, 1), true);
  let domainMin = Math.floor(paddedMin / step) * step;
  let domainMax = Math.ceil(paddedMax / step) * step;

  if (minValue !== undefined) {
    domainMin = Math.max(domainMin, minValue);
  }

  if (maxValue !== undefined) {
    domainMax = Math.min(domainMax, maxValue);
  }

  if (domainMin === domainMax) {
    domainMin -= minRange;
    domainMax += minRange;
  }

  const domain: [number, number] = [
    normalizeZero(Number(domainMin.toFixed(10))),
    normalizeZero(Number(domainMax.toFixed(10))),
  ];

  return {
    domain,
    hasData: true,
    ticks: buildCurveTicks(domain, tickCount),
  };
}

export function shouldShowZeroLine(domain: [number, number]) {
  return domain[0] <= 0 && domain[1] >= 0;
}

export function formatChartCurrencyTick(
  value: number,
  options: { digits?: number; signed?: boolean } = {},
) {
  if (!Number.isFinite(value)) {
    return '$0';
  }

  const { digits = 0, signed = false } = options;
  const normalizedValue = normalizeZero(value);
  const sign = signed && normalizedValue > 0 ? '+' : normalizedValue < 0 ? '-' : '';
  const amount = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(Math.abs(normalizedValue));

  return `${sign}$${amount}`;
}
