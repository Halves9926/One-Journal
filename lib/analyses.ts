import type {
  AnalysisInsert,
  AnalysisRow,
  AnalysisUpdate,
} from '@/lib/supabase';
import { EMPTY_VALUE, formatTradeDate } from '@/lib/trades';
import { normalizeScreenshotUrls } from '@/lib/trades';

export const ANALYSES_TABLE = 'analyses';

export const ANALYSIS_TAG_OPTIONS = [
  'respected',
  'not respected',
  'partially respected',
  'invalidated',
  'followed plan',
  'broke plan',
  'missed setup',
  'late entry',
  'emotional trade',
] as const;

export type AnalysisTag = (typeof ANALYSIS_TAG_OPTIONS)[number];

export const ANALYSIS_SELECT = [
  'id',
  'user_id',
  'account_id',
  'analysis_date',
  'bias',
  'confluences',
  'market_context',
  'key_levels',
  'liquidity_notes',
  'entry_plan',
  'invalidation',
  'session',
  'symbol',
  'timeframe',
  'notes',
  'screenshot_url',
  'screenshot_urls',
  'share_enabled',
  'share_token',
  'share_created_at',
  'share_updated_at',
  'tags',
  'created_at',
  'updated_at',
].join(',');

export type PublicSharedAnalysisView = {
  analysisDate: string | null;
  authorDisplayName: string | null;
  authorUsername: string | null;
  bias: string | null;
  confluences: string | null;
  createdAt: string | null;
  entryPlan: string | null;
  invalidation: string | null;
  keyLevels: string | null;
  liquidityNotes: string | null;
  marketContext: string | null;
  notes: string | null;
  screenshotUrl: string | null;
  screenshotUrls: string[];
  session: string | null;
  shareUpdatedAt: string | null;
  symbol: string | null;
  tags: AnalysisTag[];
  timeframe: string | null;
};

export type PublicSharedAnalysisRow = {
  analysis_date?: string | null;
  author_display_name?: string | null;
  author_username?: string | null;
  bias?: string | null;
  confluences?: string | null;
  created_at?: string | null;
  entry_plan?: string | null;
  invalidation?: string | null;
  key_levels?: string | null;
  liquidity_notes?: string | null;
  market_context?: string | null;
  notes?: string | null;
  screenshot_url?: string | null;
  screenshot_urls?: unknown;
  session?: string | null;
  share_updated_at?: string | null;
  symbol?: string | null;
  tags?: string[] | null;
  timeframe?: string | null;
};

export type AnalysisView = {
  accountId: string | null;
  analysisDate: string | null;
  bias: string | null;
  confluences: string | null;
  createdAt: string | null;
  entryPlan: string | null;
  id: string;
  invalidation: string | null;
  keyLevels: string | null;
  liquidityNotes: string | null;
  marketContext: string | null;
  notes: string | null;
  screenshotUrl: string | null;
  screenshotUrls: string[];
  session: string | null;
  shareCreatedAt: string | null;
  shareEnabled: boolean;
  shareToken: string | null;
  shareUpdatedAt: string | null;
  symbol: string | null;
  tags: AnalysisTag[];
  timeframe: string | null;
  updatedAt: string | null;
  userId: string | null;
};

export type AnalysisFormInput = {
  account_id: string;
  analysis_date: string;
  bias: string;
  confluences: string;
  entry_plan: string;
  invalidation: string;
  key_levels: string;
  liquidity_notes: string;
  market_context: string;
  notes: string;
  screenshot_url: string;
  screenshot_urls: string[];
  session: string;
  symbol: string;
  tags: AnalysisTag[];
  timeframe: string;
};

function cleanText(value: unknown) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : null;
}

function isAnalysisTag(value: string): value is AnalysisTag {
  return (ANALYSIS_TAG_OPTIONS as readonly string[]).includes(value);
}

