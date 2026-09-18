import Link from "next/link";
import { Bus, CalendarClock, Home as HomeIcon, MessageSquareText, UserPlus, UserRoundX, Users, Utensils } from "lucide-react";
import { guestNeeds, guestSummary, type Guest } from "@/lib/guests";
import { GUEST_CAPACITY } from "@/lib/venues";
import { formatDueDate, type HotelBlock } from "@/lib/travel";

const FOCUS_RING = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-deep focus-visible:ring-offset-2 focus-visible:ring-offset-bg";

function StatCard({ icon: Icon, value, label, sub, warn }: { icon: typeof Users; value: string | number; label: string; sub: string; warn?: boolean }) {
  return (
    <div className="rounded-2xl border border-line bg-paper p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <Icon className="h-5 w-5 text-ink-2" strokeWidth={1.5} aria-hidden />
        <span className="text-xs font-semibold uppercase tracking-wide text-ink-2">{label}</span>
      </div>
      <b className={`mt-3 block font-serif text-2xl ${warn ? "text-wine" : ""}`}>{value}</b>
      <p className={`mt-1 text-sm ${warn ? "font-semibold text-wine" : "text-ink-2"}`}>{sub}</p>
    </div>
  );
}

export default function GuestsOverview({ guests, hotelBlocks }: { guests: Guest[]; hotelBlocks: HotelBlock[] }) {
  const summary = guestSummary(guests, GUEST_CAPACITY);
  const attending = guests.filter((g) => g.rsvp_status === "yes").length;
  const declined = guests.filter((g) => g.rsvp_status === "no").length;
  const plusOnesUnassigned = guests.filter((g) => g.party_size >= 2 && !g.plus_one.trim()).length;
  const dietaryCount = guests.filter((g) => guestNeeds(g).includes("dietary")).length;
  const accessibilityCount = guests.filter((g) => guestNeeds(g).includes("accessibility")).length;
  const accommodationCount = guests.filter((g) => g.accommodation_needed).length;
  const transportationCount = guests.filter((g) => g.transportation_needed).length;

  const todayStr = new Date().toISOString().slice(0, 10);
  const in30 = new Date();
  in30.setDate(in30.getDate() + 30);
  const in30Str = in30.toISOString().slice(0, 10);
  const upcomingDeadlines = hotelBlocks
    .filter((h) => h.booking_deadline && h.booking_deadline >= todayStr && h.booking_deadline <= in30Str)
    .sort((a, b) => (a.booking_deadline ?? "").localeCompare(b.booking_deadline ?? ""));

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users} value={summary.households} label="Households" sub={`${summary.totalWithKids} individuals`} />
        <StatCard icon={Users} value={attending} label="Attending" sub={`${declined} declined · ${summary.pending} awaiting`} />
        <StatCard
          icon={UserRoundX}
          value={summary.overBy > 0 ? `+${summary.overBy}` : summary.overBy}
          label="Vs. target"
          sub={summary.overBy > 0 ? `over the ${GUEST_CAPACITY}-guest target` : `within the ${GUEST_CAPACITY}-guest target`}
          warn={summary.overBy > 0}
        />
        <StatCard icon={UserPlus} value={plusOnesUnassigned} label="Plus-ones" sub="not yet named" warn={plusOnesUnassigned > 0} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users} value={`${summary.adults} / ${summary.kids}`} label="Adults / children" sub="across all households" />
        <StatCard icon={Utensils} value={dietaryCount + accessibilityCount} label="Dietary & access." sub={`${dietaryCount} dietary · ${accessibilityCount} accessibility`} />
        <StatCard icon={HomeIcon} value={accommodationCount} label="Need lodging" sub="accommodation not yet booked" />
        <StatCard icon={Bus} value={transportationCount} label="Need transport" sub="transportation requested" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="rounded-2xl border border-line bg-paper p-5 shadow-sm">
          <h2 className="font-serif text-xl font-medium">Quick actions</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/guests/list" className={`rounded-full bg-sage-deep px-4 py-2 text-sm font-semibold text-white ${FOCUS_RING}`}>
              ＋ Add household
            </Link>
            <Link href="/guests/communications" className={`flex items-center gap-1.5 rounded-full border border-line px-4 py-2 text-sm font-semibold text-ink-2 hover:border-sage-deep hover:text-ink ${FOCUS_RING}`}>
              <MessageSquareText className="h-4 w-4" strokeWidth={1.5} aria-hidden />
              Send reminder
            </Link>
            <Link href="/guests/travel" className={`flex items-center gap-1.5 rounded-full border border-line px-4 py-2 text-sm font-semibold text-ink-2 hover:border-sage-deep hover:text-ink ${FOCUS_RING}`}>
              <HomeIcon className="h-4 w-4" strokeWidth={1.5} aria-hidden />
              Assign lodging
            </Link>
          </div>

          {summary.overBy > 0 && (
            <p className="mt-4 rounded-xl border border-line bg-bg p-3 text-sm text-ink-2">
              <b className="text-wine">{summary.overBy} guest{summary.overBy === 1 ? "" : "s"} over target.</b>{" "}
              <Link href="/guests/list" className={`font-semibold text-sage-deep underline underline-offset-2 ${FOCUS_RING}`}>Review the list →</Link>
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-line bg-paper p-5 shadow-sm">
          <h2 className="flex items-center gap-2 font-serif text-lg font-medium">
            <CalendarClock className="h-4 w-4 text-ink-2" strokeWidth={1.5} aria-hidden />
            Upcoming deadlines
          </h2>
          {upcomingDeadlines.length === 0 ? (
            <p className="mt-3 text-sm text-ink-2">Nothing due in the next 30 days.</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2">
              {upcomingDeadlines.map((h) => (
                <li key={h.id} className="flex items-center justify-between gap-2 rounded-xl border border-line bg-bg p-2.5 text-sm">
                  <span className="min-w-0 truncate font-semibold text-ink">{h.name}</span>
                  <span className="shrink-0 text-xs text-ink-2">{formatDueDate(h.booking_deadline!)}</span>
                </li>
              ))}
            </ul>
          )}
          <Link href="/guests/travel" className={`mt-3 inline-block text-sm font-semibold text-sage-deep underline underline-offset-2 ${FOCUS_RING}`}>
            Manage travel & stay →
          </Link>
        </div>
      </div>
    </div>
  );
}
