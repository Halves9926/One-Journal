'use client';

import AuthRequired from '@/components/ui/auth-required';
import { useAuth } from '@/components/ui/auth-provider';
import { Button, ButtonLink } from '@/components/ui/button';
import { CheckboxField } from '@/components/ui/form-fields';
import PageShell from '@/components/ui/page-shell';
import { Panel, PanelHeader } from '@/components/ui/panel';
import { Reveal } from '@/components/ui/reveal';
import { useTheme } from '@/components/ui/theme-provider';
import { useTradePreferences } from '@/components/ui/trade-preferences-provider';
import {
  TRADE_FIELD_DEFINITIONS,
  TRADE_FIELD_SECTIONS,
} from '@/lib/trade-form-preferences';

const accentOptions = [
  {
    label: 'Red accent',
    theme: 'red' as const,
    swatchClassName: 'bg-[linear-gradient(135deg,#c35b6d,#6c1f45)]',
  },
  {
    label: 'White accent',
    theme: 'white' as const,
    swatchClassName: 'bg-[linear-gradient(135deg,#fff8f0,#c8c0b6)]',
  },
  {
    label: 'Pink accent',
    theme: 'pink' as const,
    swatchClassName: 'bg-[linear-gradient(135deg,#ef86b8,#9f245d)]',
  },
];

export default function SettingsView() {
  const { loading, user } = useAuth();
  const { accentTheme, theme, setAccentTheme } = useTheme();
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
                          <CheckboxField
                            key={field.key}
                            checked={preferences[field.key]}
                            label={field.label}
                            description={`${field.description} ${field.requiredWhenVisible ? 'Required when visible.' : 'Optional.'}`}
                            onChange={(event) =>
                              setFieldPreference(field.key, event.target.checked)
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
                <div className="grid gap-3">
                  {accentOptions.map((option) => {
                    const isActive = accentTheme === option.theme;

                    return (
                      <button
                        key={option.theme}
                        type="button"
                        onClick={() => setAccentTheme(option.theme)}
                        className={`flex items-center justify-between gap-3 rounded-[22px] border px-4 py-3.5 text-left transition duration-300 ${
                          isActive
                            ? 'border-[color:var(--accent-border-strong)] bg-[var(--accent-soft-bg)] shadow-[0_18px_36px_-28px_var(--shadow-color)]'
                            : 'border-[color:var(--border-color)] bg-[var(--surface-raised)] hover:border-[color:var(--border-strong)]'
                        }`}
                      >
                        <span className="flex items-center gap-3">
                          <span
                            className={`h-3.5 w-3.5 rounded-full shadow-[0_0_0_6px_rgba(255,255,255,0.03)] ${option.swatchClassName}`}
                          />
                          <span>
                            <span className="block text-sm font-medium text-[var(--foreground)]">
                              {option.label}
                            </span>
                            <span className="mt-1 block text-xs uppercase tracking-[0.24em] text-[var(--muted)]">
                              accent theme
                            </span>
                          </span>
                        </span>
                        {isActive ? (
                          <span className="text-xs uppercase tracking-[0.22em] text-[var(--accent-text)]">
                            Active
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
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
