import { createClient } from "@/lib/supabase/server";
import PotentialVendors from "@/components/PotentialVendors";
import type { PotentialVendor } from "@/lib/potential-vendors";

export const dynamic = "force-dynamic";

export default async function PotentialVendorsPage() {
  const supabase = await createClient();
  const { data: vendors } = await supabase
    .from("potential_vendors")
    .select("*")
    .order("sort_order", { ascending: true });

  return <PotentialVendors initialVendors={(vendors ?? []) as PotentialVendor[]} />;
}
