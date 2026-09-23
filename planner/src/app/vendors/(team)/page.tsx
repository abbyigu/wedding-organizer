import { createClient } from "@/lib/supabase/server";
import VendorsBrowse from "@/components/VendorsBrowse";
import { loadVendorData } from "@/lib/vendors-data";

export const dynamic = "force-dynamic";

export default async function PotentialVendorsPage() {
  const supabase = await createClient();
  const d = await loadVendorData(supabase);
  return <VendorsBrowse mode="potential" initialVendors={d.vendors} followUps={d.followUps} payments={d.payments} ideas={d.ideas} venueChosen={d.venues.some((v) => v.is_final)} needsMigration={d.needsMigration} />;
}
