'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

import AuthRequired from '@/components/ui/auth-required';
import { useAccounts } from '@/components/ui/accounts-provider';
import { useAuth } from '@/components/ui/auth-provider';
import { Button, ButtonLink } from '@/components/ui/button';
import { SwitchField } from '@/components/ui/form-fields';
import {
  getListViewModeLabel,
  LIST_VIEW_MODES,
  type ListViewMode,
  type ListViewTarget,
  useListViewPreferences,
} from '@/components/ui/list-view-preferences';
import PageShell from '@/components/ui/page-shell';
import { Panel, PanelHeader } from '@/components/ui/panel';
import { Reveal } from '@/components/ui/reveal';
import { useTheme } from '@/components/ui/theme-provider';
import { useTradePreferences } from '@/components/ui/trade-preferences-provider';
import {
  useWidgetPreferences,
  winRateVariantLabels,
} from '@/components/ui/widget-preferences';
import { WIN_RATE_WIDGET_VARIANTS } from '@/components/ui/win-rate-widget';
import {
  TRADE_FIELD_DEFINITIONS,
  TRADE_FIELD_SECTIONS,
} from '@/lib/trade-form-preferences';
import { cx } from '@/lib/utils';

type SettingsSection = {
  content: ReactNode;
  id: string;
  keywords: string;
  title: string;
};

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 20 20"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path
        d="m14.2 14.2 3.05 3.05M8.75 15.5a6.75 6.75 0 1 1 0-13.5 6.75 6.75 0 0 1 0 13.5Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SectionShell({
  children,
  eyebrow,
  title,
}: {
  children: ReactNode;
  eyebrow: string;
  title: string;
}) {
  return (
    <Panel className="overflow-hidden">
      <PanelHeader eyebrow={eyebrow} title={title} />
      <div className="px-6 pb-6 sm:px-8 sm:pb-8">{children}</div>
    </Panel>
  );
}

function SettingCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cx(
        'rounded-[24px] border border-[color:var(--border-color)] bg-[linear-gradient(180deg,var(--surface-raised),var(--surface))] p-4 shadow-[0_16px_36px_-30px_var(--shadow-color)]',
        className,
      )}
    >
      {children}
    </div>
  );
}

function ListViewSelector({
  label,
  mode,
  modes,
  onChange,
}: {
  label: string;
  mode: ListViewMode;
  modes?: readonly ListViewMode[];
  onChange: (mode: ListViewMode) => void;
}) {
  return (
    <SettingCard>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-medium text-[var(--foreground)]">{label}</p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {getListViewModeLabel(mode)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(modes ?? LIST_VIEW_MODES).map((item) => (
            <button
              key={item}
              className={cx(
                'rounded-full border px-3 py-2 text-sm font-medium transition',
                mode === item
                  ? 'border-[color:var(--accent-border-soft)] bg-[var(--accent-soft-bg)] text-[var(--accent-text)]'
                  : 'border-[color:var(--border-color)] bg-[var(--surface)] text-[var(--muted-strong)] hover:border-[color:var(--border-strong)] hover:text-[var(--foreground)]',
              )}
              type="button"
              onClick={() => onChange(item)}
            >
              {getListViewModeLabel(item)}
            </button>
          ))}
        </div>
      </div>
    </SettingCard>
  );
}

