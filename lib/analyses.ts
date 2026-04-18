import type {
  AnalysisInsert,
  AnalysisRow,
  AnalysisUpdate,
} from '@/lib/supabase';
import { EMPTY_VALUE, formatTradeDate } from '@/lib/trades';

export const ANALYSES_TABLE = 'analyses';

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
  'created_at',
  'updated_at',
].join(',');

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
  session: string | null;
  symbol: string | null;
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
  session: string;
  symbol: string;
  timeframe: string;
};

function cleanText(value: unknown) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : null;
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
    session: '',
    symbol: '',
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
    screenshotUrl: cleanText(row.screenshot_url),
    session: cleanText(row.session),
    symbol: cleanText(row.symbol)?.toUpperCase() ?? null,
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
    session: analysis.session ?? '',
    symbol: analysis.symbol ?? '',
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
    screenshot_url: input.screenshot_url.trim() || null,
    session: input.session.trim() || null,
    symbol: input.symbol.trim() ? input.symbol.trim().toUpperCase() : null,
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
