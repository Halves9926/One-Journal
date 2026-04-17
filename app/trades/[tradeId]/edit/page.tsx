import NewTradeForm from '@/components/ui/new-trade-form';

export default async function EditTradePage({
  params,
}: {
  params: Promise<{ tradeId: string }>;
}) {
  const { tradeId } = await params;

  return <NewTradeForm mode="edit" tradeId={tradeId} />;
}