export function normalizeAnalysisTags(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  const tags: AnalysisTag[] = [];

  for (const item of value) {
    if (typeof item !== 'string') {
      continue;
    }

    const normalizedTag = item.trim().toLowerCase();

    if (isAnalysisTag(normalizedTag) && !tags.includes(normalizedTag)) {
      tags.push(normalizedTag);
    }
  }

  return tags;
}

function getTodayValue() {
  const now = new Date();
  const timezoneOffset = now.getTimezoneOffset() * 60_000;

  return new Date(now.getTime() - timezoneOffset).toISOString().slice(0, 10);
}

export function createInitialAnalysisFormValues(accountId = ''): AnalysisFormInput {
  return {
    account_id: accountId,
    analysis_date: getTodayValue(),
    bias: '',
    confluences: '',
    entry_plan: '',
    invalidation: '',
    key_levels: '',
    liquidity_notes: '',
    market_context: '',
    notes: '',
    screenshot_url: '',
    screenshot_urls: [],
    session: '',
    symbol: '',
    tags: [],
    timeframe: '',
  };
}

export function normalizeAnalysis(row: AnalysisRow, fallbackIndex = 0): AnalysisView {
  return {
    accountId: cleanText(row.account_id),
    analysisDate: cleanText(row.analysis_date),
    bias: cleanText(row.bias),
    confluences: cleanText(row.confluences),
    createdAt: cleanText(row.created_at),
    entryPlan: cleanText(row.entry_plan),
    id: cleanText(row.id) ?? `analysis-${fallbackIndex}`,
    invalidation: cleanText(row.invalidation),
    keyLevels: cleanText(row.key_levels),
    liquidityNotes: cleanText(row.liquidity_notes),
    marketContext: cleanText(row.market_context),
    notes: cleanText(row.notes),
    screenshotUrl: normalizeScreenshotUrls(row.screenshot_urls, cleanText(row.screenshot_url))[0] ?? null,
    screenshotUrls: normalizeScreenshotUrls(row.screenshot_urls, cleanText(row.screenshot_url)),
    session: cleanText(row.session),
    shareCreatedAt: cleanText(row.share_created_at),
    shareEnabled: row.share_enabled === true,
    shareToken: cleanText(row.share_token),
    shareUpdatedAt: cleanText(row.share_updated_at),
    symbol: cleanText(row.symbol)?.toUpperCase() ?? null,
    tags: normalizeAnalysisTags(row.tags),
    timeframe: cleanText(row.timeframe),
    updatedAt: cleanText(row.updated_at),
    userId: cleanText(row.user_id),
  };
}

export function mapAnalysisToFormValues(
  analysis: AnalysisView,
  fallbackAccountId = '',
): AnalysisFormInput {
  return {
    account_id: analysis.accountId ?? fallbackAccountId,
    analysis_date: analysis.analysisDate ?? getTodayValue(),
    bias: analysis.bias ?? '',
    confluences: analysis.confluences ?? '',
    entry_plan: analysis.entryPlan ?? '',
    invalidation: analysis.invalidation ?? '',
    key_levels: analysis.keyLevels ?? '',
    liquidity_notes: analysis.liquidityNotes ?? '',
    market_context: analysis.marketContext ?? '',
    notes: analysis.notes ?? '',
    screenshot_url: analysis.screenshotUrl ?? '',
    screenshot_urls: analysis.screenshotUrls,
    session: analysis.session ?? '',
    symbol: analysis.symbol ?? '',
    tags: analysis.tags,
    timeframe: analysis.timeframe ?? '',
  };
}

