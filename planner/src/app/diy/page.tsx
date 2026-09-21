import { createClient } from "@/lib/supabase/server";
import DiyProjects from "@/components/DiyProjects";
import { displayName } from "@/lib/auth-names";
import type { DiyMaterial, DiyProject } from "@/lib/diy-projects";

export const dynamic = "force-dynamic";

export default async function DiyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [{ data: projects }, { data: materials, error: materialsError }, { data: ideas }] = await Promise.all([
    supabase.from("diy_projects").select("*").order("sort_order", { ascending: true }),
    supabase.from("diy_materials").select("*").order("sort_order", { ascending: true }),
    supabase.from("idea_pins").select("id, title, image_url"),
  ]);

  return (
    <DiyProjects
      initialProjects={(projects ?? []) as DiyProject[]}
      initialMaterials={(materials ?? []) as DiyMaterial[]}
      materialsMissing={!!materialsError}
      ideas={ideas ?? []}
      userName={displayName(user?.email)}
    />
  );
}
