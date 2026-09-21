import { createClient } from "@/lib/supabase/server";
import GuestsOverview, { type Deadline } from "@/components/GuestsOverview";
import type { HotelBlock } from "@/lib/travel";
import { daysUntil } from "@/lib/dashboard";
import { effectiveDate, todayISO } from "@/lib/planning-timeline";
import { DEFAULT_BUDGET_SETTINGS, DEFAULT_GUEST_TARGET } from "@/lib/venues";

export const dynamic = "force-dynamic";

const GUEST_TASK_CATEGORIES = ["Guests", "Stationery", "Travel & Stay", "Wedding Party"];

export default async function GuestsOverviewPage() {
  const supabase = await createClient();
  const [{ data: guests }, { data: hotelBlocks }, { data: settings }, { data: tasks }] = await Promise.all([
    supabase.from("guests").select("*").order("sort_order", { ascending: true }),
    supabase.from("hotel_blocks").select("*"),
    supabase.from("budget_settings").select("*").eq("id", true).maybeSingle(),
    supabase.from("planning_tasks").select("title, category, status, due_date, period").in("category", GUEST_TASK_CATEGORIES),
  ]);

  const weddingDate = settings?.wedding_date ?? DEFAULT_BUDGET_SETTINGS.wedding_date;
  const today = todayISO();
  const deadlines: Deadline[] = [
    ...(tasks ?? [])
      .filter((t) => t.status !== "done")
      .map((t) => ({ label: t.title as string, date: effectiveDate(t, weddingDate) }))
      .filter((d): d is Deadline => Boolean(d.date) && d.date! >= today),
    ...((hotelBlocks ?? []) as HotelBlock[])
      .filter((h) => h.booking_deadline && h.booking_deadline >= today)
      .map((h) => ({ label: `${h.name} — book by`, date: h.booking_deadline! })),
  ]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5);

  return <GuestsOverview guests={guests ?? []} hotelBlocks={(hotelBlocks ?? []) as HotelBlock[]} deadlines={deadlines} daysToGo={daysUntil(weddingDate)} guestTarget={settings?.guest_target ?? DEFAULT_GUEST_TARGET} />;
}
