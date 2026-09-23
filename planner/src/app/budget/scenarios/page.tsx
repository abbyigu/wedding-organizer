import { createClient } from "@/lib/supabase/server";
import ScenariosOverview from "@/components/ScenariosOverview";
import { loadScenarioWorld } from "@/lib/scenario-data";

export const dynamic = "force-dynamic";

export default async function ScenariosPage() {
  const supabase = await createClient();
  const { world, scenarios, choices, photoUrls, needsMigration } = await loadScenarioWorld(supabase);
  return <ScenariosOverview world={world} initialScenarios={scenarios} initialChoices={choices} photoUrls={photoUrls} needsMigration={needsMigration} />;
}
