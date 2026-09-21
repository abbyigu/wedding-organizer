import { createClient } from "@/lib/supabase/server";
import PotentialVendors from "@/components/PotentialVendors";
import { displayName } from "@/lib/auth-names";
import type { PotentialVendor } from "@/lib/potential-vendors";

export const dynamic = "force-dynamic";

export default async function PotentialVendorsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: vendors }, { data: booked }, { data: venues }] = await Promise.all([
    supabase.from("potential_vendors").select("*").order("sort_order", { ascending: true }),
    supabase.from("vendors").select("category, status"),
    supabase.from("venues").select("is_final"),
  ]);
  // A category is "done" when something in it is booked — and the venue counts once you've chosen it.
  const bookedCategories = [
    ...new Set([...(booked ?? []).filter((v) => v.status === "booked" || v.status === "confirmed").map((v) => v.category as string), ...((venues ?? []).some((v) => v.is_final) ? ["Venue"] : [])]),
  ];

  return <PotentialVendors initialVendors={(vendors ?? []) as PotentialVendor[]} userName={displayName(user?.email)} bookedCategories={bookedCategories} />;
}
