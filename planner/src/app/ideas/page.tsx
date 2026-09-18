import { createClient } from "@/lib/supabase/server";
import IdeaBoard from "@/components/IdeaBoard";
import { displayName } from "@/lib/auth-names";

export const dynamic = "force-dynamic";

export default async function IdeaBoardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: ideas }, { data: reactions }, { data: diyLinks }] = await Promise.all([
    supabase.from("idea_pins").select("*").order("sort_order", { ascending: true }),
    supabase.from("idea_reactions").select("*"),
    supabase.from("diy_projects").select("idea_pin_id").not("idea_pin_id", "is", null),
  ]);

  return (
    <IdeaBoard
      initialIdeas={ideas ?? []}
      initialReactions={reactions ?? []}
      userName={displayName(user?.email)}
      userId={user?.id ?? ""}
      linkedDiyIdeaIds={(diyLinks ?? []).map((d) => d.idea_pin_id as string)}
    />
  );
}
