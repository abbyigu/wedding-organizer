import { createClient } from "@/lib/supabase/server";
import GuestsOverview from "@/components/GuestsOverview";
import type { HotelBlock } from "@/lib/travel";

export const dynamic = "force-dynamic";

export default async function GuestsOverviewPage() {
  const supabase = await createClient();
  const [{ data: guests }, { data: hotelBlocks }] = await Promise.all([
    supabase.from("guests").select("*").order("sort_order", { ascending: true }),
    supabase.from("hotel_blocks").select("*"),
  ]);

  return <GuestsOverview guests={guests ?? []} hotelBlocks={(hotelBlocks ?? []) as HotelBlock[]} />;
}
