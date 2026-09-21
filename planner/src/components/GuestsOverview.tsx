import Link from "next/link";
import { Armchair, Bus, CalendarClock, Check, FileCheck, House, MessageSquareText, Mail, PartyPopper, Plane, Users, Utensils, Accessibility } from "lucide-react";
import { guestNeeds, guestSummary, type Guest } from "@/lib/guests";
import { GUEST_CAPACITY } from "@/lib/venues";
import { formatDueDate, type HotelBlock } from "@/lib/travel";
import { people, regionCounts, tablesFrom } from "@/lib/guest-overview";

const FOCUS_RING = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-deep focus-visible:ring-offset-2 focus-visible:ring-offset-bg";
const CARD = "rounded-2xl border border-line bg-paper p-5 shadow-sm";
const TABLE_SEATS = 8;

export type Deadline = { label: string; date: string };

function Ring({ attending, declined, total }: { attending: number; declined: number; total: number }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const seg = (n: number) => (total ? (n / total) * c : 0);
  return (
    <div className="relative h-32 w-32 shrink-0">
      <svg viewBox="0 0 128 128" className="h-32 w-32 -rotate-90" aria-hidden>
        <circle cx="64" cy="64" r={r} fill="none" stroke="var(--line)" strokeWidth="13" />
        <circle cx="64" cy="64" r={r} fill="none" stroke="var(--sage-deep)" strokeWidth="13" strokeDasharray={`${seg(attending)} ${c}`} />
        <circle cx="64" cy="64" r={r} fill="none" stroke="var(--wine)" strokeWidth="13" strokeDasharray={`${seg(declined)} ${c}`} strokeDashoffset={-seg(attending)} />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-serif text-3xl font-light">{total ? Math.round((attending / total) * 100) : 0}%</span>
    </div>
  );
}

function Bar({ label, done, of }: { label: string; done: number; of: number }) {
  const pct = of ? Math.round((done / of) * 100) : 0;
  return (
    <li>
      <div className="flex items-center justify-between text-sm">
        <span className="text-ink">{label}</span>
        <span className="text-ink-2">{pct}%</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-line" role="progressbar" aria-label={label} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full rounded-full bg-sage-deep" style={{ width: `${pct}%` }} />
      </div>
    </li>
  );
}

// One round table: seats filled in for whoever is assigned, outlined for the rest.
function TableDot({ seated, label }: { seated: number; label?: string }) {
  const seats = Math.max(TABLE_SEATS, Math.min(seated, 12));
  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 80 80" className="h-20 w-20" role="img" aria-label={label ? `Table ${label}: ${seated} seated` : "Empty table"}>
        <circle cx="40" cy="40" r="19" fill="color-mix(in srgb, var(--gold) 14%, var(--paper))" stroke="var(--line)" />
        {Array.from({ length: seats }, (_, i) => {
          const a = (i / seats) * 2 * Math.PI - Math.PI / 2;
          return <circle key={i} cx={40 + 30 * Math.cos(a)} cy={40 + 30 * Math.sin(a)} r="4.5" fill={i < seated ? "var(--sage-deep)" : "var(--paper)"} stroke={i < seated ? "var(--sage-deep)" : "var(--line)"} />;
        })}
        {label && <text x="40" y="44" textAnchor="middle" fontSize="12" fill="var(--ink-2)">{label}</text>}
      </svg>
    </div>
  );
}

