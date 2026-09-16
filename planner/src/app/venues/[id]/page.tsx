import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import VenueProfile from "@/components/VenueProfile";

export default async function VenuePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: venue } = await supabase.from("venues").select("*").eq("id", id).single();
  if (!venue) notFound();

  const photoPaths = (venue.photos ?? []).map((p: { path: string }) => p.path);
  let signedUrls: Record<string, string> = {};
  if (photoPaths.length) {
    const { data } = await supabase.storage.from("venue-photos").createSignedUrls(photoPaths, 3600);
    signedUrls = Object.fromEntries((data ?? []).map((d) => [d.path ?? "", d.signedUrl ?? ""]));
  }

  return <VenueProfile venue={venue} signedUrls={signedUrls} />;
}
