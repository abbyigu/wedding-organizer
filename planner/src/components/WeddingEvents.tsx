"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, CalendarCheck, CalendarDays, CheckCircle2, Clock, Hourglass, MapPin, Plus, ScrollText, Shirt, UserRound, UserX, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Guest } from "@/lib/guests";
import EventsViewTabs from "@/components/EventsViewTabs";
import NewEventDialog, { type NewEvent } from "@/components/NewEventDialog";
import { blankWeddingEvent, EVENT_PHOTOS, eventCounts, eventHref, inviteLabel, type EventGuest, type WeddingEvent } from "@/lib/wedding-events";

const FOCUS_RING = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-deep focus-visible:ring-offset-2 focus-visible:ring-offset-bg";

function tagTint(tag: string) {
  const t = tag.toLowerCase();
  const c = t.includes("formal") && !t.includes("informal") ? "var(--surface-blush)" : t.includes("informal") ? "var(--sage)" : "var(--gold)";
  return `color-mix(in srgb, ${c} 28%, var(--paper))`;
}

const dateParts = (d: string) => {
  const dt = new Date(`${d}T12:00:00Z`);
  const f = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-CA", { ...o, timeZone: "UTC" }).format(dt);
  return { day: f({ weekday: "short" }).toUpperCase(), md: f({ month: "short", day: "numeric" }).toUpperCase(), year: f({ year: "numeric" }) };
};

