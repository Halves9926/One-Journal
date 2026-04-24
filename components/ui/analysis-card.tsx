'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';

import { useAccounts } from '@/components/ui/accounts-provider';
import { useAuth } from '@/components/ui/auth-provider';
import {
  buildAnalysisSharePath,
  buildAnalysisShareUrl,
  createAnalysisShareToken,
  formatAnalysisDate,
  getAnalysisPreview,
  type AnalysisView,
} from '@/lib/analyses';
import { EMPTY_VALUE } from '@/lib/trades';
import { cx } from '@/lib/utils';

type AnalysisCardProps = {
  analysis: AnalysisView;
  className?: string;
  compact?: boolean;
  editHref?: string;
  index?: number;
  onDelete?: (analysisId: string) => Promise<{ error: string | null }>;
  onShareUpdated?: () => void;
  variant?: 'stacked';
};

function getBiasToneClassName(bias: string | null) {
  if (!bias) {
    return 'border-[color:var(--border-color)] bg-[var(--surface)] text-[var(--muted)]';
  }

  const normalizedBias = bias.toLowerCase();

  if (normalizedBias.includes('bull')) {
    return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
  }

  if (normalizedBias.includes('bear')) {
    return 'border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300';
  }

  return 'border-[color:var(--accent-border-soft)] bg-[var(--accent-soft-bg)] text-[var(--accent-text)]';
}

function getPreviewText(value: string | null, limit: number) {
  if (!value) {
    return null;
  }

  const flattenedValue = value.replace(/\s*\n+\s*/g, ' / ').trim();

  if (flattenedValue.length <= limit) {
    return flattenedValue;
  }

  return `${flattenedValue.slice(0, limit - 3).trimEnd()}...`;
}

function AnalysisCover({
  className,
  placeholder = false,
  screenshotCount = 0,
  screenshotUrl,
  symbol,
}: {
  className?: string;
  placeholder?: boolean;
  screenshotCount?: number;
  screenshotUrl: string | null;
  symbol: string;
}) {
  const [imageFailed, setImageFailed] = useState(false);

  if ((!screenshotUrl || imageFailed) && !placeholder) {
    return null;
  }

  if (!screenshotUrl || imageFailed) {
    return (
      <div
        className={cx(
          'relative grid min-h-[210px] overflow-hidden rounded-[26px] border border-dashed border-[color:var(--border-color)] bg-[radial-gradient(circle_at_22%_18%,var(--accent-primary-glow),transparent_42%),linear-gradient(135deg,var(--surface-raised),var(--surface))] shadow-[0_22px_48px_-34px_var(--shadow-color)]',
          className,
        )}
      >
        <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,var(--accent-border-soft),transparent)]" />
        <div className="grid place-items-center p-6 text-center">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[var(--accent-text)]">
              {symbol}
            </p>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
              No screenshot attached. Thesis preview remains visible below.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <a
      href={screenshotUrl}
      target="_blank"
      rel="noreferrer"
      className={cx(
        'group/cover relative block overflow-hidden rounded-[24px] border border-[color:var(--border-color)] bg-[var(--surface)] shadow-[0_22px_48px_-34px_var(--shadow-color)] transition duration-300 lg:hover:border-[color:var(--border-strong)]',
        className,
      )}
    >
      <div className="aspect-[16/10] min-h-[210px] overflow-hidden bg-[radial-gradient(circle_at_top,var(--accent-primary-glow),transparent_54%),linear-gradient(180deg,var(--surface-strong),var(--surface))]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={screenshotUrl}
          alt={`${symbol} analysis screenshot`}
          loading="lazy"
          className="h-full w-full object-cover transition duration-500 lg:group-hover/cover:scale-[1.02]"
          onError={() => setImageFailed(true)}
        />
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-[linear-gradient(180deg,transparent,rgba(10,12,16,0.78))] px-4 py-3 text-sm text-white">
        Analysis screenshot{screenshotCount > 1 ? ` +${screenshotCount - 1}` : ''}
      </div>
    </a>
  );
}

