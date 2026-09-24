import { createClient } from "@/lib/supabase/server";
import Private from "@/components/Private";
import { displayName } from "@/lib/auth-names";
import { partnerName } from "@/lib/ideas";
import type { EventRef, PrivateNote, RevealedSurprise, Surprise, Teaser } from "@/lib/private";

export const dynamic = "force-dynamic";

export default async function PrivatePage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userName = displayName(user?.email);

  // Row-level security returns only this person's own notes and surprises. What a partner may see comes through
  // database functions that return just the allowed fields.
  const [{ data: notes }, { data: surprises }, { data: teasers }, { data: revealed }, { data: events }, { data: settings }, probe] = await Promise.all([
    supabase.from("private_notes").select("*").order("updated_at", { ascending: false }),
    supabase.from("surprises").select("*").order("created_at", { ascending: false }),
    supabase.rpc("surprise_teasers"),
    supabase.rpc("revealed_surprises"),
    supabase.from("wedding_events").select("id, title, event_date").order("sort_order", { ascending: true }),
    supabase.from("budget_settings").select("wedding_date").eq("id", true).maybeSingle(),
    supabase.from("private_attachments").select("id").limit(1),
  ]);

  return (
    <Private
      initialNotes={(notes ?? []) as PrivateNote[]}
      initialSurprises={((surprises ?? []) as Surprise[]).filter((s) => s.owner_id === user?.id).map((s) => ({ ...s, checklist: s.checklist ?? [] }))}
      teasers={(teasers ?? []) as Teaser[]}
      revealed={(revealed ?? []) as RevealedSurprise[]}
      events={(events ?? []) as EventRef[]}
      weddingDate={settings?.wedding_date ?? null}
      userName={userName}
      userId={user?.id ?? ""}
      partner={partnerName(userName || "Ariel")}
      initialTab={tab === "surprises" ? "surprises" : tab === "revealed" ? "revealed" : "space"}
      needsMigration={Boolean(probe.error)}
    />
  );
}
