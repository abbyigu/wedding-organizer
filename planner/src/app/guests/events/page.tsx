import { createClient } from "@/lib/supabase/server";
import WeddingEvents from "@/components/WeddingEvents";
import type { EventGuest, WeddingEvent } from "@/lib/wedding-events";

export const dynamic = "force-dynamic";

export default async function GuestsEventsPage() {
  const supabase = await createClient();
  const [{ data: events }, { data: eventGuests }, { data: guests }] = await Promise.all([
    supabase.from("wedding_events").select("*").order("sort_order", { ascending: true }),
    supabase.from("event_guests").select("*"),
    supabase.from("guests").select("*").order("sort_order", { ascending: true }),
  ]);

  return (
    <WeddingEvents
      initialEvents={(events ?? []) as WeddingEvent[]}
      initialEventGuests={(eventGuests ?? []) as EventGuest[]}
      guests={guests ?? []}
    />
  );
}
