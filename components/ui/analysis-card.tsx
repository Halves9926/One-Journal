'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';

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
  screenshotUrl,
  symbol,
}: {
  screenshotUrl: string | null;
  symbol: string;
}) {
  const [imageFailed, setImageFailed] = useState(false);

  if (!screenshotUrl || imageFailed) {
    return null;
  }

  return (
    <a
      href={screenshotUrl}
      target="_blank"
      rel="noreferrer"
      className="group/cover relative block overflow-hidden rounded-[24px] border border-[color:var(--border-color)] bg-[var(--surface)] shadow-[0_22px_48px_-34px_var(--shadow-color)] transition duration-300 lg:hover:border-[color:var(--border-strong)]"
    >
      <div className="aspect-[16/9] overflow-hidden bg-[radial-gradient(circle_at_top,var(--accent-primary-glow),transparent_54%),linear-gradient(180deg,var(--surface-strong),var(--surface))]">
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
        Analysis screenshot
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
}: AnalysisCardProps) {
  const { supabase, user } = useAuth();
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isSharePanelOpen, setIsSharePanelOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const [shareOverride, setShareOverride] = useState<{
    enabled: boolean;
    token: string | null;
  } | null>(null);
  const symbolLabel = analysis.symbol ?? 'Account thesis';
  const shareEnabled = shareOverride?.enabled ?? analysis.shareEnabled;
  const shareToken = shareOverride?.token ?? analysis.shareToken;
  const sharePath = shareToken ? buildAnalysisSharePath(shareToken) : null;
  const canManageSharing = Boolean(
    supabase && user && analysis.userId === user.id,
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
      .eq('id', analysis.id)
      .eq('user_id', user.id);

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
      .eq('id', analysis.id)
      .eq('user_id', user.id);

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

          {editHref || onDelete || canManageSharing ? (
            <div className="flex items-center gap-2 self-start md:self-end">
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
              {editHref ? (
                <Link
                  href={editHref}
                  className="inline-flex min-h-9 items-center rounded-full border border-[color:var(--border-color)] bg-[var(--surface)] px-3 text-xs font-medium text-[var(--muted-strong)] transition hover:border-[color:var(--border-strong)] hover:text-[var(--foreground)]"
                >
                  Edit
                </Link>
              ) : null}
              {onDelete ? (
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

        {analysis.screenshotUrl && !compact ? (
          <AnalysisCover
            screenshotUrl={analysis.screenshotUrl}
            symbol={symbolLabel}
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

        {onDelete && (isDeleteConfirmOpen || actionError) ? (
          <div className="rounded-[22px] border border-rose-500/18 bg-[linear-gradient(180deg,rgba(127,29,29,0.08),var(--surface))] px-4 py-3.5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-[var(--foreground)]">
                  Delete this analysis?
                </p>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  This removes the thesis log from the active account journal.
                </p>
                {actionError ? (
                  <p className="mt-2 text-sm text-[var(--danger)]">{actionError}</p>
                ) : null}
              </div>
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
            </div>
          </div>
        ) : null}
      </div>
    </motion.article>
  );
}
