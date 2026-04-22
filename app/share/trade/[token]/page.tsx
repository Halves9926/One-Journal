import PublicSharedTradeView from '@/components/ui/public-shared-trade-view';

export default async function SharedTradePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return <PublicSharedTradeView token={token} />;
}
