import { createClient } from "@/lib/supabase/server";
import Board from "@/components/Board";
import { displayName } from "@/lib/auth-names";

export const dynamic = "force-dynamic";

export default async function BoardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: venues } = await supabase
    .from("venues")
    .select("*")
    .order("sort_order", { ascending: true });

  return <Board initialVenues={venues ?? []} userName={displayName(user?.email)} />;
}
