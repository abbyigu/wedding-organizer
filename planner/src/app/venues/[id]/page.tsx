import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import VenueProfile from "@/components/VenueProfile";
import { displayName } from "@/lib/auth-names";
import { getBudgetContext } from "@/lib/budget-context";
import { getLinkedCosts } from "@/lib/budget-linked";
import type { BudgetExpense } from "@/lib/budget-extras";
import type { PlanningTask } from "@/lib/planning-tasks";
import type { VenueComm } from "@/components/VenueComms";
import { loadPlanRefs } from "@/lib/plan";

export const dynamic = "force-dynamic";

export default async function VenuePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const { id } = await params;
  const { tab } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: venue } = await supabase.from("venues").select("*").eq("id", id).single();
  if (!venue) notFound();

  const photoPaths = (venue.photos ?? []).map((p: { path: string }) => p.path);
  let signedUrls: Record<string, string> = {};
  if (photoPaths.length) {
    const { data } = await supabase.storage.from("venue-photos").createSignedUrls(photoPaths, 3600);
    signedUrls = Object.fromEntries((data ?? []).map((d) => [d.path ?? "", d.signedUrl ?? ""]));
  }

  const { assumptions, sharedVals } = await getBudgetContext(supabase);
  const [{ data: expenses }, { data: tasks }, linked, { data: comms, error: commsError }, plan] = await Promise.all([
    supabase.from("budget_expenses").select("*").order("sort_order", { ascending: true }),
    supabase.from("planning_tasks").select("*").like("template_key", `venue:${id}:%`).order("created_at", { ascending: true }),
    getLinkedCosts(supabase, { adults: assumptions.adults, kids: assumptions.kids }),
    supabase.from("venue_communications").select("*").eq("venue_id", id),
    loadPlanRefs(supabase),
  ]);

  return (
    <VenueProfile
      venue={venue}
      signedUrls={signedUrls}
      userName={displayName(user?.email)}
      assumptions={assumptions}
      sharedVals={sharedVals}
      expenses={(expenses ?? []) as BudgetExpense[]}
      linked={linked.items}
      tasks={(tasks ?? []) as PlanningTask[]}
      initialTab={tab}
      comms={(comms ?? []) as VenueComm[]}
      commsMissing={Boolean(commsError)}
      planName={plan?.venueId === id ? plan.name : null}
    />
  );
}
