import type { SupabaseClient } from "@supabase/supabase-js";
import { loadScenarioWorld } from "@/lib/scenario-data";
import { computeScenario, SUMMARY_GROUPS, type MissingItem } from "@/lib/wedding-scenarios";

// The Active Wedding Plan is a scenario the couple chose with "Make this our wedding". Other pages read it, never copy it.
export type PlanRefs = { id: string; name: string; venueId: string | null; vendorIds: string[] };

// Light lookup for pages that only need to know what is in the plan (badges on venue and vendor pages).
export async function loadPlanRefs(supabase: SupabaseClient): Promise<PlanRefs | null> {
  const { data: active, error } = await supabase.from("wedding_scenarios").select("id, name, venue_id").eq("is_active", true).maybeSingle();
  if (error || !active) return null;
  const { data: picks } = await supabase.from("scenario_choices").select("ref_id").eq("scenario_id", active.id).eq("role", "selected").eq("ref_type", "vendor");
  return { id: active.id, name: active.name, venueId: active.venue_id, vendorIds: (picks ?? []).map((p) => p.ref_id).filter((x): x is string => Boolean(x)) };
}

export type PlanSummary = PlanRefs & {
  venueName: string | null;
  projected: number;
  perGuest: number;
  target: number;
  remaining: number;
  unknownCount: number;
  confidencePct: number;
  hasPrices: boolean;
  groups: { name: string; total: number }[];
  guests: { adults: number; kids: number };
  missing: MissingItem[];
};

// The full priced plan, for Budget and the Dashboard. One cheap query says whether a plan exists at all.
export async function loadActivePlan(supabase: SupabaseClient): Promise<PlanSummary | null> {
  const { data: active, error } = await supabase.from("wedding_scenarios").select("id").eq("is_active", true).maybeSingle();
  if (error || !active) return null;
  const { world, scenarios, choices } = await loadScenarioWorld(supabase);
  const s = scenarios.find((x) => x.id === active.id);
  if (!s) return null;
  const r = computeScenario(s, choices, world);
  return {
    id: s.id,
    name: s.name,
    venueId: s.venue_id,
    vendorIds: choices.filter((c) => c.scenario_id === s.id && c.role === "selected" && c.ref_type === "vendor" && c.ref_id).map((c) => c.ref_id as string),
    venueName: r.venue?.name ?? null,
    projected: r.projected,
    perGuest: r.perGuest,
    target: r.setup.target,
    remaining: r.remaining,
    unknownCount: r.unknownCount,
    confidencePct: r.confidence.pct,
    hasPrices: r.confidence.confirmed + r.confidence.estimated > 0,
    groups: [...SUMMARY_GROUPS.map((g) => ({ name: g as string, total: r.groups[g] })), { name: "Contingency", total: r.contingency }],
    guests: { adults: r.setup.adults, kids: r.setup.kids },
    missing: r.missing,
  };
}
