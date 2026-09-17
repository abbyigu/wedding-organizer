import { createClient } from "@/lib/supabase/server";
import Board from "@/components/Board";
import { displayName } from "@/lib/auth-names";

export const dynamic = "force-dynamic";

export default async function BoardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: tasks } = await supabase
    .from("planning_tasks")
    .select("*")
    .order("sort_order", { ascending: true });

  return <Board initialTasks={tasks ?? []} userName={displayName(user?.email)} />;
}
