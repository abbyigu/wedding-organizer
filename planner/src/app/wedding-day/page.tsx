import { createClient } from "@/lib/supabase/server";
import WeddingDay from "@/components/WeddingDay";
import { displayName } from "@/lib/auth-names";

export const dynamic = "force-dynamic";

export default async function WeddingDayPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [{ data: events }, { data: finalVenues }] = await Promise.all([
    supabase.from("wedding_day_events").select("*").order("sort_order", { ascending: true }),
    supabase.from("venues").select("id").eq("is_final", true).limit(1),
  ]);

  return <WeddingDay initialEvents={events ?? []} userName={displayName(user?.email)} venueConfirmed={!!finalVenues?.length} />;
}
