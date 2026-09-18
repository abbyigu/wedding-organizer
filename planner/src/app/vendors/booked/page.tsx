import { createClient } from "@/lib/supabase/server";
import Vendors from "@/components/Vendors";

export const dynamic = "force-dynamic";

export default async function BookedVendorsPage() {
  const supabase = await createClient();
  const { data: vendors } = await supabase
    .from("vendors")
    .select("*")
    .order("sort_order", { ascending: true });

  return <Vendors initialVendors={vendors ?? []} />;
}