export default function GuestsOverview({ guests, hotelBlocks, deadlines, daysToGo }: { guests: Guest[]; hotelBlocks: HotelBlock[]; deadlines: Deadline[]; daysToGo: number }) {
  const summary = guestSummary(guests, GUEST_CAPACITY);
  const total = summary.totalWithKids;
  const attendingP = guests.filter((g) => g.rsvp_status === "yes").reduce((n, g) => n + people(g), 0);
  const declinedP = guests.filter((g) => g.rsvp_status === "no").reduce((n, g) => n + people(g), 0);
  const awaitingP = total - attendingP - declinedP;
  const plusOnesUnassigned = guests.filter((g) => g.party_size >= 2 && !g.plus_one.trim()).length;
  const n = (f: (g: Guest) => boolean) => guests.filter(f).length;
  const invited = n((g) => g.invitation_sent);
  const responded = n((g) => g.rsvp_status !== "pending");
  const tables = tablesFrom(guests);
  const seatedHouseholds = n((g) => Boolean((g.table_assignment ?? "").trim()));
  const seatedPeople = tables.reduce((s, [, c]) => s + c, 0);
  const dietary = n((g) => guestNeeds(g).includes("dietary"));
  const access = n((g) => guestNeeds(g).includes("accessibility"));
  const lodging = n((g) => g.accommodation_needed);
  const transport = n((g) => g.transportation_needed);
  const { regions, noAddress } = regionCounts(guests);
  const maxRegion = Math.max(1, ...regions.map(([, c]) => c));
  const suggestedTables = Math.max(1, Math.ceil(total / TABLE_SEATS));

  const journey = [
    { label: "Invite", Icon: Mail, status: invited === 0 ? "Not started" : invited === guests.length ? "Done" : `${invited} of ${guests.length} sent` },
    { label: "RSVP", Icon: FileCheck, status: responded === 0 ? "Not started" : responded === guests.length ? "Done" : `${responded} of ${guests.length} in` },
    { label: "Travel", Icon: Plane, status: transport === 0 ? "No requests yet" : `${transport} need${transport === 1 ? "s" : ""} a ride` },
    { label: "Stay", Icon: House, status: lodging === 0 && hotelBlocks.length === 0 ? "Not started" : `${hotelBlocks.length} hotel block${hotelBlocks.length === 1 ? "" : "s"} · ${lodging} need lodging` },
    { label: "Seat", Icon: Armchair, status: seatedHouseholds === 0 ? "Not started" : seatedHouseholds === guests.length ? "Done" : `${seatedHouseholds} of ${guests.length} seated` },
    { label: "Celebrate", Icon: PartyPopper, status: `${daysToGo.toLocaleString("en-US")} days to go` },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-5 lg:grid-cols-3">
        <div className={CARD}>
          <div className="flex items-center gap-4">
            <Users className="h-9 w-9 text-ink-2" strokeWidth={1.25} aria-hidden />
            <div>
              <p className="font-serif text-4xl font-light leading-none">{total}</p>
              <p className="mt-1 text-ink-2">Total guests</p>
            </div>
          </div>
          <p className="mt-5 flex flex-wrap items-baseline gap-x-5 gap-y-1">
            <span><b className="font-serif text-2xl font-normal">{summary.adults}</b> adults</span>
            <span><b className="font-serif text-2xl font-normal">{summary.kids}</b> children</span>
            <span><b className="font-serif text-2xl font-normal">{summary.households}</b> households</span>
          </p>
          {(summary.overBy > 0 || plusOnesUnassigned > 0) && (
            <p className="mt-3 text-sm text-ink-2">
              {summary.overBy > 0 && <span className="font-semibold text-wine">{summary.overBy} over the {GUEST_CAPACITY}-guest target. </span>}
              {plusOnesUnassigned > 0 && <span>{plusOnesUnassigned} plus-one{plusOnesUnassigned === 1 ? "" : "s"} not yet named. </span>}
              <Link href="/guests/list" className={`rounded font-semibold text-sage-deep underline underline-offset-2 ${FOCUS_RING}`}>Review the list →</Link>
            </p>
          )}
        </div>

        <div className={`${CARD} flex items-center gap-5`}>
          <Ring attending={attendingP} declined={declinedP} total={total} />
          <div>
            <h2 className="font-serif text-xl">RSVPs</h2>
            <ul className="mt-2 flex flex-col gap-1.5 text-sm">
              <li className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-sage-deep" aria-hidden />{attendingP} attending</li>
              <li className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-wine" aria-hidden />{declinedP} declined</li>
              <li className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-line" aria-hidden />{awaitingP} awaiting · {summary.pending} household{summary.pending === 1 ? "" : "s"}</li>
            </ul>
          </div>
        </div>

        <div className={CARD}>
          <div className="flex items-baseline justify-between">
            <h2 className="font-serif text-xl">Guest progress</h2>
            <Link href="/guests/list" className={`rounded text-sm text-ink hover:text-sage-deep ${FOCUS_RING}`}>View list →</Link>
          </div>
          <ul className="mt-4 flex flex-col gap-3.5">
            <Bar label="Invites sent" done={invited} of={guests.length} />
            <Bar label="RSVPs received" done={responded} of={guests.length} />
            <Bar label="Seating assigned" done={seatedHouseholds} of={guests.length} />
          </ul>
        </div>
      </div>

      <section className="rounded-2xl bg-[color-mix(in_srgb,var(--sage)_20%,var(--paper))] px-5 py-6 sm:px-8" aria-labelledby="guest-journey">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
          <div className="lg:w-44 lg:shrink-0">
            <h2 id="guest-journey" className="font-serif text-2xl font-light">Guest journey</h2>
            <p className="mt-1 text-sm text-ink-2">A few steps to a warm welcome.</p>
          </div>
          <ol className="grid flex-1 grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 xl:grid-cols-6">
            {journey.map(({ label, Icon, status }, i) => (
              <li key={label} className="flex flex-col items-center text-center">
                <Icon className="h-9 w-9 text-ink" strokeWidth={1.25} aria-hidden />
                <p className="mt-2 text-[15px] font-medium">{i + 1}. {label}</p>
                <p className={`mt-0.5 text-xs ${status === "Done" ? "flex items-center gap-1 font-semibold text-sage-deep" : "text-ink-2"}`}>
                  {status === "Done" && <Check className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />}
                  {status}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section className={CARD} aria-labelledby="guest-regions">
          <h2 id="guest-regions" className="font-serif text-2xl font-light">Where everyone&apos;s coming from</h2>
          <p className="mt-1 text-ink-2">Friends and family near and far.</p>
          {regions.length === 0 ? (
            <p className="mt-5 text-sm text-ink-2">
              No addresses in the guest list yet. Add them to each household and this fills in with where your people are coming from.{" "}
              <Link href="/guests/list" className={`rounded font-semibold text-sage-deep underline underline-offset-2 ${FOCUS_RING}`}>Open the guest list →</Link>
            </p>
          ) : (
            <>
              <ul className="mt-5 flex flex-col gap-3">
                {regions.map(([name, count]) => (
                  <li key={name}>
                    <div className="flex items-baseline justify-between text-sm"><span>{name}</span><span className="text-ink-2">{count}</span></div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-line"><div className="h-full rounded-full bg-sage-deep" style={{ width: `${(count / maxRegion) * 100}%` }} /></div>
                  </li>
                ))}
              </ul>
              {noAddress > 0 && <p className="mt-3 text-xs text-ink-2">{noAddress} household{noAddress === 1 ? "" : "s"} without an address yet.</p>}
            </>
          )}
          <Link href="/guests/travel" className={`mt-5 inline-flex items-center gap-2 rounded-full border border-line px-5 py-2 text-sm hover:border-sage-deep ${FOCUS_RING}`}>View travel &amp; stay →</Link>
        </section>

        <section className={CARD} aria-labelledby="guest-needs">
          <div className="flex items-baseline justify-between">
            <h2 id="guest-needs" className="font-serif text-2xl font-light">Guest needs</h2>
            <Link href="/guests/travel" className={`rounded text-sm hover:text-sage-deep ${FOCUS_RING}`}>Manage →</Link>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {[
              { Icon: House, label: "Lodging", n: lodging, sub: lodging === 1 ? "household needs a place" : "households need a place" },
              { Icon: Bus, label: "Transportation", n: transport, sub: "requests" },
              { Icon: Utensils, label: "Dietary", n: dietary, sub: "special requests" },
              { Icon: Accessibility, label: "Accessibility", n: access, sub: "requests" },
            ].map(({ Icon, label, n: count, sub }) => (
              <div key={label} className="flex gap-3 rounded-xl bg-bg p-4">
                <Icon className="h-7 w-7 shrink-0 text-ink-2" strokeWidth={1.25} aria-hidden />
                <div>
                  <p className="text-sm font-medium">{label}</p>
                  <p className="font-serif text-2xl font-light leading-tight">{count}</p>
                  <p className="text-xs text-ink-2">{sub}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/guests/list" className={`rounded-full bg-surface-olive px-4 py-2 text-sm font-medium text-white ${FOCUS_RING}`}>＋ Add household</Link>
            <Link href="/guests/communications" className={`flex items-center gap-1.5 rounded-full border border-line px-4 py-2 text-sm text-ink hover:border-sage-deep ${FOCUS_RING}`}>
              <MessageSquareText className="h-4 w-4" strokeWidth={1.5} aria-hidden /> Send reminder
            </Link>
          </div>
        </section>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section className={CARD} aria-labelledby="guest-seating">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 id="guest-seating" className="font-serif text-2xl font-light">Your reception is taking shape</h2>
              <p className="mt-1 text-ink-2">
                {tables.length > 0 ? `${tables.length} table${tables.length === 1 ? "" : "s"}` : `About ${suggestedTables} tables at ${TABLE_SEATS} each`} · {seatedPeople} seated · {Math.max(total - seatedPeople, 0)} to seat
              </p>
            </div>
            <Link href="/guests/seating" className={`rounded-full border border-line px-5 py-2 text-sm hover:border-sage-deep ${FOCUS_RING}`}>Open seating plan →</Link>
          </div>
          <div className="mt-5 rounded-2xl bg-[color-mix(in_srgb,var(--sage)_10%,var(--paper))] p-4">
            <p className="mx-auto w-fit rounded-md border border-line bg-paper px-6 py-1.5 font-serif text-sm text-ink-2">Head table</p>
            <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-2">
              {tables.length > 0
                ? tables.map(([label, count]) => <TableDot key={label} label={label} seated={count} />)
                : Array.from({ length: Math.min(suggestedTables, 16) }, (_, i) => <TableDot key={i} seated={0} />)}
            </div>
            {tables.length === 0 && <p className="mt-2 text-center text-xs text-ink-2">Illustrative — tables appear here as you assign guests.</p>}
          </div>
        </section>

        <section className={CARD} aria-labelledby="guest-deadlines">
          <h2 id="guest-deadlines" className="flex items-center gap-2 font-serif text-2xl font-light">
            <CalendarClock className="h-5 w-5 text-ink-2" strokeWidth={1.5} aria-hidden /> Upcoming deadlines
          </h2>
          {deadlines.length === 0 ? (
            <p className="mt-4 text-sm text-ink-2">
              Nothing dated yet. Guest and stationery tasks with a date on the{" "}
              <Link href="/board?view=timeline" className={`rounded font-semibold text-sage-deep underline underline-offset-2 ${FOCUS_RING}`}>Planning Timeline</Link> appear here, along with hotel-block deadlines.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-line/70">
              {deadlines.map((d) => (
                <li key={d.label + d.date} className="flex items-baseline justify-between gap-3 py-2.5 text-sm">
                  <span className="min-w-0 text-ink">{d.label}</span>
                  <span className="shrink-0 text-ink-2">{formatDueDate(d.date)}</span>
                </li>
              ))}
            </ul>
          )}
          <Link href="/board?view=timeline" className={`mt-3 inline-block text-sm font-semibold text-sage-deep underline underline-offset-2 ${FOCUS_RING}`}>View all →</Link>
        </section>
      </div>

      <div className="relative grid overflow-hidden rounded-2xl bg-[color-mix(in_srgb,var(--sage)_24%,var(--paper))] sm:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/photo-candlelit-table.jpg" alt="" loading="lazy" className="h-44 w-full object-cover object-[50%_60%] sm:h-full" />
        <p className="flex items-center px-8 py-6 font-serif text-2xl font-light leading-snug">
          Different places.
          <br />
          Same table.
        </p>
      </div>
    </div>
  );
}
