import NewAccountView from '@/components/ui/new-account-view';

export default async function EditAccountPage({
  params,
}: {
  params: Promise<{ accountId: string }>;
}) {
  const { accountId } = await params;

  return <NewAccountView mode="edit" accountId={accountId} />;
}
