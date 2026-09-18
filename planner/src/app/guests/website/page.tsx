import GuestsComingLater from "@/components/GuestsComingLater";

export default function GuestWebsitePage() {
  return (
    <GuestsComingLater
      title="Coming later"
      description="A public, guest-facing page publishing the approved schedule, travel and hotel info, dress code, FAQ and an RSVP form — pulling from what's already managed here rather than duplicating it. This needs a decision on public access first: an open link, or per-guest RSVP codes, since it's the first part of this app anyone outside the two of you would see."
      items={[
        "Date, location & schedule",
        "Travel directions & hotel blocks",
        "Dress code & FAQ",
        "Children policy & registry",
        "Local recommendations",
        "RSVP form",
        "English / French content",
        "Visibility: public, invited-only, per-event, wedding-party-only, draft",
      ]}
    />
  );
}
