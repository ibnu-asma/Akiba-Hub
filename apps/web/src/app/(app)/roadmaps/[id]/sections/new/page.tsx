import { redirect } from 'next/navigation';
export default async function NewSectionRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/roadmaps/${id}/edit`);
}
