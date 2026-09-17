import { createClient } from "@/lib/supabase/server";
import IdeaBoard from "@/components/IdeaBoard";
import { displayName } from "@/lib/auth-names";

export const dynamic = "force-dynamic";

export default async function IdeaBoardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: ideas } = await supabase.from("idea_pins").select("*").order("sort_order", { ascending: true });

  return <IdeaBoard initialIdeas={ideas ?? []} userName={displayName(user?.email)} />;
}
