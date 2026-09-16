import { createClient } from "@/lib/supabase/server";
import Decide from "@/components/Decide";
import { displayName } from "@/lib/auth-names";
import { DEFAULT_CRITERIA, type Criterion } from "@/lib/decisions";

export const dynamic = "force-dynamic";

export default async function DecidePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: venues }, { data: ratings }, { data: settingsRow }, { data: events }] = await Promise.all([
    supabase.from("venues").select("*").order("sort_order", { ascending: true }),
    supabase.from("venue_ratings").select("*"),
    supabase.from("decision_settings").select("*").eq("id", true).maybeSingle(),
    supabase.from("decision_events").select("*").order("created_at", { ascending: false }).limit(50),
  ]);

  const criteria: Criterion[] = settingsRow?.criteria ?? DEFAULT_CRITERIA;

  return (
    <Decide
      initialVenues={venues ?? []}
      initialRatings={ratings ?? []}
      initialCriteria={criteria}
      initialEvents={events ?? []}
      userName={displayName(user?.email)}
      userId={user?.id ?? ""}
    />
  );
}
