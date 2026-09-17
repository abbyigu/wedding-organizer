import { createClient } from "@/lib/supabase/server";
import DiyProjects from "@/components/DiyProjects";
import { displayName } from "@/lib/auth-names";

export const dynamic = "force-dynamic";

export default async function DiyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: projects } = await supabase
    .from("diy_projects")
    .select("*")
    .order("sort_order", { ascending: true });

  return <DiyProjects initialProjects={projects ?? []} userName={displayName(user?.email)} />;
}
