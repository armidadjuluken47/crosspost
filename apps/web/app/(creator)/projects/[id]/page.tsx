import { ProjectDetailView } from "@/components/project-detail";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ProjectDetailView publicId={id} />;
}
