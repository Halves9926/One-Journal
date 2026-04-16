import { ButtonLink } from '@/components/ui/button';
import HomeCta from '@/components/ui/home-cta';
import PageShell from '@/components/ui/page-shell';
import { MetricCard, Panel } from '@/components/ui/panel';
import { Reveal } from '@/components/ui/reveal';

export default function HomePage() {
  return (
    <PageShell size="wide">
      <div className="space-y-6">
        <Reveal>
          <Panel className="px-6 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12">
            <div className="grid gap-8 xl:grid-cols-[minmax(0,1.05fr)_380px] xl:items-end">
              <div className="max-w-3xl">
                <span className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.32em] text-rose-700">
                  one journal
                </span>
                <h1 className="text-balance mt-6 text-5xl font-semibold tracking-[-0.04em] text-neutral-950 sm:text-6xl lg:text-7xl">
                  One Journal
                </h1>
                <p className="mt-5 max-w-lg text-sm uppercase tracking-[0.34em] text-neutral-500 sm:text-[13px]">
                  Execution. Review. Edge.
                </p>
                <div className="mt-8">
                  <HomeCta />
                </div>
              </div>

              <div className="grid gap-4">
                <MetricCard label="Surface" value="Workspace" tone="accent" />
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                  <div className="rounded-[28px] border border-neutral-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(250,249,247,0.94))] p-5 shadow-[0_18px_36px_-30px_rgba(15,23,42,0.15)]">
                    <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-neutral-500">
                      Mode
                    </p>
                    <p className="mt-3 text-2xl font-semibold tracking-tight text-neutral-950">
                      Ready
                    </p>
                  </div>
                  <div className="rounded-[28px] border border-neutral-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(250,249,247,0.94))] p-5 shadow-[0_18px_36px_-30px_rgba(15,23,42,0.15)]">
                    <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-neutral-500">
                      Preview
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs text-neutral-700">
                        Stats
                      </span>
                      <span className="rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs text-neutral-700">
                        Charts
                      </span>
                      <span className="rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs text-neutral-700">
                        Capture
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Panel>
        </Reveal>

        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr_0.8fr]">
          <Reveal delay={0.04}>
            <Panel className="px-6 py-6 sm:px-8">
              <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-neutral-500">
                Workspace
              </p>
              <div className="mt-5 h-44 rounded-[28px] border border-neutral-200 bg-[linear-gradient(180deg,#ffffff,#f8f5f1)] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_20px_40px_-34px_rgba(15,23,42,0.16)]">
                <div className="grid h-full grid-cols-12 gap-2">
                  <div className="col-span-8 rounded-[22px] border border-neutral-200 bg-[radial-gradient(circle_at_top,rgba(190,24,93,0.18),transparent_62%),linear-gradient(180deg,#fffefe,#f3efeb)] shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]" />
                  <div className="col-span-4 space-y-2">
                    <div className="h-[48%] rounded-[20px] border border-neutral-200 bg-white shadow-[0_14px_24px_-20px_rgba(15,23,42,0.15)]" />
                    <div className="h-[48%] rounded-[20px] border border-neutral-200 bg-[linear-gradient(180deg,#fff,#f8f5f2)] shadow-[0_14px_24px_-20px_rgba(15,23,42,0.15)]" />
                  </div>
                </div>
              </div>
            </Panel>
          </Reveal>

          <Reveal delay={0.08}>
            <Panel className="p-6">
              <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-neutral-500">
                Dashboard
              </p>
              <h2 className="mt-4 text-2xl font-semibold tracking-tight text-neutral-950">
                Rich metrics
              </h2>
            </Panel>
          </Reveal>

          <Reveal delay={0.12}>
            <Panel className="flex flex-col justify-between p-6">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-neutral-500">
                  Capture
                </p>
                <h2 className="mt-4 text-2xl font-semibold tracking-tight text-neutral-950">
                  Fast trade flow
                </h2>
              </div>
              <ButtonLink href="/settings" size="md" variant="secondary" className="mt-6 w-full">
                Settings
              </ButtonLink>
            </Panel>
          </Reveal>
        </div>
      </div>
    </PageShell>
  );
}
