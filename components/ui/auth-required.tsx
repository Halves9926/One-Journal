import { ButtonLink } from '@/components/ui/button';
import { Panel } from '@/components/ui/panel';

type AuthRequiredProps = {
  title: string;
  description: string;
};

export default function AuthRequired({
  title,
  description,
}: AuthRequiredProps) {
  return (
    <Panel className="mx-auto max-w-2xl p-6 text-center sm:p-8 animate-rise">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[24px] border border-rose-200 bg-[linear-gradient(135deg,#9f1239,#7f1d1d)] text-sm font-semibold text-white shadow-[0_18px_30px_-22px_rgba(127,29,29,0.32)]">
        OJ
      </div>
      <h1 className="mt-6 text-3xl font-semibold tracking-tight text-[var(--foreground)]">
        {title}
      </h1>
      <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-[var(--muted)]">
        {description}
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <ButtonLink
          href="/login"
          size="lg"
          variant="primary"
        >
          Login
        </ButtonLink>
        <ButtonLink
          href="/"
          size="lg"
          variant="secondary"
        >
          Home
        </ButtonLink>
      </div>
    </Panel>
  );
}
