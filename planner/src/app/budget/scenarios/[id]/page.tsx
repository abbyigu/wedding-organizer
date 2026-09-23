import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ScenarioBuilder from "@/components/ScenarioBuilder";
import { loadScenarioWorld } from "@/lib/scenario-data";
import type { SnapshotRow } from "@/lib/wedding-scenarios";

export const dynamic = "force-dynamic";

export default async function ScenarioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { world, scenarios, choices, ideas, photoUrls } = await loadScenarioWorld(supabase);
  const scenario = scenarios.find((s) => s.id === id);
  if (!scenario) notFound();
  const { data: snaps, error: snapError } = await supabase.from("scenario_snapshots").select("*").eq("scenario_id", id).order("created_at", { ascending: false });
  return <ScenarioBuilder world={world} initialScenario={scenario} initialChoices={choices.filter((c) => c.scenario_id === id)} ideas={ideas} photoUrls={photoUrls} snapshots={(snaps ?? []) as SnapshotRow[]} snapshotsMissing={Boolean(snapError)} />;
}
