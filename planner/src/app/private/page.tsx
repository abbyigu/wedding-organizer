import { createClient } from "@/lib/supabase/server";
import Private from "@/components/Private";
import { displayName } from "@/lib/auth-names";

export const dynamic = "force-dynamic";

export default async function PrivatePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: notes }, { data: surprises }, { data: ideaThumbs, count: ideaCount }] = await Promise.all([
    supabase.from("private_notes").select("*").order("updated_at", { ascending: false }),
    supabase.from("surprises").select("*").order("created_at", { ascending: false }),
    supabase
      .from("idea_pins")
      .select("id, title, image_url", { count: "exact" })
      .order("created_at", { ascending: false })
      .limit(4),
  ]);

  return (
    <Private
      initialNotes={notes ?? []}
      initialSurprises={surprises ?? []}
      ideaThumbs={ideaThumbs ?? []}
      ideaCount={ideaCount ?? 0}
      userName={displayName(user?.email)}
      userId={user?.id ?? ""}
    />
  );
}
