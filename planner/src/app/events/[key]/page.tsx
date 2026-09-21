import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import EventDetail from "@/components/EventDetail";
import { displayName } from "@/lib/auth-names";
import type { EventGuest, WeddingEvent } from "@/lib/wedding-events";
import type { Vendor } from "@/lib/vendors";

export const dynamic = "force-dynamic";

export default async function EventDetailPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key);
  const { data: event } = await supabase.from("wedding_events").select("*").eq(isId ? "id" : "key", key).maybeSingle();
  if (!event) notFound();

  const [{ data: eventGuests }, { data: guests }, { data: vendors }] = await Promise.all([
    supabase.from("event_guests").select("*").eq("event_id", event.id),
    supabase.from("guests").select("*").order("sort_order", { ascending: true }),
    supabase.from("vendors").select("*").order("sort_order", { ascending: true }),
  ]);

  return (
    <EventDetail
      initialEvent={event as WeddingEvent}
      initialEventGuests={(eventGuests ?? []) as EventGuest[]}
      guests={guests ?? []}
      vendors={(vendors ?? []) as Vendor[]}
      userName={displayName(user?.email)}
    />
  );
}
