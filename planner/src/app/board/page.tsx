import { createClient } from "@/lib/supabase/server";
import Board from "@/components/Board";
import { displayName } from "@/lib/auth-names";
import { daysUntil } from "@/lib/dashboard";
import { DEFAULT_BUDGET_SETTINGS } from "@/lib/venues";

export const dynamic = "force-dynamic";

export default async function BoardPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { view } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [{ data: tasks }, { data: settings }] = await Promise.all([
    supabase.from("planning_tasks").select("*").order("sort_order", { ascending: true }),
    supabase.from("budget_settings").select("wedding_date").eq("id", true).maybeSingle(),
  ]);

  return (
    <Board
      initialTasks={tasks ?? []}
      userName={displayName(user?.email)}
      initialView={view === "timeline" || view === "list" ? view : "board"}
      daysToGo={daysUntil(settings?.wedding_date ?? DEFAULT_BUDGET_SETTINGS.wedding_date)}
    />
  );
}