export default function AnalysisCard({
  analysis,
  className,
  compact = false,
  editHref,
  index = 0,
  onDelete,
  onShareUpdated,
  variant,
}: AnalysisCardProps) {
  const { supabase, user } = useAuth();
  const { accounts } = useAccounts();
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isSharePanelOpen, setIsSharePanelOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isUpdatingScreenshot, setIsUpdatingScreenshot] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const [shareOverride, setShareOverride] = useState<{
    enabled: boolean;
    token: string | null;
  } | null>(null);
  const [screenshotOverride, setScreenshotOverride] = useState<
    string[] | undefined
  >(undefined);
  const symbolLabel = analysis.symbol ?? 'Account thesis';
  const screenshotUrls = screenshotOverride ?? analysis.screenshotUrls;
  const screenshotUrl = screenshotUrls[0] ?? null;
  const shareEnabled = shareOverride?.enabled ?? analysis.shareEnabled;
  const shareToken = shareOverride?.token ?? analysis.shareToken;
  const sharePath = shareToken ? buildAnalysisSharePath(shareToken) : null;
  const analysisAccount = accounts.find(
    (account) => account.id === analysis.accountId,
  );
  const isOwnAnalysis = Boolean(user && analysis.userId === user.id);
  const canManageAnalysisEntry = Boolean(
    supabase &&
      user &&
      (analysisAccount
        ? analysisAccount.coopRole === 'owner' ||
          analysisAccount.coopRole === 'admin' ||
          (analysisAccount.coopRole === 'member' && isOwnAnalysis)
        : isOwnAnalysis),
  );
  const canManageSharing = Boolean(
    supabase && user && canManageAnalysisEntry,
  );
  const effectiveEditHref = canManageAnalysisEntry ? editHref : undefined;
  const hasScreenshot = screenshotUrls.length > 0;
  const hasScreenshotActions = Boolean(
    effectiveEditHref || (hasScreenshot && canManageSharing),
  );
  const previewSections = useMemo(
    () =>
      [
        analysis.confluences
          ? { label: 'Confluences', value: analysis.confluences }
          : null,
        analysis.marketContext
          ? { label: 'Context', value: analysis.marketContext }
          : null,
        analysis.entryPlan
          ? { label: 'Entry plan', value: analysis.entryPlan }
          : null,
        analysis.invalidation
          ? { label: 'Invalidation', value: analysis.invalidation }
          : null,
        analysis.notes ? { label: 'Notes', value: analysis.notes } : null,
      ]
        .filter(
          (item): item is { label: string; value: string } => Boolean(item),
        )
        .slice(0, compact ? 2 : 4),
    [
      analysis.confluences,
      analysis.entryPlan,
      analysis.invalidation,
      analysis.marketContext,
      analysis.notes,
      compact,
    ],
  );

  async function handleDelete() {
    if (!onDelete) {
      return;
    }

    setIsDeleting(true);
    setActionError(null);

    const result = await onDelete(analysis.id);

    if (result.error) {
      setActionError(result.error);
      setIsDeleting(false);
      return;
    }

    setIsDeleteConfirmOpen(false);
    setIsDeleting(false);
  }

  async function handleRemoveScreenshot() {
    if (!supabase || !user || !canManageSharing) {
      setActionError('Sign in to update screenshots.');
      return;
    }

    setIsUpdatingScreenshot(true);
    setActionError(null);

    const { error } = await supabase
      .from('analyses')
      .update({ screenshot_url: null, screenshot_urls: [] })
      .eq('id', analysis.id);

    if (error) {
      setActionError(error.message);
      setIsUpdatingScreenshot(false);
      return;
    }

    setScreenshotOverride([]);
    setIsUpdatingScreenshot(false);
    onShareUpdated?.();
  }

  function renderScreenshotActions(size: 'compact' | 'default' = 'default') {
    const baseClassName =
      size === 'compact'
        ? 'inline-flex min-h-8 items-center rounded-full border px-3 text-xs font-medium transition'
        : 'inline-flex min-h-9 items-center rounded-full border px-3 text-xs font-medium transition';
    const neutralClassName =
      'border-[color:var(--border-color)] bg-[var(--surface)] text-[var(--muted-strong)] hover:border-[color:var(--border-strong)] hover:text-[var(--foreground)]';

    return (
      <>
        {effectiveEditHref ? (
          <Link
            className={cx(
              baseClassName,
              hasScreenshot
                ? neutralClassName
                : 'border-[color:var(--accent-border-soft)] bg-[var(--accent-soft-bg)] text-[var(--accent-text)] hover:border-[color:var(--accent-border-strong)]',
            )}
            href={effectiveEditHref}
          >
            {hasScreenshot ? 'Change screenshot' : 'Add screenshot'}
          </Link>
        ) : null}
        {hasScreenshot && canManageSharing ? (
          <button
            className={cx(
              baseClassName,
              'border-rose-500/20 bg-rose-500/10 text-rose-700 hover:border-rose-500/34 hover:bg-rose-500/16 disabled:cursor-not-allowed disabled:opacity-60 dark:text-rose-300',
            )}
            disabled={isUpdatingScreenshot}
            type="button"
            onClick={() => {
              void handleRemoveScreenshot();
            }}
          >
            {isUpdatingScreenshot ? 'Removing...' : 'Remove screenshot'}
          </button>
        ) : null}
      </>
    );
  }

  async function handleEnableSharing() {
    if (!supabase || !user) {
      setShareError('Sign in to share analyses.');
      return;
    }

    const nextToken = shareToken ?? createAnalysisShareToken();
    const now = new Date().toISOString();

    setIsSharing(true);
    setShareError(null);
    setShareMessage(null);

    const { error } = await supabase
      .from('analyses')
      .update({
        share_created_at: analysis.shareCreatedAt ?? now,
        share_enabled: true,
        share_token: nextToken,
        share_updated_at: now,
      })
      .eq('id', analysis.id);

    if (error) {
      setShareError(error.message);
      setIsSharing(false);
      return;
    }

    setShareOverride({
      enabled: true,
      token: nextToken,
    });
    setShareMessage('Public link enabled.');
    setIsSharing(false);
    onShareUpdated?.();
  }

  async function handleDisableSharing() {
    if (!supabase || !user) {
      setShareError('Sign in to update sharing.');
      return;
    }

    setIsSharing(true);
    setShareError(null);
    setShareMessage(null);

    const { error } = await supabase
      .from('analyses')
      .update({
        share_enabled: false,
        share_token: null,
        share_updated_at: new Date().toISOString(),
      })
      .eq('id', analysis.id);

    if (error) {
      setShareError(error.message);
      setIsSharing(false);
      return;
    }

    setShareOverride({
      enabled: false,
      token: null,
    });
    setShareMessage('Public link disabled.');
    setIsSharing(false);
    onShareUpdated?.();
  }

  async function handleCopyShareLink() {
    if (!shareToken) {
      setShareError('Enable sharing before copying the link.');
      return;
    }

    try {
      await navigator.clipboard.writeText(buildAnalysisShareUrl(shareToken));
      setShareError(null);
      setShareMessage('Link copied.');
    } catch {
      setShareError('Copy failed. Select and copy the link manually.');
    }
  }

  if (compact && variant !== 'stacked') {
    return (
      <motion.article
        initial={{ opacity: 0, y: 8 }}
        transition={{
          delay: index * 0.02,
          duration: 0.26,
          ease: [0.22, 1, 0.36, 1],
        }}
        viewport={{ once: true, amount: 0.2 }}
        whileInView={{ opacity: 1, y: 0 }}
        className={cx(
          'group rounded-[20px] border border-[color:var(--border-color)] bg-[linear-gradient(180deg,var(--surface-raised),var(--surface))] px-3 py-2.5 shadow-[0_14px_30px_-28px_var(--shadow-color)] transition hover:border-[color:var(--accent-border-soft)] sm:px-4',
          className,
        )}
      >
        <div className="grid min-w-0 gap-2 md:grid-cols-[minmax(130px,0.95fr)_minmax(120px,0.75fr)_minmax(120px,1fr)_auto] md:items-center">
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <span className="truncate text-base font-semibold tracking-tight text-[var(--foreground)]">
                {symbolLabel}
              </span>
              {analysis.bias ? (
                <span
                  className={cx(
                    'shrink-0 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.18em]',
                    getBiasToneClassName(analysis.bias),
                  )}
                >
                  {analysis.bias}
                </span>
              ) : null}
            </div>
            <p className="mt-1 truncate text-xs text-[var(--muted)]">
              {formatAnalysisDate(analysis.analysisDate)}
              {analysis.timeframe ? ` / ${analysis.timeframe}` : ''}
              {analysis.session ? ` / ${analysis.session}` : ''}
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {analysis.tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="max-w-[8rem] truncate rounded-full border border-[color:var(--border-color)] bg-[var(--surface)] px-2 py-1 text-xs capitalize text-[var(--muted-strong)]"
              >
                {tag}
              </span>
            ))}
            {shareEnabled ? (
              <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-700 dark:text-emerald-300">
                Shared
              </span>
            ) : null}
          </div>

          <p className="truncate text-sm text-[var(--muted-strong)]">
            {getPreviewText(getAnalysisPreview(analysis), 96) ?? 'No preview yet'}
          </p>

          {effectiveEditHref ||
          (onDelete && canManageAnalysisEntry) ||
          canManageSharing ||
          hasScreenshotActions ? (
            <div className="flex flex-wrap items-center gap-2 md:justify-end">
              {renderScreenshotActions('compact')}
              {canManageSharing ? (
                <button
                  className="inline-flex min-h-8 items-center rounded-full border border-[color:var(--border-color)] bg-[var(--surface)] px-3 text-xs font-medium text-[var(--muted-strong)] transition hover:border-[color:var(--border-strong)] hover:text-[var(--foreground)]"
                  type="button"
                  onClick={() => {
                    setShareError(null);
                    setShareMessage(null);
                    setIsSharePanelOpen((current) => !current);
                  }}
                >
                  Share
                </button>
              ) : null}
              {effectiveEditHref ? (
                <Link
                  className="inline-flex min-h-8 items-center rounded-full border border-[color:var(--border-color)] bg-[var(--surface)] px-3 text-xs font-medium text-[var(--muted-strong)] transition hover:border-[color:var(--border-strong)] hover:text-[var(--foreground)]"
                  href={effectiveEditHref}
                >
                  Edit
                </Link>
              ) : null}
              {onDelete && canManageAnalysisEntry ? (
                <button
                  aria-label="Delete analysis"
                  className="inline-flex min-h-8 items-center rounded-full border border-[color:color-mix(in_srgb,var(--danger)_20%,transparent)] bg-[color:color-mix(in_srgb,var(--danger)_10%,transparent)] px-3 text-xs font-medium text-[var(--danger)] transition hover:border-[color:color-mix(in_srgb,var(--danger)_34%,transparent)]"
                  type="button"
                  onClick={() => {
                    setActionError(null);
                    setIsDeleteConfirmOpen((current) => !current);
                  }}
                >
                  Delete
                </button>
              ) : null}
            </div>
          ) : null}
        </div>

        {canManageSharing && isSharePanelOpen ? (
          <div className="mt-2 rounded-[18px] border border-[color:var(--accent-border-soft)] bg-[linear-gradient(180deg,var(--accent-soft-bg),var(--surface))] px-3 py-3">
            <p className="break-all text-sm leading-6 text-[var(--muted-strong)]">
              {shareEnabled && sharePath ? sharePath : 'Enable sharing to create a public read-only link.'}
            </p>
          </div>
        ) : null}

        {((onDelete && canManageAnalysisEntry) || hasScreenshotActions) &&
        (isDeleteConfirmOpen || actionError) ? (
          <div className="mt-2 rounded-[18px] border border-[color:color-mix(in_srgb,var(--danger)_20%,transparent)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--danger)_8%,transparent),var(--surface))] px-3 py-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                {isDeleteConfirmOpen ? (
                  <p className="text-sm font-medium text-[var(--foreground)]">
                    Delete this analysis?
                  </p>
                ) : null}
                {actionError ? (
                  <p className="mt-1 text-sm text-[var(--danger)]">{actionError}</p>
                ) : null}
              </div>
              {isDeleteConfirmOpen ? (
                <div className="flex items-center gap-2">
                <button
                  className="inline-flex min-h-9 items-center rounded-full border border-[color:var(--border-color)] bg-[var(--surface-raised)] px-3 text-xs font-medium text-[var(--muted-strong)] transition hover:border-[color:var(--border-strong)] hover:text-[var(--foreground)]"
                  type="button"
                  onClick={() => {
                    setIsDeleteConfirmOpen(false);
                    setActionError(null);
                  }}
                >
                  Cancel
                </button>
                <button
                  className="inline-flex min-h-9 items-center rounded-full border border-[color:color-mix(in_srgb,var(--danger)_28%,transparent)] bg-[linear-gradient(135deg,var(--danger),color-mix(in_srgb,var(--danger)_72%,black))] px-3 text-xs font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isDeleting}
                  type="button"
                  onClick={() => {
                    void handleDelete();
                  }}
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </motion.article>
    );
  }

  if (variant === 'stacked') {
    return (
      <motion.article
        initial={{ opacity: 0, y: 10 }}
        transition={{
          delay: index * 0.03,
          duration: 0.32,
          ease: [0.22, 1, 0.36, 1],
        }}
        viewport={{ once: true, amount: 0.2 }}
        whileInView={{ opacity: 1, y: 0 }}
        className={cx(
          'group relative overflow-hidden rounded-[28px] border border-[color:var(--border-color)] bg-[linear-gradient(180deg,var(--surface-raised),var(--surface))] p-4 pl-8 shadow-[0_22px_48px_-36px_var(--shadow-color),inset_0_1px_0_rgba(255,255,255,0.08)] transition duration-300 hover:border-[color:var(--accent-border-soft)] sm:p-5 sm:pl-10',
          className,
        )}
      >
        <span className="absolute bottom-5 left-4 top-5 w-px bg-[linear-gradient(180deg,var(--accent-border-soft),var(--border-color),transparent)] sm:left-5" />
        <span className="absolute left-[0.68rem] top-6 h-3 w-3 rounded-full border-2 border-[var(--surface)] bg-[var(--chart-accent)] sm:left-[0.93rem]" />
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(220px,320px)] lg:items-stretch">
          <div className="min-w-0">
            <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.28em] text-[var(--muted)]">
              {formatAnalysisDate(analysis.analysisDate)}
              {analysis.timeframe ? ` / ${analysis.timeframe}` : ''}
              {analysis.session ? ` / ${analysis.session}` : ''}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-[color:var(--accent-border-soft)] bg-[var(--accent-soft-bg)] px-3 py-1 font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--accent-text)]">
                {symbolLabel}
              </span>
              {analysis.bias ? (
                <span
                  className={cx(
                    'rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.22em]',
                    getBiasToneClassName(analysis.bias),
                  )}
                >
                  {analysis.bias}
                </span>
              ) : null}
              {analysis.session ? (
                <span className="rounded-full border border-[color:var(--border-color)] bg-[var(--surface)] px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-[var(--muted-strong)]">
                  {analysis.session}
                </span>
              ) : null}
              {shareEnabled ? (
                <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-emerald-700 dark:text-emerald-300">
                  Shared
                </span>
              ) : null}
            </div>

            {analysis.tags.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {analysis.tags.slice(0, 5).map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-[color:var(--border-color)] bg-[var(--surface)] px-3 py-1 text-xs capitalize text-[var(--muted-strong)]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}

            <p className="mt-4 max-h-12 overflow-hidden text-sm leading-6 text-[var(--muted-strong)]">
              {getPreviewText(getAnalysisPreview(analysis), 220) ??
                'No analysis notes yet.'}
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              {renderScreenshotActions()}
              {canManageSharing ? (
                <button
                  className={cx(
                    'inline-flex min-h-9 items-center rounded-full border px-3 text-xs font-medium transition',
                    shareEnabled
                      ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 hover:border-emerald-500/34 dark:text-emerald-300'
                      : 'border-[color:var(--border-color)] bg-[var(--surface)] text-[var(--muted-strong)] hover:border-[color:var(--border-strong)] hover:text-[var(--foreground)]',
                  )}
                  type="button"
                  onClick={() => {
                    setShareError(null);
                    setShareMessage(null);
                    setIsSharePanelOpen((current) => !current);
                  }}
                >
                  Share
                </button>
              ) : null}
              {effectiveEditHref ? (
                <Link
                  className="inline-flex min-h-9 items-center rounded-full border border-[color:var(--border-color)] bg-[var(--surface)] px-3 text-xs font-medium text-[var(--muted-strong)] transition hover:border-[color:var(--border-strong)] hover:text-[var(--foreground)]"
                  href={effectiveEditHref}
                >
                  Edit
                </Link>
              ) : null}
              {onDelete && canManageAnalysisEntry ? (
                <button
                  aria-label="Delete analysis"
                  className="inline-flex min-h-9 items-center rounded-full border border-[color:color-mix(in_srgb,var(--danger)_20%,transparent)] bg-[color:color-mix(in_srgb,var(--danger)_10%,transparent)] px-3 text-xs font-medium text-[var(--danger)] transition hover:border-[color:color-mix(in_srgb,var(--danger)_34%,transparent)]"
                  type="button"
                  onClick={() => {
                    setActionError(null);
                    setIsDeleteConfirmOpen((current) => !current);
                  }}
                >
                  Delete
                </button>
              ) : null}
            </div>
          </div>

          {screenshotUrl ? (
            <a
              className="relative min-h-[170px] overflow-hidden rounded-[22px] border border-[color:var(--border-color)] bg-[var(--surface)]"
              href={screenshotUrl}
              rel="noreferrer"
              target="_blank"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt={`${symbolLabel} analysis screenshot`}
                className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]"
                loading="lazy"
                src={screenshotUrl}
              />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-[linear-gradient(180deg,transparent,rgba(10,12,16,0.78))] px-4 py-3 text-sm text-white">
                Screenshot
              </div>
            </a>
          ) : (
            <div className="grid min-h-[150px] place-items-center rounded-[22px] border border-dashed border-[color:var(--border-color)] bg-[radial-gradient(circle_at_top,var(--accent-primary-glow),transparent_62%),var(--surface)] px-4 text-center text-sm text-[var(--muted)]">
              <div className="space-y-3">
                <p>No screenshot</p>
                {effectiveEditHref ? (
                  <Link
                    className="inline-flex min-h-9 items-center rounded-full border border-[color:var(--accent-border-soft)] bg-[var(--accent-soft-bg)] px-3 text-xs font-medium text-[var(--accent-text)] transition hover:border-[color:var(--accent-border-strong)]"
                    href={effectiveEditHref}
                  >
                    Add screenshot
                  </Link>
                ) : null}
              </div>
            </div>
          )}
        </div>

        {canManageSharing && isSharePanelOpen ? (
          <div className="mt-4 rounded-[24px] border border-[color:var(--accent-border-soft)] bg-[linear-gradient(180deg,var(--accent-soft-bg),var(--surface))] px-4 py-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--accent-text)]">
                  {shareEnabled ? 'Public link active' : 'Private analysis'}
                </p>
                <p className="mt-2 break-all text-sm leading-6 text-[var(--muted-strong)]">
                  {shareEnabled && sharePath ? sharePath : 'Enable sharing to create a public read-only link.'}
                </p>
                {shareError ? (
                  <p className="mt-2 text-sm text-[var(--danger)]">{shareError}</p>
                ) : shareMessage ? (
                  <p className="mt-2 text-sm text-[var(--success)]">{shareMessage}</p>
                ) : null}
              </div>
              <div className="flex flex-col gap-2 sm:flex-row lg:shrink-0">
                {shareEnabled ? (
                  <>
                    <button
                      className="inline-flex min-h-10 items-center justify-center rounded-full border border-[color:var(--border-color)] bg-[var(--surface-raised)] px-4 text-sm font-medium text-[var(--muted-strong)] transition hover:border-[color:var(--border-strong)] hover:text-[var(--foreground)]"
                      type="button"
                      onClick={() => {
                        void handleCopyShareLink();
                      }}
                    >
                      Copy link
                    </button>
                    <button
                      className="inline-flex min-h-10 items-center justify-center rounded-full border border-rose-500/20 bg-rose-500/10 px-4 text-sm font-medium text-rose-700 transition hover:border-rose-500/34 hover:bg-rose-500/16 disabled:cursor-not-allowed disabled:opacity-60 dark:text-rose-300"
                      disabled={isSharing}
                      type="button"
                      onClick={() => {
                        void handleDisableSharing();
                      }}
                    >
                      {isSharing ? 'Updating...' : 'Disable'}
                    </button>
                  </>
                ) : (
                  <button
                    className="inline-flex min-h-10 items-center justify-center rounded-full border border-[color:var(--accent-border-soft)] bg-[linear-gradient(135deg,var(--accent-gradient-start),var(--accent-gradient-mid)_60%,var(--accent-gradient-end))] px-4 text-sm font-medium text-[var(--accent-button-text)] shadow-[0_18px_38px_-24px_var(--accent-button-shadow)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                    disabled={isSharing}
                    type="button"
                    onClick={() => {
                      void handleEnableSharing();
                    }}
                  >
                    {isSharing ? 'Creating...' : 'Enable link'}
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : null}

        {((onDelete && canManageAnalysisEntry) || hasScreenshotActions) &&
        (isDeleteConfirmOpen || actionError) ? (
          <div className="mt-4 rounded-[22px] border border-[color:color-mix(in_srgb,var(--danger)_20%,transparent)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--danger)_8%,transparent),var(--surface))] px-4 py-3.5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                {isDeleteConfirmOpen ? (
                  <p className="text-sm font-medium text-[var(--foreground)]">
                    Delete this analysis?
                  </p>
                ) : null}
                {actionError ? (
                  <p className="mt-2 text-sm text-[var(--danger)]">{actionError}</p>
                ) : null}
              </div>
              {isDeleteConfirmOpen ? (
                <div className="flex items-center gap-2">
                <button
                  className="inline-flex min-h-10 items-center rounded-full border border-[color:var(--border-color)] bg-[var(--surface-raised)] px-4 text-sm font-medium text-[var(--muted-strong)] transition hover:border-[color:var(--border-strong)] hover:text-[var(--foreground)]"
                  type="button"
                  onClick={() => {
                    setIsDeleteConfirmOpen(false);
                    setActionError(null);
                  }}
                >
                  Cancel
                </button>
                <button
                  className="inline-flex min-h-10 items-center rounded-full border border-[color:color-mix(in_srgb,var(--danger)_28%,transparent)] bg-[linear-gradient(135deg,var(--danger),color-mix(in_srgb,var(--danger)_72%,black))] px-4 text-sm font-medium text-white shadow-[0_20px_42px_-28px_color-mix(in_srgb,var(--danger)_40%,transparent)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                  disabled={isDeleting}
                  type="button"
                  onClick={() => {
                    void handleDelete();
                  }}
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </motion.article>
    );
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{
        delay: index * 0.04,
        duration: 0.46,
        ease: [0.22, 1, 0.36, 1],
      }}
      className={cx(
        'overflow-hidden rounded-[30px] border border-[color:var(--border-strong)] bg-[linear-gradient(180deg,var(--surface-strong),var(--surface))] p-4 shadow-[0_30px_68px_-42px_var(--shadow-color),inset_0_1px_0_rgba(255,255,255,0.08)] transition duration-300 lg:hover:-translate-y-1 lg:hover:border-[color:var(--accent-border-soft)] sm:p-5',
        className,
      )}
    >
      <div className="flex h-full flex-col gap-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="rounded-full border border-[color:var(--accent-border-soft)] bg-[var(--accent-soft-bg)] px-3 py-1 font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--accent-text)]">
                {symbolLabel}
              </span>
              {analysis.timeframe ? (
                <span className="rounded-full border border-[color:var(--border-color)] bg-[var(--surface-raised)] px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-[var(--muted)]">
                  {analysis.timeframe}
                </span>
              ) : null}
              {analysis.bias ? (
                <span
                  className={cx(
                    'rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.24em]',
                    getBiasToneClassName(analysis.bias),
                  )}
                >
                  {analysis.bias}
                </span>
              ) : null}
              {shareEnabled ? (
                <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-emerald-700 dark:text-emerald-300">
                  Shared
                </span>
              ) : null}
            </div>

            <div className="mt-3 flex flex-wrap gap-2 text-sm text-[var(--muted)]">
              {analysis.analysisDate ? (
                <span>{formatAnalysisDate(analysis.analysisDate)}</span>
              ) : null}
              {analysis.session ? <span>{analysis.session}</span> : null}
            </div>

            {analysis.tags.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {analysis.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-[color:var(--border-color)] bg-[var(--surface-raised)] px-3 py-1 text-xs capitalize text-[var(--muted-strong)]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          {effectiveEditHref ||
          (onDelete && canManageAnalysisEntry) ||
          canManageSharing ||
          hasScreenshotActions ? (
            <div className="flex flex-wrap items-center gap-2 self-start md:self-end">
              {renderScreenshotActions()}
              {canManageSharing ? (
                <button
                  type="button"
                  onClick={() => {
                    setShareError(null);
                    setShareMessage(null);
                    setIsSharePanelOpen((current) => !current);
                  }}
                  className={cx(
                    'inline-flex min-h-9 items-center rounded-full border px-3 text-xs font-medium transition',
                    shareEnabled
                      ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 hover:border-emerald-500/34 dark:text-emerald-300'
                      : 'border-[color:var(--border-color)] bg-[var(--surface)] text-[var(--muted-strong)] hover:border-[color:var(--border-strong)] hover:text-[var(--foreground)]',
                  )}
                >
                  Share
                </button>
              ) : null}
              {effectiveEditHref ? (
                <Link
                  href={effectiveEditHref}
                  className="inline-flex min-h-9 items-center rounded-full border border-[color:var(--border-color)] bg-[var(--surface)] px-3 text-xs font-medium text-[var(--muted-strong)] transition hover:border-[color:var(--border-strong)] hover:text-[var(--foreground)]"
                >
                  Edit
                </Link>
              ) : null}
              {onDelete && canManageAnalysisEntry ? (
                <button
                  type="button"
                  onClick={() => {
                    setActionError(null);
                    setIsDeleteConfirmOpen((current) => !current);
                  }}
                  className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-full border border-rose-500/20 bg-rose-500/10 px-3 text-rose-700 transition hover:border-rose-500/34 hover:bg-rose-500/16 dark:text-rose-300"
                  aria-label="Delete analysis"
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 20 20"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <path d="M4.75 6h10.5" strokeLinecap="round" />
                    <path d="M8 6V4.75h4V6" strokeLinecap="round" strokeLinejoin="round" />
                    <path
                      d="M6.25 6l.6 8.02a1 1 0 0 0 1 .93h4.3a1 1 0 0 0 1-.93L13.75 6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              ) : null}
            </div>
          ) : null}
        </div>

        {canManageSharing && isSharePanelOpen ? (
          <div className="rounded-[24px] border border-[color:var(--accent-border-soft)] bg-[linear-gradient(180deg,var(--accent-soft-bg),var(--surface))] px-4 py-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--accent-text)]">
                  {shareEnabled ? 'Public link active' : 'Private analysis'}
                </p>
                <p className="mt-2 break-all text-sm leading-6 text-[var(--muted-strong)]">
                  {shareEnabled && sharePath ? sharePath : 'Enable sharing to create a public read-only link.'}
                </p>
                {shareError ? (
                  <p className="mt-2 text-sm text-[var(--danger)]">{shareError}</p>
                ) : shareMessage ? (
                  <p className="mt-2 text-sm text-[var(--success)]">{shareMessage}</p>
                ) : null}
              </div>
              <div className="flex flex-col gap-2 sm:flex-row lg:shrink-0">
                {shareEnabled ? (
                  <>
                    <button
                      className="inline-flex min-h-10 items-center justify-center rounded-full border border-[color:var(--border-color)] bg-[var(--surface-raised)] px-4 text-sm font-medium text-[var(--muted-strong)] transition hover:border-[color:var(--border-strong)] hover:text-[var(--foreground)]"
                      type="button"
                      onClick={() => {
                        void handleCopyShareLink();
                      }}
                    >
                      Copy link
                    </button>
                    <button
                      className="inline-flex min-h-10 items-center justify-center rounded-full border border-rose-500/20 bg-rose-500/10 px-4 text-sm font-medium text-rose-700 transition hover:border-rose-500/34 hover:bg-rose-500/16 disabled:cursor-not-allowed disabled:opacity-60 dark:text-rose-300"
                      disabled={isSharing}
                      type="button"
                      onClick={() => {
                        void handleDisableSharing();
                      }}
                    >
                      {isSharing ? 'Updating...' : 'Disable'}
                    </button>
                  </>
                ) : (
                  <button
                    className="inline-flex min-h-10 items-center justify-center rounded-full border border-[color:var(--accent-border-soft)] bg-[linear-gradient(135deg,var(--accent-gradient-start),var(--accent-gradient-mid)_60%,var(--accent-gradient-end))] px-4 text-sm font-medium text-[var(--accent-button-text)] shadow-[0_18px_38px_-24px_var(--accent-button-shadow)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                    disabled={isSharing}
                    type="button"
                    onClick={() => {
                      void handleEnableSharing();
                    }}
                  >
                    {isSharing ? 'Creating...' : 'Enable link'}
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : null}

        {screenshotUrl && !compact ? (
          <AnalysisCover
            screenshotUrl={screenshotUrl}
            screenshotCount={screenshotUrls.length}
            symbol={symbolLabel}
            placeholder
          />
        ) : !compact ? (
          <AnalysisCover
            screenshotUrl={screenshotUrl}
            screenshotCount={screenshotUrls.length}
            symbol={symbolLabel}
            placeholder
          />
        ) : null}

        {previewSections.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2">
            {previewSections.map((section) => (
              <div
                key={section.label}
                className={cx(
                  'rounded-[22px] border border-[color:var(--border-color)] bg-[var(--surface)] px-4 py-3.5',
                  compact && 'md:col-span-2',
                )}
              >
                <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--muted)]">
                  {section.label}
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--muted-strong)]">
                  {getPreviewText(section.value, compact ? 160 : 220)}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-[22px] border border-dashed border-[color:var(--border-color)] bg-[var(--surface)] px-4 py-3.5 text-sm text-[var(--muted)]">
            {getAnalysisPreview(analysis) === EMPTY_VALUE
              ? 'No analysis notes yet.'
              : getPreviewText(getAnalysisPreview(analysis), compact ? 160 : 220)}
          </div>
        )}

        {((onDelete && canManageAnalysisEntry) || hasScreenshotActions) &&
        (isDeleteConfirmOpen || actionError) ? (
          <div className="rounded-[22px] border border-rose-500/18 bg-[linear-gradient(180deg,rgba(127,29,29,0.08),var(--surface))] px-4 py-3.5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                {isDeleteConfirmOpen ? (
                  <>
                    <p className="text-sm font-medium text-[var(--foreground)]">
                      Delete this analysis?
                    </p>
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      This removes the thesis log from the active account journal.
                    </p>
                  </>
                ) : null}
                {actionError ? (
                  <p className="mt-2 text-sm text-[var(--danger)]">{actionError}</p>
                ) : null}
              </div>
              {isDeleteConfirmOpen ? (
                <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsDeleteConfirmOpen(false);
                    setActionError(null);
                  }}
                  className="inline-flex min-h-10 items-center rounded-full border border-[color:var(--border-color)] bg-[var(--surface-raised)] px-4 text-sm font-medium text-[var(--muted-strong)] transition hover:border-[color:var(--border-strong)] hover:text-[var(--foreground)]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => {
                    void handleDelete();
                  }}
                  className="inline-flex min-h-10 items-center rounded-full border border-[#7a1c30]/26 bg-[linear-gradient(135deg,#7a1c30,#541224)] px-4 text-sm font-medium text-white shadow-[0_20px_42px_-28px_rgba(122,28,48,0.52)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </motion.article>
  );
}
