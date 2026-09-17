import { createClient } from "@/lib/supabase/server";
import WeddingDay from "@/components/WeddingDay";
import { displayName } from "@/lib/auth-names";

export const dynamic = "force-dynamic";

export default async function WeddingDayPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: events } = await supabase
    .from("wedding_day_events")
    .select("*")
    .order("sort_order", { ascending: true });

  return <WeddingDay initialEvents={events ?? []} userName={displayName(user?.email)} />;
}
