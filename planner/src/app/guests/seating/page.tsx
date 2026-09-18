import { createClient } from "@/lib/supabase/server";
import GuestsComingLater from "@/components/GuestsComingLater";

export const dynamic = "force-dynamic";

export default async function SeatingPage() {
  const supabase = await createClient();
  const { data: guests } = await supabase.from("guests").select("rsvp_status");
  const total = guests?.length ?? 0;
  const responded = guests?.filter((g) => g.rsvp_status !== "pending").length ?? 0;

  return (
    <GuestsComingLater
      title="Coming once enough RSVPs are in"
      description={
        total > 0
          ? `${responded} of ${total} households have responded so far. Seating works best once you know who's actually coming — the drag-and-drop tool itself is still being built.`
          : "Seating works best once you know who's actually coming. It'll unlock as RSVPs arrive."
      }
      items={[
        "Drag-and-drop guests between tables",
        "Household and couple grouping",
        "Keep-together and keep-apart notes",
        "Highchairs and booster seats",
        "Accessibility placement",
        "Meal and allergy indicators",
        "Table capacity",
        "Unassigned-guest list",
        "Printable seating chart",
        "Export for the venue or caterer",
      ]}
      cta={{ label: "Review RSVPs →", href: "/guests/rsvp" }}
    />
  );
}
