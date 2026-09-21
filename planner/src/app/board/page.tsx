import { createClient } from "@/lib/supabase/server";
import Board from "@/components/Board";
import { displayName } from "@/lib/auth-names";
import { daysUntil } from "@/lib/dashboard";
import { DEFAULT_BUDGET_SETTINGS } from "@/lib/venues";

export const dynamic = "force-dynamic";

export default async function BoardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [{ data: tasks }, { data: settings }, { data: venues }, { data: ideas }] = await Promise.all([
    supabase.from("planning_tasks").select("*").order("sort_order", { ascending: true }),
    supabase.from("budget_settings").select("wedding_date").eq("id", true).maybeSingle(),
    supabase.from("venues").select("status, photos").order("sort_order", { ascending: true }),
    supabase.from("idea_pins").select("image_url").eq("visibility", "shared").order("sort_order", { ascending: true }),
  ]);

  const coverPath = (venues ?? []).filter((v) => v.status !== "out").map((v) => v.photos?.[0]?.path as string | undefined).find(Boolean);
  const venuePhoto = coverPath ? (await supabase.storage.from("venue-photos").createSignedUrl(coverPath, 3600)).data?.signedUrl ?? null : null;

  return (
    <Board
      initialTasks={tasks ?? []}
      userName={displayName(user?.email)}
      daysToGo={daysUntil(settings?.wedding_date ?? DEFAULT_BUDGET_SETTINGS.wedding_date)}
      heroImage={venuePhoto ?? ideas?.find((i) => i.image_url)?.image_url ?? null}
    />
  );
}