function mapAnalysisFormToPayload(
  input: AnalysisFormInput,
  userId: string,
): AnalysisInsert | AnalysisUpdate {
  return {
    account_id: input.account_id.trim() || null,
    analysis_date: input.analysis_date || null,
    bias: input.bias.trim() || null,
    confluences: input.confluences.trim() || null,
    entry_plan: input.entry_plan.trim() || null,
    invalidation: input.invalidation.trim() || null,
    key_levels: input.key_levels.trim() || null,
    liquidity_notes: input.liquidity_notes.trim() || null,
    market_context: input.market_context.trim() || null,
    notes: input.notes.trim() || null,
    screenshot_url: normalizeScreenshotUrls(input.screenshot_urls, input.screenshot_url)[0] ?? null,
    screenshot_urls: normalizeScreenshotUrls(input.screenshot_urls, input.screenshot_url),
    session: input.session.trim() || null,
    symbol: input.symbol.trim() ? input.symbol.trim().toUpperCase() : null,
    tags: normalizeAnalysisTags(input.tags),
    timeframe: input.timeframe.trim() || null,
    user_id: userId,
  };
}

export function mapAnalysisFormToInsert(
  input: AnalysisFormInput,
  userId: string,
): AnalysisInsert {
  return mapAnalysisFormToPayload(input, userId) as AnalysisInsert;
}

export function mapAnalysisFormToUpdate(
  input: AnalysisFormInput,
  userId: string,
): AnalysisUpdate {
  return mapAnalysisFormToPayload(input, userId) as AnalysisUpdate;
}

export function formatAnalysisDate(date: string | null) {
  return formatTradeDate(date);
}

export function getAnalysisSearchText(analysis: AnalysisView) {
  return [
    analysis.symbol ?? '',
    analysis.analysisDate ?? '',
    formatAnalysisDate(analysis.analysisDate),
    analysis.timeframe ?? '',
    analysis.session ?? '',
    analysis.bias ?? '',
    analysis.confluences ?? '',
    analysis.marketContext ?? '',
    analysis.keyLevels ?? '',
    analysis.liquidityNotes ?? '',
    analysis.entryPlan ?? '',
    analysis.invalidation ?? '',
    analysis.notes ?? '',
    analysis.tags.join(' '),
  ]
    .join(' ')
    .toLowerCase();
}

export function getAnalysisPreview(analysis: AnalysisView) {
  return (
    analysis.confluences ??
    analysis.marketContext ??
    analysis.entryPlan ??
    analysis.notes ??
    EMPTY_VALUE
  );
}

export function createAnalysisShareToken() {
  const bytes = new Uint8Array(24);

  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }

  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

export function buildAnalysisSharePath(token: string) {
  return `/share/analysis/${token}`;
}

export function buildAnalysisShareUrl(token: string) {
  const path = buildAnalysisSharePath(token);

  if (typeof window === 'undefined') {
    return path;
  }

  return `${window.location.origin}${path}`;
}

export function normalizePublicSharedAnalysis(
  row: PublicSharedAnalysisRow,
): PublicSharedAnalysisView {
  return {
    analysisDate: cleanText(row.analysis_date),
    authorDisplayName: cleanText(row.author_display_name),
    authorUsername: cleanText(row.author_username),
    bias: cleanText(row.bias),
    confluences: cleanText(row.confluences),
    createdAt: cleanText(row.created_at),
    entryPlan: cleanText(row.entry_plan),
    invalidation: cleanText(row.invalidation),
    keyLevels: cleanText(row.key_levels),
    liquidityNotes: cleanText(row.liquidity_notes),
    marketContext: cleanText(row.market_context),
    notes: cleanText(row.notes),
    screenshotUrl: normalizeScreenshotUrls(row.screenshot_urls, cleanText(row.screenshot_url))[0] ?? null,
    screenshotUrls: normalizeScreenshotUrls(row.screenshot_urls, cleanText(row.screenshot_url)),
    session: cleanText(row.session),
    shareUpdatedAt: cleanText(row.share_updated_at),
    symbol: cleanText(row.symbol)?.toUpperCase() ?? null,
    tags: normalizeAnalysisTags(row.tags),
    timeframe: cleanText(row.timeframe),
  };
}
