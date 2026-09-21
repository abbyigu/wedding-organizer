"use client";

import { useState } from "react";
import Link from "next/link";
import { BedDouble, Bus, Camera, Car, Check, Circle, Clock, Coffee, Heart, MapPin, Music, Pencil, Plus, Shirt, Sparkles, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Guest } from "@/lib/guests";
import EventsViewTabs from "@/components/EventsViewTabs";
import NewEventDialog, { type NewEvent } from "@/components/NewEventDialog";
import TimelineMomentDialog, { type MomentForm } from "@/components/TimelineMomentDialog";
import { blankWeddingEvent, EVENT_PHOTOS, eventCounts, eventHref, eventStepsDone, parseMinutes, type EventExpense, type EventGuest, type TimelineMoment, type WeddingEvent } from "@/lib/wedding-events";

const FOCUS_RING = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-deep focus-visible:ring-offset-2 focus-visible:ring-offset-bg";
const KIND_ICON: Record<string, typeof Clock> = { free: Coffee, checkin: BedDouble, transport: Car, "getting-ready": Sparkles, photos: Camera, shuttle: Bus, "after-party": Music, other: Clock };

export type WeddingDayItem = { id: string; time: string; title: string };

type Entry =
  | { type: "event"; ev: WeddingEvent; at: number }
  | { type: "moment"; m: TimelineMoment; at: number }
  | { type: "wedding-day"; at: number };

const dayLabel = (d: string) => {
  const dt = new Date(`${d}T12:00:00Z`);
  const f = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-CA", { ...o, timeZone: "UTC" }).format(dt);
  return { weekday: f({ weekday: "long" }), date: f({ month: "long", day: "numeric", year: "numeric" }) };
};

