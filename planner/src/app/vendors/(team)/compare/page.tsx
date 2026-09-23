import { createClient } from "@/lib/supabase/server";
import VendorCompare from "@/components/VendorCompare";
import { getBudgetContext } from "@/lib/budget-context";
import { isBooked } from "@/lib/vendors";
import { loadVendorData } from "@/lib/vendors-data";

export const dynamic = "force-dynamic";

export default async function ComparePage({ searchParams }: { searchParams: Promise<{ ids?: string; category?: string }> }) {
  const sp = await searchParams;
  const supabase = await createClient();
  const [d, ctx] = await Promise.all([loadVendorData(supabase), getBudgetContext(supabase)]);
  const candidates = d.vendors.filter((v) => !isBooked(v) && v.decision_status !== "rejected");
  const ids = (sp.ids ?? "").split(",").filter(Boolean);
  // ?category= starts a comparison from that category's favourites first.
  const picked = ids.length
    ? ids
    : sp.category
      ? candidates
          .filter((v) => v.category === sp.category)
          .sort((a, b) => Number(b.ariel_reaction === "love" || b.fred_reaction === "love") - Number(a.ariel_reaction === "love" || a.fred_reaction === "love"))
          .slice(0, 4)
          .map((v) => v.id)
      : [];
  return <VendorCompare candidates={candidates} initialIds={picked} ideas={d.ideas} guests={{ adults: ctx.assumptions.adults, kids: ctx.assumptions.kids }} />;
}
