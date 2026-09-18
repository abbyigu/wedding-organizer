import { createClient } from "@/lib/supabase/server";
import Registry from "@/components/Registry";
import { displayName } from "@/lib/auth-names";
import type { RegistryEntry } from "@/lib/registry";

export const dynamic = "force-dynamic";

export default async function RegistryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: entries } = await supabase.from("registries").select("*").order("sort_order", { ascending: true });

  return <Registry initialEntries={(entries ?? []) as RegistryEntry[]} userName={displayName(user?.email)} />;
}