export default function WeddingWeekend({
  initialEvents,
  initialEventGuests,
  guests,
  expenses,
  initialMoments,
  momentsMissing,
  weddingDate,
  weddingDayItems,
}: {
  initialEvents: WeddingEvent[];
  initialEventGuests: EventGuest[];
  guests: Guest[];
  expenses: EventExpense[];
  initialMoments: TimelineMoment[];
  momentsMissing: boolean;
  weddingDate: string | null;
  weddingDayItems: WeddingDayItem[];
}) {
  const supabase = createClient();
  const [events, setEvents] = useState(initialEvents);
  const [moments, setMoments] = useState(initialMoments);
  const [addingEvent, setAddingEvent] = useState(false);
  const [momentDialog, setMomentDialog] = useState<{ moment?: TimelineMoment } | null>(null);

  async function createEvent(n: NewEvent): Promise<string | null> {
    const { data, error } = await supabase.from("wedding_events").insert({ ...blankWeddingEvent(events.length), ...n }).select().single();
    if (error) return error.message;
    setEvents((es) => [...es, data as WeddingEvent]);
    return null;
  }

  async function saveMoment(id: string | null, f: MomentForm): Promise<string | null> {
    if (id) {
      const { error } = await supabase.from("timeline_moments").update(f).eq("id", id);
      if (error) return error.message;
      setMoments((ms) => ms.map((m) => (m.id === id ? { ...m, ...f } : m)));
    } else {
      const { data, error } = await supabase.from("timeline_moments").insert({ ...f, sort_order: moments.length }).select().single();
      if (error) return error.message;
      setMoments((ms) => [...ms, data as TimelineMoment]);
    }
    return null;
  }

  async function removeMoment(id: string) {
    setMomentDialog(null);
    setMoments((ms) => ms.filter((m) => m.id !== id));
    await supabase.from("timeline_moments").delete().eq("id", id);
  }

  // Group everything by real date. Events without a date wait at the end.
  const days = new Map<string, Entry[]>();
  const push = (d: string, e: Entry) => days.set(d, [...(days.get(d) ?? []), e]);
  for (const ev of events) push(ev.event_date ?? "tbd", { type: "event", ev, at: parseMinutes(ev.time) });
  for (const m of moments) push(m.moment_date, { type: "moment", m, at: parseMinutes(m.time) });
  if (weddingDate) push(weddingDate, { type: "wedding-day", at: parseMinutes(weddingDayItems[0]?.time ?? "3 pm") });
  const keys = [...days.keys()].sort((a, b) => (a === "tbd" ? 1 : b === "tbd" ? -1 : a.localeCompare(b)));

  const btn = `flex items-center justify-center gap-1.5 rounded-full px-5 py-3 text-sm font-semibold ${FOCUS_RING}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-serif text-3xl font-medium">Our Wedding Weekend ♡</h2>
          <p className="text-ink-2">A few days, all our favourite people.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <EventsViewTabs active="weekend" />
          <button onClick={() => setMomentDialog({})} className={`${btn} border border-ink/25 bg-paper text-ink hover:bg-bg`}><Plus className="h-4 w-4" aria-hidden />Add timeline moment</button>
          <button onClick={() => setAddingEvent(true)} className={`${btn} bg-surface-green text-white`}><Plus className="h-4 w-4" aria-hidden />Add event</button>
        </div>
      </div>

      {keys.length === 0 && <p className="rounded-2xl border border-dashed border-line p-8 text-center text-sm text-ink-2">Nothing on the weekend yet. Add an event or a timeline moment, and give events a date so they land on the right day.</p>}

      {keys.map((k, di) => {
        const entries = (days.get(k) ?? []).sort((a, b) => a.at - b.at);
        const first = entries.find((e) => e.type === "event") as Extract<Entry, { type: "event" }> | undefined;
        const photo = first?.ev.photo_url || EVENT_PHOTOS[di % EVENT_PHOTOS.length];
        const label = k === "tbd" ? null : dayLabel(k);
        return (
          <section key={k} aria-label={label?.weekday ?? "Date to be decided"} className="flex flex-col">
            <div className="relative overflow-hidden rounded-t-2xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo} alt="" className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-0 bg-[linear-gradient(100deg,color-mix(in_srgb,var(--wine)_85%,black)_0%,color-mix(in_srgb,var(--wine)_45%,transparent)_55%,rgba(0,0,0,0.15)_100%)]" />
              <div className="relative px-6 py-6 text-white sm:px-8">
                <h3 className="font-serif text-3xl font-medium uppercase tracking-[0.14em]">{label?.weekday ?? "Date to be decided"}</h3>
                <p className="text-sm text-white/85">{label?.date ?? "Give these events a date to place them on the weekend."}</p>
              </div>
            </div>
            <ul className="flex flex-col divide-y divide-line rounded-b-2xl border border-t-0 border-line bg-paper">
              {entries.map((en) => {
                if (en.type === "moment") {
                  const Icon = KIND_ICON[en.m.kind] ?? Clock;
                  return (
                    <li key={en.m.id} className="flex items-center gap-4 bg-[color-mix(in_srgb,var(--sage)_10%,var(--paper))] px-5 py-4 sm:px-8">
                      <Icon className="h-5 w-5 shrink-0 text-sage-deep" strokeWidth={1.4} aria-hidden />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold">{en.m.title}{en.m.time && <span className="ml-2 font-normal text-ink-2">{en.m.time}</span>}</p>
                        {en.m.note && <p className="text-sm text-ink-2">{en.m.note}</p>}
                      </div>
                      <button onClick={() => setMomentDialog({ moment: en.m })} aria-label={`Edit ${en.m.title}`} className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink-2 hover:text-ink ${FOCUS_RING}`}><Pencil className="h-4 w-4" strokeWidth={1.5} aria-hidden /></button>
                    </li>
                  );
                }
                if (en.type === "wedding-day") {
                  return (
                    <li key="wedding-day" className="bg-[color-mix(in_srgb,var(--surface-wine)_9%,var(--paper))] px-5 py-5 sm:px-8">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <Heart className="h-6 w-6 text-wine" strokeWidth={1.4} aria-hidden />
                          <div>
                            <p className="font-serif text-2xl font-medium">Wedding Day</p>
                            <p className="text-sm text-ink-2">The full run-of-show lives on the Wedding Day page.</p>
                          </div>
                        </div>
                        <Link href="/wedding-day" className={`rounded-full border border-line px-4 py-2.5 text-sm font-semibold hover:bg-bg ${FOCUS_RING}`}>Open run-of-show →</Link>
                      </div>
                      {weddingDayItems.length > 0 && (
                        <ul className="mt-3 grid gap-x-8 gap-y-1 text-sm sm:grid-cols-2">
                          {weddingDayItems.slice(0, 8).map((w) => (
                            <li key={w.id} className="flex gap-3"><span className="w-20 shrink-0 text-ink-2">{w.time}</span><span>{w.title}</span></li>
                          ))}
                        </ul>
                      )}
                    </li>
                  );
                }
                const ev = en.ev;
                const c = eventCounts(ev, guests, initialEventGuests);
                const evExpenses = expenses.filter((x) => x.event_id === ev.id);
                const done = eventStepsDone(ev, evExpenses);
                const chips = [
                  ["Date & place", done.place],
                  ["Guests", c.attending + c.declined > 0],
                  ["Menu", done.menu],
                  ["Vendor", done.vendor],
                  ["Budget", done.budget],
                ] as const;
                return (
                  <li key={ev.id} className="group relative grid md:grid-cols-[14rem_minmax(0,1fr)]">
                    <div className="relative h-40 md:h-auto">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={ev.photo_url || EVENT_PHOTOS[ev.sort_order % EVENT_PHOTOS.length]} alt="" className="absolute inset-0 h-full w-full object-cover" />
                    </div>
                    <div className="min-w-0 p-5 sm:p-6">
                      <div className="flex flex-wrap items-center gap-3">
                        <h4 className="font-serif text-2xl font-medium"><Link href={eventHref(ev)} className={`after:absolute after:inset-0 ${FOCUS_RING}`}>{ev.title}</Link></h4>
                        {ev.tag && <span className="rounded-full bg-[color-mix(in_srgb,var(--sage)_28%,var(--paper))] px-3 py-1 text-xs font-semibold">{ev.tag}</span>}
                      </div>
                      {ev.description && <p className="mt-1 text-ink-2">{ev.description}</p>}
                      <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-1.5 text-sm">
                        {ev.time && <li className="flex items-center gap-2"><Clock className="h-4 w-4 text-ink-2" strokeWidth={1.5} aria-hidden />{ev.time}</li>}
                        {ev.location && <li className="flex items-center gap-2"><MapPin className="h-4 w-4 text-ink-2" strokeWidth={1.5} aria-hidden />{ev.location}</li>}
                        <li className="flex items-center gap-2"><Users className="h-4 w-4 text-ink-2" strokeWidth={1.5} aria-hidden />{c.attending} attending of {c.invited} invited</li>
                        {ev.dress_code && <li className="flex items-center gap-2"><Shirt className="h-4 w-4 text-ink-2" strokeWidth={1.5} aria-hidden />{ev.dress_code}</li>}
                      </ul>
                      <ul aria-label="Planning status" className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                        {chips.map(([label, ok]) => (
                          <li key={label} className={`flex items-center gap-1 ${ok ? "text-sage-deep" : "text-ink-2"}`}>
                            {ok ? <Check className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden /> : <Circle className="h-3 w-3" strokeWidth={1.75} aria-hidden />}
                            {label}
                            <span className="sr-only">{ok ? "done" : "still to do"}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      {momentsMissing && <p className="text-sm text-ink-2">Timeline moments need one small database update (migration 040) before they can be saved.</p>}
      {addingEvent && <NewEventDialog onClose={() => setAddingEvent(false)} onCreate={createEvent} />}
      {momentDialog && (
        <TimelineMomentDialog
          moment={momentDialog.moment}
          onClose={() => setMomentDialog(null)}
          onSave={(f) => saveMoment(momentDialog.moment?.id ?? null, f)}
          onRemove={momentDialog.moment ? () => removeMoment(momentDialog.moment!.id) : undefined}
        />
      )}
    </div>
  );
}
