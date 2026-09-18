import { createClient } from "@/lib/supabase/server";
import TravelStay from "@/components/TravelStay";
import type { HotelBlock } from "@/lib/travel";

export const dynamic = "force-dynamic";

export default async function TravelStayPage() {
  const supabase = await createClient();
  const { data: blocks } = await supabase
    .from("hotel_blocks")
    .select("*")
    .order("sort_order", { ascending: true });

  return <TravelStay initialBlocks={(blocks ?? []) as HotelBlock[]} />;
}