export default function WeddingEvents({ initialEvents, initialEventGuests, guests }: { initialEvents: WeddingEvent[]; initialEventGuests: EventGuest[]; guests: Guest[] }) {
  const [events, setEvents] = useState(initialEvents);
  const [show, setShow] = useState<"upcoming" | "past">("upcoming");
  const [adding, setAdding] = useState(false);
  const supabase = createClient();

  const today = new Date().toISOString().slice(0, 10);
  const isPast = (e: WeddingEvent) => !!e.event_date && e.event_date < today;
  const sorted = [...events].sort((a, b) => (a.event_date ?? "9999").localeCompare(b.event_date ?? "9999") || a.sort_order - b.sort_order);
  const upcoming = sorted.filter((e) => !isPast(e));
  const past = sorted.filter(isPast);
  const shown = show === "upcoming" ? upcoming : past;

  const counts = new Map(events.map((e) => [e.id, eventCounts(e, guests, initialEventGuests)]));
  const totals = [...counts.values()].reduce((t, c) => ({ attending: t.attending + c.attending, replied: t.replied + c.attending + c.declined }), { attending: 0, replied: 0 });

  async function createEvent(n: NewEvent): Promise<string | null> {
    const { data, error } = await supabase.from("wedding_events").insert({ ...blankWeddingEvent(events.length), ...n }).select().single();
    if (error) return error.message;
    setEvents((es) => [...es, data as WeddingEvent]);
    return null;
  }

  const addBtn = (cls: string) => (
    <button onClick={() => setAdding(true)} className={`flex shrink-0 items-center justify-center gap-1.5 rounded-full px-5 py-3 text-sm font-semibold ${cls} ${FOCUS_RING}`}>
      <Plus className="h-4 w-4" strokeWidth={2} aria-hidden /> Add event
    </button>
  );

  return (
    <div className="flex flex-col gap-8">
      <section aria-label="Events summary" className="flex flex-wrap items-center gap-x-10 gap-y-4 rounded-2xl border border-line bg-paper px-5 py-4 shadow-sm sm:px-6">
        {[
          { Icon: CalendarCheck, n: events.length, label: events.length === 1 ? "event planned" : "events planned" },
          { Icon: UserRound, n: totals.attending, label: "attending (so far)" },
          { Icon: CheckCircle2, n: totals.replied, label: "responded" },
        ].map(({ Icon, n, label }) => (
          <div key={label} className="flex items-center gap-3">
            <Icon className="h-7 w-7 text-ink-2" strokeWidth={1.25} aria-hidden />
            <p><span className="font-serif text-3xl font-medium">{n}</span> <span className="text-sm text-ink-2">{label}</span></p>
          </div>
        ))}
        <div className="ml-auto">{addBtn("bg-surface-green text-white")}</div>
      </section>

      <section aria-label="Our events">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-serif text-3xl font-medium">Our events</h2>
            <p className="text-ink-2">Every wedding-related event, and who&apos;s invited.</p>
          </div>
          <EventsViewTabs active="all" />
          <div role="tablist" aria-label="Upcoming or past" className="flex rounded-full border border-line bg-paper p-1 text-sm">
            {([["upcoming", "Upcoming", upcoming.length], ["past", "Past", past.length]] as const).map(([k, label, n]) => (
              <button key={k} role="tab" aria-selected={show === k} onClick={() => setShow(k)} className={`rounded-full px-4 py-2 font-semibold ${show === k ? "bg-surface-green text-white" : "text-ink-2 hover:text-ink"} ${FOCUS_RING}`}>
                {label} ({n})
              </button>
            ))}
          </div>
        </div>

        <ul className="mt-5 flex flex-col gap-5">
          {shown.length === 0 && (
            <li className="rounded-2xl border border-dashed border-line p-8 text-center text-sm text-ink-2">
              {show === "upcoming" ? "No events coming up. Add the welcome party, rehearsal dinner, brunch, or anything else on the weekend." : "Nothing in the past yet."}
            </li>
          )}
          {shown.map((ev, i) => {
            const c = counts.get(ev.id)!;
            const d = ev.event_date ? dateParts(ev.event_date) : null;
            const facts = [
              ev.time && { Icon: Clock, text: ev.time },
              ev.location && { Icon: MapPin, text: ev.location },
              ev.dress_code && { Icon: Shirt, text: `Dress code: ${ev.dress_code}` },
              { Icon: ScrollText, text: `Invited: ${inviteLabel(ev)}` },
            ].filter(Boolean) as { Icon: typeof Clock; text: string }[];
            return (
              <li key={ev.id} className="group relative grid overflow-hidden rounded-2xl border border-line bg-paper shadow-sm md:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)_minmax(0,15rem)]">
                <div className="relative h-48 md:h-auto md:min-h-[13rem]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={ev.photo_url || EVENT_PHOTOS[i % EVENT_PHOTOS.length]} alt="" className="absolute inset-0 h-full w-full object-cover" />
                  <div className="absolute left-3 top-3 rounded-xl bg-paper/95 px-3 py-2 text-center shadow-sm">
                    {d ? (
                      <>
                        <p className="text-xs font-medium tracking-[0.14em] text-ink-2">{d.day}</p>
                        <p className="font-serif text-lg font-semibold leading-tight">{d.md}</p>
                        <p className="text-xs text-ink-2">{d.year}</p>
                      </>
                    ) : (
                      <p className="flex items-center gap-1.5 text-xs font-semibold text-ink-2"><CalendarDays className="h-3.5 w-3.5" aria-hidden />Date TBD</p>
                    )}
                  </div>
                </div>

                <div className="min-w-0 p-5 sm:p-6">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="font-serif text-2xl font-medium">
                      <Link href={eventHref(ev)} className={`after:absolute after:inset-0 ${FOCUS_RING}`}>{ev.title}</Link>
                    </h3>
                    {ev.tag && <span className="rounded-full px-3 py-1 text-xs font-semibold text-ink" style={{ backgroundColor: tagTint(ev.tag) }}>{ev.tag}</span>}
                  </div>
                  <p className="mt-1.5 text-ink-2">{ev.description || "Add a line about this one on its page."}</p>
                  <ul className="mt-4 flex flex-col gap-2 text-sm">
                    {facts.map(({ Icon, text }) => (
                      <li key={text} className="flex items-start gap-3">
                        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-ink-2" strokeWidth={1.5} aria-hidden />
                        <span className="min-w-0">{text}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex flex-col justify-between gap-4 border-t border-line p-5 md:col-span-2 lg:col-span-1 lg:border-l lg:border-t-0 sm:p-6">
                  <dl className="flex flex-col gap-2 text-sm">
                    {[
                      { Icon: Users, n: c.attending, label: "attending" },
                      { Icon: UserX, n: c.declined, label: "declined" },
                      { Icon: Hourglass, n: c.awaiting, label: "awaiting" },
                    ].map(({ Icon, n, label }) => (
                      <div key={label} className="flex items-center gap-3">
                        <Icon className="h-4 w-4 text-ink-2" strokeWidth={1.5} aria-hidden />
                        <dt className="sr-only">{label}</dt>
                        <dd>{n} {label}</dd>
                      </div>
                    ))}
                  </dl>
                  <span className="flex items-center justify-center gap-1.5 rounded-full border border-line px-4 py-2.5 text-sm font-semibold group-hover:bg-bg">
                    View details <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-label="Add another event" className="relative flex flex-wrap items-center justify-between gap-x-10 gap-y-4 overflow-hidden rounded-2xl bg-[color-mix(in_srgb,var(--sage)_22%,var(--paper))] px-6 py-6 sm:px-10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/botanical-accent.webp" alt="" aria-hidden className="pointer-events-none h-20 w-auto -scale-x-100 opacity-70" />
        <p className="font-script text-3xl leading-tight text-ink-2">
          It&apos;s not just a wedding —
          <br />
          it&apos;s a weekend.
        </p>
        <div className="min-w-[14rem] flex-1 sm:border-l sm:border-line sm:pl-10">
          <p className="font-semibold">Need to add something else?</p>
          <p className="text-sm text-ink-2">Brunch, activity, boat tour, anything goes.</p>
        </div>
        {addBtn("border border-ink/25 bg-paper text-ink hover:bg-bg")}
      </section>

      {adding && <NewEventDialog onClose={() => setAdding(false)} onCreate={createEvent} />}
    </div>
  );
}
