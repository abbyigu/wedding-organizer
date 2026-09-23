import { loadStyle } from "@/lib/wedding-style";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DiyProjectDetail from "@/components/DiyProjectDetail";
import { displayName } from "@/lib/auth-names";
import type { DiyMaterial, DiyProject } from "@/lib/diy-projects";

export const dynamic = "force-dynamic";

export default async function DiyProjectPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const { id } = await params;
  const { tab } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: project } = await supabase.from("diy_projects").select("*").eq("id", id).maybeSingle();
  if (!project) notFound();
  const [{ data: materials, error: materialsError }, { data: idea }] = await Promise.all([
    supabase.from("diy_materials").select("*").eq("project_id", id).order("sort_order", { ascending: true }),
    project.idea_pin_id ? supabase.from("idea_pins").select("id, title, image_url").eq("id", project.idea_pin_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);

  const style = await loadStyle(supabase);

  return (
    <DiyProjectDetail
      initialProject={project as DiyProject}
      initialMaterials={(materials ?? []) as DiyMaterial[]}
      materialsMissing={!!materialsError}
      idea={idea}
      initialTab={tab}
      userName={displayName(user?.email)}
      style={style}
    />
  );
}
