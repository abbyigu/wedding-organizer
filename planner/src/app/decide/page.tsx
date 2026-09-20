import { createClient } from "@/lib/supabase/server";
import DecideDashboard, { type DecisionSummary } from "@/components/DecideDashboard";
import { displayName } from "@/lib/auth-names";
import { partnerName } from "@/lib/ideas";
import { statusOf, type DecisionOption, type GenericDecision } from "@/lib/decisions";

export const dynamic = "force-dynamic";

export default async function DecidePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userName = displayName(user?.email);
  const userId = user?.id ?? "";
  const partner = partnerName(userName || "Ariel");

  const [{ data: decisions }, { data: options }, { data: votes }, { data: venues }, { data: venueRatings }] = await Promise.all([
    supabase.from("decisions").select("*").order("sort_order", { ascending: true }),
    supabase.from("decision_options").select("*"),
    supabase.from("decision_votes").select("decision_id, option_id, voter_id"),
    supabase.from("venues").select("id, name, status, is_final, photos").order("sort_order", { ascending: true }),
    supabase.from("venue_ratings").select("venue_id, rater_id"),
  ]);

  const activeVenues = (venues ?? []).filter((v) => v.status !== "out");
  const finalVenue = (venues ?? []).find((v) => v.is_final);
  const myVenueVotes = (venueRatings ?? []).filter((r) => r.rater_id === userId && activeVenues.some((v) => v.id === r.venue_id)).length;
  const partnerVenueVotes = (venueRatings ?? []).filter((r) => r.rater_id !== userId && activeVenues.some((v) => v.id === r.venue_id)).length;

  const coverPath = activeVenues.map((v) => v.photos?.[0]?.path as string | undefined).find(Boolean);
  const venueCover = coverPath ? (await supabase.storage.from("venue-photos").createSignedUrl(coverPath, 3600)).data?.signedUrl ?? null : null;

  const summaries: DecisionSummary[] = (decisions ?? []).map((d: GenericDecision) => {
    if (d.link_href === "/decide/venue") {
      return {
        id: d.id,
        category: d.category,
        title: d.title,
        description: d.description,
        detail: `${activeVenues.length} venue${activeVenues.length === 1 ? "" : "s"} being considered`,
        image: venueCover,
        createdAt: d.created_at,
        href: d.link_href,
        status: statusOf(activeVenues.length, myVenueVotes, partnerVenueVotes, !!finalVenue, partner),
        finalLabel: finalVenue?.name,
      };
    }
    const decisionOptions = (options ?? []).filter((o: DecisionOption) => o.decision_id === d.id && o.status !== "out");
    const decisionVotes = (votes ?? []).filter((v) => v.decision_id === d.id);
    const myCount = decisionVotes.filter((v) => v.voter_id === userId).length;
    const partnerCount = decisionVotes.filter((v) => v.voter_id !== userId).length;
    const finalOption = decisionOptions.find((o) => o.id === d.final_option_id);
    return {
      id: d.id,
      category: d.category,
      title: d.title,
      description: d.description,
      detail: decisionOptions.length ? `${decisionOptions.length} option${decisionOptions.length === 1 ? "" : "s"} to compare` : "",
      image: decisionOptions.find((o) => o.image_url)?.image_url || null,
      createdAt: d.created_at,
      href: d.link_href ?? `/decide/${d.id}`,
      status: statusOf(decisionOptions.length, myCount, partnerCount, d.is_final, partner),
      finalLabel: finalOption?.label,
    };
  });

  return <DecideDashboard summaries={summaries} userName={userName} partner={partner} />;
}
