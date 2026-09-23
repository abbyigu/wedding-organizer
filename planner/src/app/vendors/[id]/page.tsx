import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import VendorProfile from "@/components/VendorProfile";
import { displayName } from "@/lib/auth-names";
import { getBudgetContext } from "@/lib/budget-context";
import { isBooked, isFavourite, type Vendor, type VendorFile, type VendorPriceRow } from "@/lib/vendors";
import { loadVendorData } from "@/lib/vendors-data";

export const dynamic = "force-dynamic";
const TABS = ["overview", "pricing", "services", "communication", "files", "notes"] as const;

export default async function VendorPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string; edit?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [d, { data: prices }, { data: files }, { data: scenarios }, ctx] = await Promise.all([
    loadVendorData(supabase),
    supabase.from("vendor_prices").select("*").eq("vendor_id", id),
    supabase.from("vendor_files").select("*").eq("vendor_id", id),
    supabase.from("vendor_scenarios").select("venue_id").eq("vendor_id", id),
    getBudgetContext(supabase),
  ]);
  const vendor = d.vendors.find((v) => v.id === id);
  if (!vendor) notFound();

  const others = d.vendors
    .filter((v: Vendor) => v.id !== id && v.category === vendor.category && !isBooked(v))
    .sort((a, b) => Number(isFavourite(b)) - Number(isFavourite(a)))
    .slice(0, 3)
    .map((v) => v.id);
  const tab = (TABS as readonly string[]).includes(sp.tab ?? "") ? (sp.tab as (typeof TABS)[number]) : "overview";

  return (
    <VendorProfile
      userName={displayName(user?.email)}
      initial={vendor}
      ideas={d.ideas}
      initialPrices={(prices ?? []) as VendorPriceRow[]}
      initialComms={d.comms.filter((c) => c.vendor_id === id)}
      initialFiles={(files ?? []) as VendorFile[]}
      initialPayments={d.payments.filter((p) => p.vendor_id === id)}
      venues={d.venues.map((v) => ({ id: v.id, name: v.name }))}
      initialScenarioIds={(scenarios ?? []).map((s) => s.venue_id as string)}
      compareIds={others}
      guests={{ adults: ctx.assumptions.adults, kids: ctx.assumptions.kids }}
      initialTab={tab}
      openEdit={sp.edit === "1"}
    />
  );
}
