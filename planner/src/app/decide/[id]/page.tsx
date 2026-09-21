import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DecisionDetail from "@/components/DecisionDetail";
import { displayName } from "@/lib/auth-names";
import { getBudgetContext } from "@/lib/budget-context";
import { getLinkedCosts } from "@/lib/budget-linked";
import { scenarioOf } from "@/lib/budget-scenarios";
import { researchPercent } from "@/lib/venue-profile";
import { stageOf, STAGE_LABEL } from "@/lib/vendor-status";
import { fmt } from "@/lib/venues";
import type { BudgetExpense } from "@/lib/budget-extras";
import type { PotentialVendor } from "@/lib/potential-vendors";
import type { DecisionOption, DecisionVote, GenericDecision, IdeaRef, VendorRef, VenueRef, WeddingStyle } from "@/lib/decisions";

export const dynamic = "force-dynamic";

export default async function DecisionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: decision } = await supabase.from("decisions").select("*").eq("id", id).maybeSingle();
  if (!decision) notFound();
  if (decision.link_href) redirect(decision.link_href);

  const [{ data: options }, { data: votes }, { data: ideas }, { data: venues }, { data: vendors }, { data: style }, { data: expenses }, ctx, linked] = await Promise.all([
    supabase.from("decision_options").select("*").eq("decision_id", id).order("sort_order", { ascending: true }),
    supabase.from("decision_votes").select("*").eq("decision_id", id),
    supabase.from("idea_pins").select("id, title, image_url, category, note, visibility, owner_id, is_favourite").order("created_at", { ascending: false }),
    supabase.from("venues").select("*").order("sort_order", { ascending: true }),
    supabase.from("potential_vendors").select("*").order("sort_order", { ascending: true }),
    supabase.from("wedding_style").select("*").eq("id", true).maybeSingle(),
    supabase.from("budget_expenses").select("*"),
    getBudgetContext(supabase),
    getLinkedCosts(supabase),
  ]);

  // Venue cover photos are private storage files, so sign the first photo of each venue.
  const coverPaths = (venues ?? []).map((v) => v.photos?.[0]?.path).filter(Boolean) as string[];
  const signed: Record<string, string> = {};
  if (coverPaths.length) {
    const { data } = await supabase.storage.from("venue-photos").createSignedUrls(coverPaths, 3600);
    for (const d of data ?? []) if (d.path && d.signedUrl) signed[d.path] = d.signedUrl;
  }
  const linkedTotal = linked.items.reduce((t, l) => t + l.amount, 0);
  const venueRefs: VenueRef[] = (venues ?? []).map((v) => {
    const s = scenarioOf(v, ctx.assumptions, ctx.sharedVals, (expenses ?? []) as BudgetExpense[], linkedTotal);
    return { id: v.id, name: v.name, location: v.location, capacity: v.capacity, cover: signed[v.photos?.[0]?.path] ?? "", total: s.grand, incomplete: s.unknownCount > 0, research: researchPercent(v), isFinal: v.is_final };
  });
  const vendorRefs: VendorRef[] = ((vendors ?? []) as PotentialVendor[]).map((v) => ({
    id: v.id,
    name: v.name,
    category: v.category,
    cover: v.cover_photo,
    quote: v.price_low != null || v.price_high != null ? [v.price_low, v.price_high].filter((n) => n != null).map((n) => fmt(n as number)).join("–") + (v.price_unit && v.price_unit !== "package" && v.price_unit !== "flat" ? ` / ${v.price_unit.replace(/_/g, " ")}` : "") : v.communication_status === "quote_received" ? "Quote received" : "No quote yet",
    availability: (v.availability || "unknown").replace(/_/g, " "),
    stage: STAGE_LABEL[stageOf(v)],
  }));
  const ideaRefs: IdeaRef[] = (ideas ?? [])
    .filter((i) => i.visibility !== "private" || i.owner_id === user?.id)
    .map((i) => ({ id: i.id, title: i.title, image_url: i.image_url, category: i.category, note: i.note }));

  return (
    <DecisionDetail
      initialDecision={decision as GenericDecision}
      initialOptions={(options ?? []) as DecisionOption[]}
      initialVotes={(votes ?? []) as DecisionVote[]}
      ideas={ideaRefs}
      venueRefs={venueRefs}
      vendorRefs={vendorRefs}
      weddingStyle={style ? ({ palette: style.palette ?? [], palette_name: style.palette_name ?? "", source_decision_id: style.source_decision_id } as WeddingStyle) : null}
      userName={displayName(user?.email)}
      userId={user?.id ?? ""}
    />
  );
}
