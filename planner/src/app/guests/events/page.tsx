import { createClient } from "@/lib/supabase/server";
import WeddingEvents from "@/components/WeddingEvents";
import WeddingWeekend from "@/components/WeddingWeekend";
import type { EventExpense, EventGuest, TimelineMoment, WeddingEvent } from "@/lib/wedding-events";

export const dynamic = "force-dynamic";

export default async function GuestsEventsPage({ searchParams }: { searchParams: Promise<{ view?: string; as?: string }> }) {
  const { view, as } = await searchParams;
  const supabase = await createClient();
  const [{ data: events }, { data: eventGuests }, { data: guests }, { data: expenses }, { data: moments, error: momentsError }, { data: settings }, { data: dayItems }, { data: booked }] = await Promise.all([
    supabase.from("wedding_events").select("*").order("sort_order", { ascending: true }),
    supabase.from("event_guests").select("*"),
    supabase.from("guests").select("*").order("sort_order", { ascending: true }),
    supabase.from("event_expenses").select("*"),
    supabase.from("timeline_moments").select("*").order("sort_order", { ascending: true }),
    supabase.from("budget_settings").select("wedding_date").eq("id", true).maybeSingle(),
    supabase.from("wedding_day_events").select("*").order("sort_order", { ascending: true }),
    supabase.from("vendors").select("id, name, category, arrival_time").in("status", ["booked", "confirmed"]).order("name", { ascending: true }),
  ]);

  if (view === "all") {
    return <WeddingEvents initialEvents={(events ?? []) as WeddingEvent[]} initialEventGuests={(eventGuests ?? []) as EventGuest[]} guests={guests ?? []} />;
  }
  return (
    <WeddingWeekend
      initialEvents={(events ?? []) as WeddingEvent[]}
      initialEventGuests={(eventGuests ?? []) as EventGuest[]}
      guests={guests ?? []}
      expenses={(expenses ?? []) as EventExpense[]}
      initialMoments={(moments ?? []) as TimelineMoment[]}
      momentsMissing={!!momentsError}
      weddingDate={settings?.wedding_date ?? null}
      weddingDayItems={(dayItems ?? []).map((d) => ({ id: d.id, time: d.time ?? "", title: d.title, location: d.location ?? "", audience: d.audience }))}
      bookedVendors={(booked ?? []).map((v) => ({ id: v.id, name: v.name, category: v.category, arrival_time: v.arrival_time ?? "" }))}
      audienceReady={events?.[0] ? "audience" in events[0] : true}
      initialView={(["guest", "party", "vendor"] as const).find((x) => x === as) ?? "planning"}
    />
  );
}
