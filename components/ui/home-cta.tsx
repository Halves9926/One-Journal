'use client';

import { ButtonLink } from '@/components/ui/button';
import { useAuth } from '@/components/ui/auth-provider';

export default function HomeCta() {
  const { loading, user } = useAuth();

  if (loading) {
    return (
      <p className="text-sm text-neutral-400">Checking session...</p>
    );
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <ButtonLink
        href={user ? '/dashboard' : '/dashboard'}
        size="lg"
        variant="primary"
      >
        Open Dashboard
      </ButtonLink>
      <ButtonLink
        href={user ? '/trades/new' : '/trades/new'}
        size="lg"
        variant="secondary"
      >
        New Trade
      </ButtonLink>
      <p className="text-sm text-neutral-400 sm:ml-2">
        {user ? 'Session ready' : 'Secure access'}
      </p>
    </div>
  );
}
