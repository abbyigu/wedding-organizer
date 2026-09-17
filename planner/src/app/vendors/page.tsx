import { createClient } from "@/lib/supabase/server";
import Vendors from "@/components/Vendors";
import { displayName } from "@/lib/auth-names";

export const dynamic = "force-dynamic";

export default async function VendorsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: vendors } = await supabase
    .from("vendors")
    .select("*")
    .order("sort_order", { ascending: true });

  return <Vendors initialVendors={vendors ?? []} userName={displayName(user?.email)} />;
}
