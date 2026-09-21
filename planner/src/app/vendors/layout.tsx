import { createClient } from "@/lib/supabase/server";
import NavBar from "@/components/NavBar";
import VendorsHeader from "@/components/VendorsHeader";
import { displayName } from "@/lib/auth-names";
import { partnerName } from "@/lib/ideas";
import { POTENTIAL_VENDOR_CATEGORIES, type PotentialVendor } from "@/lib/potential-vendors";
import { isFavourite, isAwaitingQuote, likelySpend } from "@/lib/vendor-status";

export default async function VendorsLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userName = displayName(user?.email);

  const [{ data: potential }, { data: booked }] = await Promise.all([
    supabase.from("potential_vendors").select("id, name, category, ariel_reaction, fred_reaction, communication_status, decision_status, price_low, price_high, price_unit"),
    supabase.from("vendors").select("status, cost"),
  ]);
  const pv = (potential ?? []) as PotentialVendor[];
  const bookedRows = (booked ?? []).filter((v) => v.status === "booked" || v.status === "confirmed");

  return (
    <div className="min-h-screen pb-20 lg:pl-56">
      <NavBar userName={userName} />
      <div className="mx-auto max-w-[1320px] px-4 py-5 sm:px-6 lg:px-8">
        <VendorsHeader
          userName={userName}
          partner={partnerName(userName || "Ariel")}
          items={[
            ...pv.map((v) => ({ label: v.name, hint: v.category, href: `/vendors?open=${v.id}` })),
            ...POTENTIAL_VENDOR_CATEGORIES.map((c) => ({ label: c, hint: "Category", href: `/vendors?category=${encodeURIComponent(c)}` })),
          ]}
          stats={{
            potential: pv.length,
            booked: bookedRows.length,
            favourites: pv.filter(isFavourite).length,
            awaiting: pv.filter(isAwaitingQuote).length,
            spend: bookedRows.reduce((n, v) => n + (v.cost ?? 0), 0) + pv.filter((v) => isFavourite(v) || v.decision_status === "finalist").reduce((n, v) => n + likelySpend(v), 0),
          }}
        />
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}
