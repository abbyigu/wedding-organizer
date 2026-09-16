import { createClient } from "@/lib/supabase/server";
import Dashboard from "@/components/Dashboard";
import { displayName } from "@/lib/auth-names";
import { getBudgetContext } from "@/lib/budget-context";

// Always read fresh from Supabase — this page must never show stale data
// (e.g. a photo just added on a venue's profile) from Next's route cache.
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: venues } = await supabase
    .from("venues")
    .select("*")
    .order("sort_order", { ascending: true });

  const coverPaths = (venues ?? [])
    .map((v) => v.photos?.[0]?.path)
    .filter((p): p is string => Boolean(p));

  let photoUrls: Record<string, string> = {};
  if (coverPaths.length) {
    const { data } = await supabase.storage.from("venue-photos").createSignedUrls(coverPaths, 3600);
    photoUrls = Object.fromEntries((data ?? []).map((d) => [d.path ?? "", d.signedUrl ?? ""]));
  }

  const { assumptions, sharedVals } = await getBudgetContext(supabase);

  return (
    <Dashboard
      initialVenues={venues ?? []}
      userName={displayName(user?.email)}
      photoUrls={photoUrls}
      assumptions={assumptions}
      sharedVals={sharedVals}
    />
  );
}
