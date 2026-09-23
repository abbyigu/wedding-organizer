import { createClient } from "@/lib/supabase/server";
import WeddingScenarioCompare from "@/components/WeddingScenarioCompare";
import { loadScenarioWorld } from "@/lib/scenario-data";

export const dynamic = "force-dynamic";

export default async function CompareScenariosPage({ searchParams }: { searchParams: Promise<{ ids?: string }> }) {
  const { ids } = await searchParams;
  const supabase = await createClient();
  const { world, scenarios, choices, photoUrls } = await loadScenarioWorld(supabase);
  return <WeddingScenarioCompare world={world} scenarios={scenarios.filter((s) => !s.archived)} choices={choices} photoUrls={photoUrls} initialIds={(ids ?? "").split(",").filter(Boolean)} />;
}
