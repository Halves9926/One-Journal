import PublicSharedAnalysisView from '@/components/ui/public-shared-analysis-view';

export default async function SharedAnalysisPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return <PublicSharedAnalysisView token={token} />;
}
