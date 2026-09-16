import { createClient } from "@/lib/supabase/server";
import Compare from "@/components/Compare";
import { displayName } from "@/lib/auth-names";

export const dynamic = "force-dynamic";

export default async function ComparePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: venues } = await supabase
    .from("venues")
    .select("*")
    .order("sort_order", { ascending: true });

  return <Compare venues={venues ?? []} userName={displayName(user?.email)} />;
}
