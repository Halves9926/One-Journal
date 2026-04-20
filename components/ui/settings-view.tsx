'use client';

import AuthRequired from '@/components/ui/auth-required';
import { useAuth } from '@/components/ui/auth-provider';
import { Button, ButtonLink } from '@/components/ui/button';
import { SwitchField } from '@/components/ui/form-fields';
import PageShell from '@/components/ui/page-shell';
import { Panel, PanelHeader } from '@/components/ui/panel';
import { Reveal } from '@/components/ui/reveal';
import { useTheme } from '@/components/ui/theme-provider';
import { useTradePreferences } from '@/components/ui/trade-preferences-provider';
import {
  TRADE_FIELD_DEFINITIONS,
  TRADE_FIELD_SECTIONS,
} from '@/lib/trade-form-preferences';

export default function SettingsView() {
  const { loading, user } = useAuth();
  const {
    accentColors,
    pnlVisualEmphasis,
    resetAccentColors,
    setPnlVisualEmphasis,
    setPrimaryAccentColor,
    setSecondaryAccentColor,
    theme,
  } = useTheme();
  const {
    preferences,
    ready,
    resetPreferences,
    setFieldPreference,
  } = useTradePreferences();

  const activeCount = Object.values(preferences).filter(Boolean).length;

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
          title="Settings locked"
          description="Sign in to edit the workspace."
        />
      </PageShell>
    );
  }

  return (
    <PageShell size="wide">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <Reveal>
            <Panel className="overflow-hidden">
              <PanelHeader
                eyebrow="settings"
                title="Columns"
                description="Toggle fields for New Trade."
                action={
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <ButtonLink href="/trades/new" variant="primary" size="lg">
                      New Trade
                    </ButtonLink>
                    <Button
                      type="button"
                      variant="secondary"
                      size="lg"
                      onClick={resetPreferences}
                    >
                      Reset
                    </Button>
                  </div>
                }
              />

              <div className="grid gap-6 px-6 pb-6 sm:px-8 sm:pb-8">
                {TRADE_FIELD_SECTIONS.map((section, sectionIndex) => (
                  <Reveal key={section.key} delay={sectionIndex * 0.05}>
                    <div className="space-y-4">
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
                          (field) => field.section === section.key,
                        ).map((field) => (
                          <SwitchField
                            key={field.key}
                            checked={preferences[field.key]}
                            label={field.label}
                            description={`${field.description} ${field.requiredWhenVisible ? 'Required when visible.' : 'Optional.'}`}
                            onCheckedChange={(checked) =>
                              setFieldPreference(field.key, checked)
                            }
                          />
                        ))}
                      </div>
                    </div>
                  </Reveal>
                ))}
              </div>
            </Panel>
          </Reveal>
        </div>

        <div className="space-y-6 xl:sticky xl:top-32 xl:self-start">
          <Reveal delay={0.08}>
            <Panel className="p-6">
              <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[var(--muted)]">
                Appearance
              </p>
              <div className="mt-4 space-y-3">
                <div className="rounded-[22px] border border-[color:var(--border-color)] bg-[var(--surface-raised)] p-4 shadow-[0_14px_28px_-24px_var(--shadow-color)]">
                  <p className="text-sm text-[var(--muted)]">Mode</p>
                  <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">
                    {theme === 'dark' ? 'Dark theme' : 'Light theme'}
                  </p>
                </div>
                <SwitchField
                  checked={pnlVisualEmphasis}
                  label="PnL visual emphasis"
                  description={
                    pnlVisualEmphasis
                      ? 'Premium green/red emphasis with glow across PnL cards, badges and tooltips.'
                      : 'More neutral PnL presentation for a calmer trading workspace.'
                  }
                  onCheckedChange={setPnlVisualEmphasis}
                />
                <div className="space-y-3 rounded-[24px] border border-[color:var(--border-color)] bg-[var(--surface-raised)] p-4 shadow-[0_14px_28px_-24px_var(--shadow-color)]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-[var(--foreground)]">
                        Colors
                      </p>
                      <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                        Primary drives actions. Secondary stays subtle.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={resetAccentColors}
                    >
                      Reset
                    </Button>
                  </div>

                  <div
                    className="relative overflow-hidden rounded-[20px] border border-[color:var(--accent-border-soft)] bg-[linear-gradient(135deg,var(--accent-gradient-start),var(--accent-gradient-mid)_60%,var(--accent-gradient-end))] p-4 shadow-[0_18px_42px_-28px_var(--accent-button-shadow)]"
                    aria-hidden="true"
                  >
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,var(--accent-secondary-glow),transparent_58%)]" />
                    <div className="relative flex items-center justify-between gap-3">
                      <span className="h-8 w-8 rounded-full border border-white/30 bg-[var(--accent-primary)] shadow-[0_12px_24px_-18px_rgba(0,0,0,0.5)]" />
                      <span className="h-8 w-8 rounded-full border border-white/30 bg-[var(--accent-secondary)] shadow-[0_12px_24px_-18px_rgba(0,0,0,0.5)]" />
                    </div>
                    <div className="relative mt-5 h-2 rounded-full bg-white/28">
                      <div className="h-full w-2/3 rounded-full bg-white/80" />
                    </div>
                  </div>

                  <label className="flex items-center justify-between gap-4 rounded-[18px] border border-[color:var(--border-color)] bg-[var(--surface)] px-3 py-3">
                    <span>
                      <span className="block text-sm font-medium text-[var(--foreground)]">
                        Primary accent color
                      </span>
                      <span className="mt-1 block font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--muted)]">
                        {accentColors.primary}
                      </span>
                    </span>
                    <input
                      type="color"
                      value={accentColors.primary}
                      onChange={(event) =>
                        setPrimaryAccentColor(event.target.value)
                      }
                      className="h-11 w-14 cursor-pointer rounded-[14px] border border-[color:var(--border-color)] bg-transparent p-1"
                      aria-label="Primary accent color"
                    />
                  </label>

                  <label className="flex items-center justify-between gap-4 rounded-[18px] border border-[color:var(--border-color)] bg-[var(--surface)] px-3 py-3">
                    <span>
                      <span className="block text-sm font-medium text-[var(--foreground)]">
                        Secondary accent color
                      </span>
                      <span className="mt-1 block font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--muted)]">
                        {accentColors.secondary}
                      </span>
                    </span>
                    <input
                      type="color"
                      value={accentColors.secondary}
                      onChange={(event) =>
                        setSecondaryAccentColor(event.target.value)
                      }
                      className="h-11 w-14 cursor-pointer rounded-[14px] border border-[color:var(--border-color)] bg-transparent p-1"
                      aria-label="Secondary accent color"
                    />
                  </label>
                </div>
              </div>
            </Panel>
          </Reveal>

          <Reveal delay={0.12}>
            <Panel className="p-6">
              <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[var(--muted)]">
                Active
              </p>
              <p className="mt-4 text-4xl font-semibold tracking-tight text-[var(--foreground)]">
                {activeCount}
              </p>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Visible fields in New Trade.
              </p>
            </Panel>
          </Reveal>

          <Reveal delay={0.16}>
            <Panel className="p-6">
              <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[var(--muted)]">
                Sync
              </p>
              <div className="mt-4 space-y-3">
                <div className="rounded-[22px] border border-[color:var(--border-color)] bg-[var(--surface-raised)] p-4 shadow-[0_14px_28px_-24px_var(--shadow-color)]">
                  <p className="text-sm text-[var(--muted)]">Storage</p>
                  <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">
                    {ready ? 'Device saved' : 'Loading'}
                  </p>
                </div>
                <div className="rounded-[22px] border border-[color:var(--border-color)] bg-[var(--surface-raised)] p-4 shadow-[0_14px_28px_-24px_var(--shadow-color)]">
                  <p className="text-sm text-[var(--muted)]">Route</p>
                  <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">
                    /trades/new
                  </p>
                </div>
              </div>
            </Panel>
          </Reveal>

          <Reveal delay={0.2}>
            <Panel className="p-6">
              <div className="flex flex-col gap-3">
                <ButtonLink href="/dashboard" variant="secondary" size="lg">
                  Dashboard
                </ButtonLink>
                <ButtonLink href="/trades/new" variant="primary" size="lg">
                  Open Form
                </ButtonLink>
              </div>
            </Panel>
          </Reveal>
        </div>
      </div>
    </PageShell>
  );
}
