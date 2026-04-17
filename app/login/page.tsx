import { ButtonLink } from '@/components/ui/button';
import LoginForm from '@/components/ui/login-form';
import PageShell from '@/components/ui/page-shell';
import { Panel } from '@/components/ui/panel';
import { Reveal } from '@/components/ui/reveal';

export default function LoginPage() {
  return (
    <PageShell>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_440px]">
        <Reveal>
          <Panel className="p-6 sm:p-8 lg:p-10">
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
              <div>
                <span className="inline-flex items-center rounded-full border border-[color:var(--accent-border-soft)] bg-[var(--accent-soft-bg)] px-3 py-1 font-mono text-[11px] uppercase tracking-[0.28em] text-[var(--accent-text)]">
                  one journal
                </span>
                <h1 className="text-balance mt-6 max-w-2xl text-4xl font-semibold tracking-tight text-[var(--foreground)] sm:text-5xl">
                  Access
                </h1>
                <p className="mt-5 max-w-md text-sm uppercase tracking-[0.3em] text-[var(--muted)]">
                  Secure workspace
                </p>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <ButtonLink href="/" variant="secondary" size="lg">
                    Home
                  </ButtonLink>
                  <ButtonLink href="/dashboard" variant="ghost" size="lg">
                    Dashboard
                  </ButtonLink>
                </div>
              </div>

              <div className="rounded-[30px] border border-[color:var(--border-color)] bg-[linear-gradient(180deg,var(--surface-raised),var(--surface))] p-5 shadow-[0_18px_34px_-28px_var(--shadow-color)]">
                <div className="grid gap-3">
                  <div className="h-20 rounded-[22px] border border-[color:var(--border-color)] bg-[radial-gradient(circle_at_top,var(--chart-accent-soft),transparent_64%),linear-gradient(180deg,var(--surface-raised),var(--surface))]" />
                  <div className="grid grid-cols-2 gap-3">
                    <div className="h-28 rounded-[22px] border border-[color:var(--border-color)] bg-[var(--surface-raised)]" />
                    <div className="h-28 rounded-[22px] border border-[color:var(--border-color)] bg-[linear-gradient(180deg,var(--surface-raised),var(--surface))]" />
                  </div>
                </div>
              </div>
            </div>
          </Panel>
        </Reveal>
        <LoginForm />
      </div>
    </PageShell>
  );
}
