import { createClient } from "@/lib/supabase/server";
import NavBar from "@/components/NavBar";
import Honeymoon from "@/components/Honeymoon";
import { displayName } from "@/lib/auth-names";
import { BLANK_SETTINGS, type Destination, type HoneymoonItem, type HoneymoonSettings } from "@/lib/honeymoon";
import type { IdeaImage } from "@/lib/registry";
import type { PlanningTask } from "@/lib/planning-tasks";

export const dynamic = "force-dynamic";

export default async function HoneymoonPage() {
  const supabase = await createClient();
  const [
    {
      data: { user },
    },
    { data: dests, error },
    { data: items },
    { data: settings },
    { data: pins },
    { data: registries },
    { data: gifts, error: giftError },
    { data: tasks },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("honeymoon_destinations").select("*").order("sort_order", { ascending: true }),
    supabase.from("honeymoon_items").select("*").order("sort_order", { ascending: true }),
    supabase.from("honeymoon_settings").select("*").eq("id", true).maybeSingle(),
    supabase.from("idea_pins").select("id, title, image_url").neq("image_url", "").order("sort_order", { ascending: true }),
    supabase.from("registries").select("store_name, type"),
    supabase.from("guests").select("gift_source, gift_amount"), // gift_amount exists once migration 051 has run
    supabase.from("planning_tasks").select("*").like("template_key", "honeymoon:%"),
  ]);

  const destinations = (dests ?? []) as Destination[];

  // Did Decide Together already choose one of the shortlisted places?
  const optionIds = destinations.map((d) => d.decision_option_id).filter((x): x is string => Boolean(x));
  let decision: { id: string; finalDestinationId: string | null } | null = null;
  if (optionIds.length) {
    const { data: opts } = await supabase.from("decision_options").select("id, decision_id").in("id", optionIds);
    const decisionId = opts?.[0]?.decision_id;
    if (decisionId) {
      const { data: d } = await supabase.from("decisions").select("id, is_final, final_option_id").eq("id", decisionId).maybeSingle();
      if (d) decision = { id: d.id, finalDestinationId: d.is_final ? destinations.find((x) => x.decision_option_id === d.final_option_id)?.id ?? null : null };
    }
  }

  // Gifts given to the honeymoon fund are recorded once, on the Guest List. This only reads them.
  const fundNames = (registries ?? []).filter((r) => r.type === "honeymoon").map((r) => (r.store_name as string).trim().toLowerCase());
  const contributions = (gifts ?? []).filter((g) => g.gift_amount != null && fundNames.includes(((g.gift_source as string) ?? "").trim().toLowerCase())).reduce((t, g) => t + Number(g.gift_amount), 0);

  return (
    <div className="min-h-screen pb-20 lg:pl-56">
      <NavBar userName={displayName(user?.email)} />
      <div className="mx-auto max-w-[1200px] px-4 py-8 sm:px-6 lg:px-8">
        <Honeymoon
          initialDestinations={destinations}
          initialItems={(items ?? []) as HoneymoonItem[]}
          initialSettings={(settings ?? BLANK_SETTINGS) as HoneymoonSettings}
          ideas={(pins ?? []) as IdeaImage[]}
          decision={decision}
          contributions={contributions}
          hasFund={fundNames.length > 0}
          giftAmountMissing={Boolean(giftError)}
          initialTasks={(tasks ?? []) as PlanningTask[]}
          needsMigration={Boolean(error)}
        />
      </div>
    </div>
  );
}
