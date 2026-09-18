import GuestsComingLater from "@/components/GuestsComingLater";

export default function CommunicationsPage() {
  return (
    <GuestsComingLater
      title="Coming later"
      description="A central place to message guests — save-the-dates, invitations, reminders, travel and hotel updates, welcome messages, thank-you cards. Actually sending mail or email needs a provider decision (which service, whose account) before it's built, not just UI."
      items={[
        "Save-the-dates & invitations",
        "RSVP reminders",
        "Travel & hotel-booking updates",
        "Schedule-change notices",
        "Welcome messages & thank-you cards",
        "English / French / bilingual templates",
        "Household personalization",
        "Send status & delivery history",
        "Reminder scheduling",
        "Address labels & envelope export",
        "Pre-send guest filters (e.g. unbooked US guests)",
      ]}
    />
  );
}