export default function SettingsView() {
  const { loading, user } = useAuth();
  const [settingsQuery, setSettingsQuery] = useState('');
  const { activeAccount } = useAccounts();
  const {
    accentColors,
    pnlVisualEmphasis,
    previewAccentColors,
    resetAccentColors,
    setAccentColors,
    setPnlVisualEmphasis,
    setTheme,
    theme,
  } = useTheme();
  const {
    preferences,
    ready,
    resetPreferences,
    setFieldPreference,
  } = useTradePreferences();
  const {
    preferences: listViewPreferences,
    resetListViewPreferences,
    setListViewMode,
  } = useListViewPreferences();
  const {
    preferences: widgetPreferences,
    resetWidgetPreferences,
    setDefaultWinRateVariant,
  } = useWidgetPreferences();
  const activeCount = TRADE_FIELD_DEFINITIONS.filter(
    (field) => field.key !== 'screenshot_url' && preferences[field.key],
  ).length;
  const normalizedSettingsQuery = settingsQuery.trim().toLowerCase();
  const accentColorSnapshot = `${accentColors.primary}|${accentColors.secondary}`;
  const [draftAccentColorState, setDraftAccentColorState] = useState(() => ({
    colors: accentColors,
    source: accentColorSnapshot,
  }));
  const draftAccentColors =
    draftAccentColorState.source === accentColorSnapshot
      ? draftAccentColorState.colors
      : accentColors;
  const accentSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (accentSaveTimerRef.current) {
        clearTimeout(accentSaveTimerRef.current);
      }
    },
    [],
  );

  function scheduleAccentColorSave(nextColors: typeof accentColors) {
    if (accentSaveTimerRef.current) {
      clearTimeout(accentSaveTimerRef.current);
    }

    accentSaveTimerRef.current = setTimeout(() => {
      setAccentColors(nextColors);
      accentSaveTimerRef.current = null;
    }, 240);
  }

  function handleAccentColorChange(
    colorKey: keyof typeof accentColors,
    value: string,
  ) {
    const nextColors = {
      ...draftAccentColors,
      [colorKey]: value,
    };

    setDraftAccentColorState({
      colors: nextColors,
      source: accentColorSnapshot,
    });
    previewAccentColors(nextColors);
    scheduleAccentColorSave(nextColors);
  }

  function commitDraftAccentColors() {
    if (accentSaveTimerRef.current) {
      clearTimeout(accentSaveTimerRef.current);
      accentSaveTimerRef.current = null;
    }

    setAccentColors(draftAccentColors);
  }

  function handleResetAccentColors() {
    if (accentSaveTimerRef.current) {
      clearTimeout(accentSaveTimerRef.current);
      accentSaveTimerRef.current = null;
    }

    resetAccentColors();
  }

  const sections: SettingsSection[] = [
      {
        id: 'appearance',
        keywords: 'appearance colors color picker primary secondary dark light theme pnl visual emphasis',
        title: 'Appearance',
        content: (
          <SectionShell eyebrow="appearance" title="Appearance">
            <div className="grid gap-4 lg:grid-cols-2">
              <SettingCard>
                <p className="text-sm font-medium text-[var(--foreground)]">
                  Theme mode
                </p>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  Current mode: {theme === 'dark' ? 'Dark' : 'Light'}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {(['dark', 'light'] as const).map((item) => (
                    <button
                      key={item}
                      className={cx(
                        'rounded-full border px-4 py-2 text-sm font-medium capitalize transition',
                        theme === item
                          ? 'border-[color:var(--accent-border-soft)] bg-[var(--accent-soft-bg)] text-[var(--accent-text)]'
                          : 'border-[color:var(--border-color)] bg-[var(--surface)] text-[var(--muted-strong)] hover:border-[color:var(--border-strong)] hover:text-[var(--foreground)]',
                      )}
                      type="button"
                      onClick={() => setTheme(item)}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </SettingCard>

              <SwitchField
                checked={pnlVisualEmphasis}
                label="PnL visual emphasis"
                description={
                  pnlVisualEmphasis
                    ? 'Profit and loss widgets use stronger glow and tone.'
                    : 'Profit and loss widgets stay visually calmer.'
                }
                onCheckedChange={setPnlVisualEmphasis}
              />

              <SettingCard className="lg:col-span-2">
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_240px]">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-[var(--foreground)]">
                          Accent colors
                        </p>
                        <p className="mt-1 text-sm text-[var(--muted)]">
                          Primary drives actions. Secondary supports glow and gradients.
                        </p>
                      </div>
                      <Button
                        size="sm"
                        type="button"
                        variant="ghost"
                        onClick={handleResetAccentColors}
                      >
                        Reset
                      </Button>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <label className="flex items-center justify-between gap-4 rounded-[18px] border border-[color:var(--border-color)] bg-[var(--surface)] px-3 py-3">
                        <span>
                          <span className="block text-sm font-medium text-[var(--foreground)]">
                            Primary color
                          </span>
                          <span className="mt-1 block font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--muted)]">
                            {draftAccentColors.primary}
                          </span>
                        </span>
                        <input
                          aria-label="Primary accent color"
                          className="h-11 w-14 cursor-pointer rounded-[14px] border border-[color:var(--border-color)] bg-transparent p-1"
                          type="color"
                          value={draftAccentColors.primary}
                          onBlur={commitDraftAccentColors}
                          onChange={(event) =>
                            handleAccentColorChange('primary', event.target.value)
                          }
                          onPointerUp={commitDraftAccentColors}
                        />
                      </label>

                      <label className="flex items-center justify-between gap-4 rounded-[18px] border border-[color:var(--border-color)] bg-[var(--surface)] px-3 py-3">
                        <span>
                          <span className="block text-sm font-medium text-[var(--foreground)]">
                            Secondary color
                          </span>
                          <span className="mt-1 block font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--muted)]">
                            {draftAccentColors.secondary}
                          </span>
                        </span>
                        <input
                          aria-label="Secondary accent color"
                          className="h-11 w-14 cursor-pointer rounded-[14px] border border-[color:var(--border-color)] bg-transparent p-1"
                          type="color"
                          value={draftAccentColors.secondary}
                          onBlur={commitDraftAccentColors}
                          onChange={(event) =>
                            handleAccentColorChange('secondary', event.target.value)
                          }
                          onPointerUp={commitDraftAccentColors}
                        />
                      </label>
                    </div>
                  </div>

                  <div
                    aria-hidden="true"
                    className="relative min-h-[168px] overflow-hidden rounded-[22px] border border-[color:var(--accent-border-soft)] bg-[linear-gradient(135deg,var(--accent-gradient-start),var(--accent-gradient-mid)_60%,var(--accent-gradient-end))] p-4 shadow-[0_18px_42px_-28px_var(--accent-button-shadow)]"
                  >
                    <div className="absolute inset-[-20%] bg-[radial-gradient(circle_at_top_right,var(--accent-secondary-glow),transparent_58%)] blur-2xl" />
                    <div className="relative flex h-full flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <span className="h-8 w-8 rounded-full border border-white/30 bg-[var(--accent-primary)]" />
                        <span className="h-8 w-8 rounded-full border border-white/30 bg-[var(--accent-secondary)]" />
                      </div>
                      <div>
                        <div className="h-2 rounded-full bg-white/28">
                          <div className="h-full w-2/3 rounded-full bg-white/80" />
                        </div>
                        <p className="mt-4 text-sm font-medium text-[var(--accent-button-text)]">
                          Preview
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </SettingCard>
            </div>
          </SectionShell>
        ),
      },
      {
        id: 'navigation',
        keywords: 'navigation nav topbar menu sidebar list lists compact cards stacked preview timeline trades analyses accounts',
        title: 'Navigation & Lists',
        content: (
          <SectionShell eyebrow="navigation" title="Navigation & Lists">
            <div className="grid gap-4">
              <SettingCard>
                <p className="text-sm font-medium text-[var(--foreground)]">
                  Navigation
                </p>
                <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                  Topbar uses primary pages and a More menu for secondary destinations.
                </p>
              </SettingCard>

              {([
                ['trades', 'Trade list view'],
                ['analyses', 'Analysis list view'],
                ['accounts', 'Account list view'],
              ] as Array<[ListViewTarget, string]>).map(([target, label]) => (
                <ListViewSelector
                  key={target}
                  label={label}
                  modes={
                    target === 'trades'
                      ? LIST_VIEW_MODES
                      : LIST_VIEW_MODES.filter((mode) => mode !== 'calendar')
                  }
                  mode={listViewPreferences[target]}
                  onChange={(mode) => setListViewMode(target, mode)}
                />
              ))}

              <div>
                <Button
                  size="md"
                  type="button"
                  variant="secondary"
                  onClick={resetListViewPreferences}
                >
                  Reset list views
                </Button>
              </div>
            </div>
          </SectionShell>
        ),
      },
      {
        id: 'trade-form',
        keywords: `account trade form columns fields ${TRADE_FIELD_DEFINITIONS.map((field) => field.label).join(' ')}`,
        title: 'Account Fields',
        content: (
          <SectionShell eyebrow="account settings" title="Account field settings">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-[var(--foreground)]">
                  Trade fields for this account
                </p>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  {activeAccount?.name ?? 'No active account'} - {activeCount} visible fields.{' '}
                  {ready ? 'Saved on the account.' : 'Loading preferences.'}
                </p>
              </div>
              <Button
                size="md"
                type="button"
                variant="secondary"
                disabled={!activeAccount?.canManageAccount}
                onClick={resetPreferences}
              >
                Reset fields
              </Button>
            </div>

            <div className="grid gap-6">
              {TRADE_FIELD_SECTIONS.map((section) => (
                <div key={section.key} className="space-y-4">
                  <div>
                    <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[var(--muted)]">
                      {section.label}
                    </p>
                    <p className="mt-2 text-sm text-[var(--muted)]">
                      {section.description}
                    </p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    {TRADE_FIELD_DEFINITIONS.filter(
                      (field) =>
                        field.section === section.key &&
                        field.key !== 'screenshot_url',
                    ).map((field) => (
                      <SwitchField
                        key={field.key}
                        checked={preferences[field.key]}
                        description={`${field.description} ${field.requiredWhenVisible ? 'Required when visible.' : 'Optional.'}`}
                        disabled={!activeAccount?.canManageAccount}
                        label={field.label}
                        onCheckedChange={(checked) =>
                          setFieldPreference(field.key, checked)
                        }
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </SectionShell>
        ),
      },
      {
        id: 'analytics',
        keywords: 'home analytics metrics layout widgets find metrics modify layout density winrate radial compact style',
        title: 'Home & Analytics',
        content: (
          <SectionShell eyebrow="layouts" title="Home & Analytics">
            <div className="grid gap-4 md:grid-cols-2">
              <SettingCard>
                <p className="text-sm font-medium text-[var(--foreground)]">
                  Home layout
                </p>
                <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                  Home widgets are customized directly from Home with Find Widgets and Modify Layout.
                </p>
                <div className="mt-4">
                  <ButtonLink href="/" size="md" variant="secondary">
                    Open Home
                  </ButtonLink>
                </div>
              </SettingCard>
              <SettingCard>
                <p className="text-sm font-medium text-[var(--foreground)]">
                  Analytics layout
                </p>
                <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                  Metrics and widget order are customized from the Analytics page.
                </p>
                <div className="mt-4">
                  <ButtonLink href="/analytics" size="md" variant="secondary">
                    Open Analytics
                  </ButtonLink>
                </div>
              </SettingCard>
              <SettingCard className="md:col-span-2">
                <p className="text-sm font-medium text-[var(--foreground)]">
                  Default Win Rate style
                </p>
                <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                  Used when a new Win Rate widget is added before a layout-specific style is saved.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {WIN_RATE_WIDGET_VARIANTS.map((variant) => (
                    <button
                      key={variant}
                      className={cx(
                        'rounded-full border px-4 py-2 text-sm font-medium transition',
                        widgetPreferences.defaultWinRateVariant === variant
                          ? 'border-[color:var(--accent-border-soft)] bg-[var(--accent-soft-bg)] text-[var(--accent-text)]'
                          : 'border-[color:var(--border-color)] bg-[var(--surface)] text-[var(--muted-strong)] hover:border-[color:var(--border-strong)] hover:text-[var(--foreground)]',
                      )}
                      type="button"
                      onClick={() => setDefaultWinRateVariant(variant)}
                    >
                      {winRateVariantLabels[variant]}
                    </button>
                  ))}
                </div>
                <div className="mt-4">
                  <Button
                    size="md"
                    type="button"
                    variant="secondary"
                    onClick={resetWidgetPreferences}
                  >
                    Reset widget defaults
                  </Button>
                </div>
              </SettingCard>
            </div>
          </SectionShell>
        ),
      },
      {
        id: 'profile',
        keywords: 'profile username display name privacy email public author',
        title: 'Profile',
        content: (
          <SectionShell eyebrow="profile" title="Profile">
            <div className="grid gap-4 md:grid-cols-2">
              <SettingCard>
                <p className="text-sm font-medium text-[var(--foreground)]">
                  Public identity
                </p>
                <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                  Username/display name are used in shared analysis views. Email stays on Profile only.
                </p>
                <div className="mt-4">
                  <ButtonLink href="/profile" size="md" variant="primary">
                    Edit Profile
                  </ButtonLink>
                </div>
              </SettingCard>
              <SettingCard>
                <p className="text-sm font-medium text-[var(--foreground)]">
                  Privacy
                </p>
                <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                  The main navigation avoids showing full email addresses.
                </p>
              </SettingCard>
            </div>
          </SectionShell>
        ),
      },
    ];

  const visibleSections = normalizedSettingsQuery
    ? sections.filter((section) =>
        `${section.title} ${section.keywords}`.toLowerCase().includes(
          normalizedSettingsQuery,
        ),
      )
    : sections;

  if (loading) {
    return (
      <PageShell>
        <Panel className="p-6 sm:p-8">
          <p className="text-sm text-[var(--muted)]">Loading session...</p>
        </Panel>
      </PageShell>
    );
  }

  if (!user) {
    return (
      <PageShell>
        <AuthRequired
          description="Sign in to edit the workspace."
          title="Settings locked"
        />
      </PageShell>
    );
  }

  return (
    <PageShell size="wide">
      <div className="space-y-6">
        <Reveal>
          <Panel className="overflow-hidden">
            <PanelHeader
              action={
                <div className="flex flex-col gap-3 sm:flex-row">
                  <ButtonLink href="/profile" size="lg" variant="secondary">
                    Profile
                  </ButtonLink>
                  <ButtonLink href="/analytics" size="lg" variant="primary">
                    Analytics
                  </ButtonLink>
                </div>
              }
              description="Search settings or jump into a focused category."
              eyebrow="settings"
              title="Workspace settings"
            />
            <div className="px-6 pb-6 sm:px-8 sm:pb-8">
              <label className="block">
                <span className="sr-only">Search settings</span>
                <div className="relative">
                  <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
                  <input
                    className="min-h-12 w-full rounded-full border border-[color:var(--border-color)] bg-[var(--surface)] py-3 pl-11 pr-4 text-sm text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted)] focus:border-[color:var(--accent-border-strong)] focus:ring-2 focus:ring-[color:var(--accent-focus-ring)]"
                    placeholder="Search colors, lists, home layout, analytics, trade fields..."
                    type="search"
                    value={settingsQuery}
                    onChange={(event) => setSettingsQuery(event.target.value)}
                  />
                </div>
              </label>
            </div>
          </Panel>
        </Reveal>

        <div className="grid gap-6 xl:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="hidden xl:block">
            <Panel className="sticky top-32 p-4">
              <nav className="grid gap-2">
                {sections.map((section) => {
                  const isVisible = visibleSections.some(
                    (visibleSection) => visibleSection.id === section.id,
                  );

                  return (
                    <a
                      key={section.id}
                      className={cx(
                        'rounded-full border px-4 py-2.5 text-sm font-medium transition',
                        isVisible
                          ? 'border-[color:var(--border-color)] bg-[var(--surface)] text-[var(--muted-strong)] hover:border-[color:var(--accent-border-soft)] hover:text-[var(--foreground)]'
                          : 'border-transparent text-[var(--muted)] opacity-50',
                      )}
                      href={`#${section.id}`}
                    >
                      {section.title}
                    </a>
                  );
                })}
              </nav>
            </Panel>
          </aside>

          <div className="space-y-6">
            {visibleSections.length > 0 ? (
              visibleSections.map((section, index) => (
                <Reveal key={section.id} delay={index * 0.03}>
                  <div id={section.id}>{section.content}</div>
                </Reveal>
              ))
            ) : (
              <Panel className="p-6 sm:p-8">
                <p className="text-sm text-[var(--muted)]">
                  No settings match this search.
                </p>
              </Panel>
            )}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
