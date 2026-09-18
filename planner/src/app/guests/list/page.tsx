import { createClient } from "@/lib/supabase/server";
import Guests from "@/components/Guests";

export const dynamic = "force-dynamic";

export default async function GuestListPage() {
  const supabase = await createClient();
  const { data: guests } = await supabase
    .from("guests")
    .select("*")
    .order("sort_order", { ascending: true });

  return <Guests initialGuests={guests ?? []} />;
}
