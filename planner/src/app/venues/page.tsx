import { createClient } from "@/lib/supabase/server";
import VenueShortlist from "@/components/VenueShortlist";
import { displayName } from "@/lib/auth-names";
import { getBudgetContext } from "@/lib/budget-context";

export const dynamic = "force-dynamic";

export default async function VenuesPage() {
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
    <VenueShortlist
      initialVenues={venues ?? []}
      userName={displayName(user?.email)}
      photoUrls={photoUrls}
      assumptions={assumptions}
      sharedVals={sharedVals}
    />
  );
}
