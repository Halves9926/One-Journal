import NewAnalysisForm from '@/components/ui/new-analysis-form';

export default async function EditAnalysisPage({
  params,
}: {
  params: Promise<{ analysisId: string }>;
}) {
  const { analysisId } = await params;

  return <NewAnalysisForm mode="edit" analysisId={analysisId} />;
}
