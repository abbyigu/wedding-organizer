import { createClient } from "@/lib/supabase/server";
import GuestsRsvp from "@/components/GuestsRsvp";

export const dynamic = "force-dynamic";

export default async function GuestsRsvpPage() {
  const supabase = await createClient();
  const { data: guests } = await supabase
    .from("guests")
    .select("*")
    .order("sort_order", { ascending: true });

  return <GuestsRsvp initialGuests={guests ?? []} />;
}
