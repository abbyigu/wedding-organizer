import { createClient } from "@/lib/supabase/server";
import WeddingParty from "@/components/WeddingParty";
import { displayName } from "@/lib/auth-names";
import type { PartyTask, WeddingPartyMember } from "@/lib/wedding-party";

export const dynamic = "force-dynamic";

export default async function WeddingPartyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: members } = await supabase.from("wedding_party").select("*").order("sort_order", { ascending: true });

  const { data: style } = await supabase.from("wedding_style").select("palette, palette_name").eq("id", true).maybeSingle();
  const { data: tasks, error: tasksError } = await supabase.from("wedding_party_tasks").select("*").order("sort_order", { ascending: true });

  return (
    <WeddingParty
      initialMembers={(members ?? []) as WeddingPartyMember[]}
      initialTasks={(tasks ?? []) as PartyTask[]}
      tasksMissing={!!tasksError}
      palette={{ colours: (style?.palette ?? []) as string[], name: (style?.palette_name ?? "") as string }}
      userName={displayName(user?.email)}
    />
  );
}
