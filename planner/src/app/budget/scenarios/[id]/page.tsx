import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ScenarioBuilder from "@/components/ScenarioBuilder";
import { loadScenarioWorld } from "@/lib/scenario-data";

export const dynamic = "force-dynamic";

export default async function ScenarioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { world, scenarios, choices, ideas, photoUrls } = await loadScenarioWorld(supabase);
  const scenario = scenarios.find((s) => s.id === id);
  if (!scenario) notFound();
  return <ScenarioBuilder world={world} initialScenario={scenario} initialChoices={choices.filter((c) => c.scenario_id === id)} ideas={ideas} photoUrls={photoUrls} />;
}
