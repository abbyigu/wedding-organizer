import type { SupabaseClient } from "@supabase/supabase-js";
import type { IdeaImage } from "@/lib/registry";
import { openFollowUps, type FollowUp, type Vendor, type VendorComm, type VendorPayment } from "@/lib/vendors";

// Everything the vendor pages share, read once. The communication table only exists after migration 046,
// so an error there is how we know to show the "run the migration" note instead of an empty page.
export async function loadVendorData(supabase: SupabaseClient) {
  const [{ data: vendors }, { data: comms, error: commsError }, { data: payments }, { data: pins }, { data: venues }] = await Promise.all([
    supabase.from("vendors").select("*").order("sort_order", { ascending: true }),
    supabase.from("vendor_communications").select("*"),
    supabase.from("payments").select("id, vendor_id, label, amount, due_date, status"),
    supabase.from("idea_pins").select("id, title, image_url").neq("image_url", "").order("sort_order", { ascending: true }),
    supabase.from("venues").select("id, name, is_final"),
  ]);
  const rows = ((vendors ?? []) as Vendor[]).map((v) => ({ ...v, photos: v.photos ?? [], line_items: v.line_items ?? [] }));
  const commRows = (comms ?? []) as VendorComm[];
  const followUps: FollowUp[] = openFollowUps(commRows);
  return {
    vendors: rows,
    comms: commRows,
    followUps,
    payments: ((payments ?? []) as VendorPayment[]).filter((p) => p.vendor_id),
    ideas: (pins ?? []) as IdeaImage[],
    venues: (venues ?? []) as { id: string; name: string; is_final: boolean }[],
    needsMigration: Boolean(commsError),
  };
}
