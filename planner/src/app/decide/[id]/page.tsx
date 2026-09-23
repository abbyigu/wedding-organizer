import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DecisionDetail from "@/components/DecisionDetail";
import { displayName } from "@/lib/auth-names";
import { getBudgetContext } from "@/lib/budget-context";
import { getLinkedCosts } from "@/lib/budget-linked";
import { scenarioOf } from "@/lib/budget-scenarios";
import { researchPercent } from "@/lib/venue-profile";
import { fmt } from "@/lib/venues";
import { linkedTotalFor, type BudgetExpense } from "@/lib/budget-extras";
import { CARD_STATE_LABEL, cardState, isBooked, photoSrc, priceRange, vendorPrice, type Vendor } from "@/lib/vendors";
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

  const [{ data: options }, { data: votes }, { data: ideas }, { data: venues }, { data: vendors }, { data: style }, { data: expenses }, { c: ctx, linked }] = await Promise.all([
    supabase.from("decision_options").select("*").eq("decision_id", id).order("sort_order", { ascending: true }),
    supabase.from("decision_votes").select("*").eq("decision_id", id),
    supabase.from("idea_pins").select("id, title, image_url, category, note, visibility, owner_id, is_favourite").order("created_at", { ascending: false }),
    supabase.from("venues").select("*").order("sort_order", { ascending: true }),
    supabase.from("vendors").select("*").order("sort_order", { ascending: true }),
    supabase.from("wedding_style").select("*").eq("id", true).maybeSingle(),
    supabase.from("budget_expenses").select("*"),
    getBudgetContext(supabase).then(async (c) => ({ c, linked: await getLinkedCosts(supabase, { adults: c.assumptions.adults, kids: c.assumptions.kids }) })),
  ]);

  // Venue cover photos are private storage files, so sign the first photo of each venue.
  const coverPaths = (venues ?? []).map((v) => v.photos?.[0]?.path).filter(Boolean) as string[];
  const signed: Record<string, string> = {};
  if (coverPaths.length) {
    const { data } = await supabase.storage.from("venue-photos").createSignedUrls(coverPaths, 3600);
    for (const d of data ?? []) if (d.path && d.signedUrl) signed[d.path] = d.signedUrl;
  }
  const venueRefs: VenueRef[] = (venues ?? []).map((v) => {
    const s = scenarioOf(v, ctx.assumptions, ctx.sharedVals, (expenses ?? []) as BudgetExpense[], linkedTotalFor(linked.items, v.id));
    return { id: v.id, name: v.name, location: v.location, capacity: v.capacity, cover: signed[v.photos?.[0]?.path] ?? "", total: s.grand, incomplete: s.unknownCount > 0, research: researchPercent(v), isFinal: v.is_final };
  });
  const ideaImages = new Map((ideas ?? []).map((i) => [i.id, { id: i.id, title: i.title, image_url: i.image_url }]));
  const vendorRefs: VendorRef[] = ((vendors ?? []) as Vendor[])
    .map((v) => ({ ...v, photos: v.photos ?? [] }))
    .map((v) => {
      const used = vendorPrice(v);
      return {
        id: v.id,
        name: v.name,
        category: v.category,
        cover: photoSrc(v.photos[0], ideaImages),
        quote: v.quoted_total != null || v.contracted_total != null ? `${fmt((v.contracted_total ?? v.quoted_total) as number)} (${used.label.toLowerCase()})` : priceRange(v) || "No price yet",
        availability: (v.availability || "unknown").replace(/_/g, " "),
        stage: isBooked(v) ? CARD_STATE_LABEL.booked : CARD_STATE_LABEL[cardState(v, null)],
      };
    });
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
