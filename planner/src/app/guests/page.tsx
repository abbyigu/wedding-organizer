import { createClient } from "@/lib/supabase/server";
import Guests from "@/components/Guests";
import { displayName } from "@/lib/auth-names";

export const dynamic = "force-dynamic";

export default async function GuestsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: guests } = await supabase
    .from("guests")
    .select("*")
    .order("sort_order", { ascending: true });

  return <Guests initialGuests={guests ?? []} userName={displayName(user?.email)} />;
}
