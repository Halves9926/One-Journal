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
                <span className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.28em] text-rose-700">
                  one journal
                </span>
                <h1 className="text-balance mt-6 max-w-2xl text-4xl font-semibold tracking-tight text-neutral-950 sm:text-5xl">
                  Access
                </h1>
                <p className="mt-5 max-w-md text-sm uppercase tracking-[0.3em] text-neutral-400">
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

              <div className="rounded-[30px] border border-neutral-200 bg-[linear-gradient(180deg,#fff,#f7f3ef)] p-5 shadow-[0_18px_34px_-28px_rgba(15,23,42,0.14)]">
                <div className="grid gap-3">
                  <div className="h-20 rounded-[22px] border border-neutral-200 bg-[radial-gradient(circle_at_top,rgba(190,24,93,0.18),transparent_64%),linear-gradient(180deg,#ffffff,#f7f2ef)]" />
                  <div className="grid grid-cols-2 gap-3">
                    <div className="h-28 rounded-[22px] border border-neutral-200 bg-white" />
                    <div className="h-28 rounded-[22px] border border-neutral-200 bg-[linear-gradient(180deg,#fff,#f7f3ef)]" />
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
