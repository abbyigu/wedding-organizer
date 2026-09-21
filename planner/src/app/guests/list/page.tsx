import { createClient } from "@/lib/supabase/server";
import Guests from "@/components/Guests";
import { DEFAULT_GUEST_TARGET } from "@/lib/venues";

export const dynamic = "force-dynamic";

export default async function GuestListPage() {
  const supabase = await createClient();
  const [{ data: guests }, { data: settings }] = await Promise.all([
    supabase.from("guests").select("*").order("sort_order", { ascending: true }),
    supabase.from("budget_settings").select("*").eq("id", true).maybeSingle(),
  ]);

  return <Guests initialGuests={guests ?? []} guestTarget={settings?.guest_target ?? DEFAULT_GUEST_TARGET} />;
}
