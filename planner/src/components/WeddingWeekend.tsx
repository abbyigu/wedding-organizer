"use client";

import { useState } from "react";
import Link from "next/link";
import { BedDouble, Bus, Camera, Car, Check, Circle, Clock, Coffee, Heart, MapPin, Music, Pencil, Plus, Shirt, Sparkles, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Guest } from "@/lib/guests";
import EventsViewTabs from "@/components/EventsViewTabs";
import NewEventDialog, { type NewEvent } from "@/components/NewEventDialog";
import TimelineMomentDialog, { type MomentForm } from "@/components/TimelineMomentDialog";
import { AUDIENCE_LABEL, AUDIENCE_ORDER, buildDays, VIEWS, visibleTo, type Arrival, type Audience, type DayItem, type WeekendEntry, type WeekendView } from "@/lib/weekend";
import { blankWeddingEvent, EVENT_PHOTOS, eventCounts, eventHref, eventStepsDone, type EventExpense, type EventGuest, type TimelineMoment, type WeddingEvent } from "@/lib/wedding-events";

const FOCUS_RING = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-deep focus-visible:ring-offset-2 focus-visible:ring-offset-bg";
const KIND_ICON: Record<string, typeof Clock> = { free: Coffee, checkin: BedDouble, transport: Car, "getting-ready": Sparkles, photos: Camera, shuttle: Bus, "after-party": Music, other: Clock };

export type WeddingDayItem = DayItem;

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
  bookedVendors,
  audienceReady,
  initialView,
}: {
  initialEvents: WeddingEvent[];
  initialEventGuests: EventGuest[];
  guests: Guest[];
  expenses: EventExpense[];
  initialMoments: TimelineMoment[];
  momentsMissing: boolean;
  weddingDate: string | null;
  weddingDayItems: WeddingDayItem[];
  bookedVendors: Arrival[];
  audienceReady: boolean;
  initialView: WeekendView;
}) {
  const supabase = createClient();
  const [events, setEvents] = useState(initialEvents);
  const [moments, setMoments] = useState(initialMoments);
  const [addingEvent, setAddingEvent] = useState(false);
  const [dayItems, setDayItems] = useState(weddingDayItems);
  const [momentDialog, setMomentDialog] = useState<{ moment?: TimelineMoment } | null>(null);
  const [view, setViewState] = useState<WeekendView>(initialView);
  const [error, setError] = useState("");
  const planning = view === "planning";
  const setView = (v: WeekendView) => {
    setViewState(v);
    const u = new URL(window.location.href);
    if (v === "planning") u.searchParams.delete("as");
    else u.searchParams.set("as", v);
    window.history.replaceState(null, "", u);
  };

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

  const arrivals = bookedVendors.filter((v) => v.arrival_time.trim());
  const { days, keys } = buildDays({ events, moments, dayItems, arrivals, weddingDate, hasEventAudience: audienceReady, hasMomentAudience: audienceReady });

  // Who sees an item is saved on the item itself, so every view reads the same records.
  async function setAudience(en: WeekendEntry, a: Audience) {
    if (!en.table) return;
    setError("");
    const before = { events, moments, dayItems };
    if (en.table === "wedding_events") setEvents((xs) => xs.map((x) => (x.id === en.id ? { ...x, audience: a } : x)));
    if (en.table === "timeline_moments") setMoments((xs) => xs.map((x) => (x.id === en.id ? { ...x, audience: a } : x)));
    if (en.table === "wedding_day_events") setDayItems((xs) => xs.map((x) => (x.id === en.id ? { ...x, audience: a } : x)));
    const { error: err } = await supabase.from(en.table).update({ audience: a }).eq("id", en.id);
    if (err) {
      setEvents(before.events);
      setMoments(before.moments);
      setDayItems(before.dayItems);
      setError(`${err.message} Has migration 050 been run?`);
    }
  }

  const ready = {
    planned: events.filter((e) => Object.values(eventStepsDone(e, expenses.filter((x) => x.event_id === e.id))).every(Boolean)).length,
    noArrival: bookedVendors.length - arrivals.length,
    noTime: [...moments.map((m) => m.time), ...dayItems.map((d) => d.time)].filter((t) => !t.trim()).length,
  };

  const AudienceSelect = ({ en }: { en: WeekendEntry }) =>
    en.table ? (
      <label className="flex shrink-0 items-center gap-1.5 text-xs text-ink-2">
        <span className="sr-only">Who sees {en.title}</span>
        <span aria-hidden>Seen by</span>
        <select value={en.audience} onChange={(e) => setAudience(en, e.target.value as Audience)} className="h-11 rounded-lg border border-line bg-bg px-2 text-sm text-ink">
          {AUDIENCE_ORDER.map((a) => <option key={a} value={a}>{AUDIENCE_LABEL[a]}</option>)}
        </select>
      </label>
    ) : (
      <span className="shrink-0 text-xs text-ink-2">Seen by vendors</span>
    );

  const btn = `flex items-center justify-center gap-1.5 rounded-full px-5 py-3 text-sm font-semibold ${FOCUS_RING}`;

  const viewInfo = VIEWS.find((v) => v.key === view)!;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-serif text-3xl font-medium">Our Wedding Weekend ♡</h2>
          <p className="text-ink-2">A few days, all our favourite people.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <EventsViewTabs active="weekend" />
          {planning && (
            <>
              <button onClick={() => setMomentDialog({})} className={`${btn} border border-ink/25 bg-paper text-ink hover:bg-bg`}><Plus className="h-4 w-4" aria-hidden />Add timeline moment</button>
              <button onClick={() => setAddingEvent(true)} className={`${btn} bg-surface-green text-white`}><Plus className="h-4 w-4" aria-hidden />Add event</button>
            </>
          )}
        </div>
      </div>

      <div>
        <div role="group" aria-label="View the weekend as" className="flex flex-wrap gap-2">
          {VIEWS.map((v) => (
            <button key={v.key} onClick={() => setView(v.key)} aria-pressed={view === v.key} className={`min-h-11 rounded-full border px-5 text-sm font-medium ${view === v.key ? "border-surface-green bg-surface-green text-white" : "border-line bg-paper hover:border-sage-deep"} ${FOCUS_RING}`}>
              {v.label} view
            </button>
          ))}
        </div>
        <p role="status" className="mt-2 text-sm text-ink-2">{planning ? viewInfo.sees : `Previewing what the ${viewInfo.label.toLowerCase()} would see. ${viewInfo.sees}`}</p>
      </div>

      {error && <p role="alert" className="rounded-xl bg-[color-mix(in_srgb,var(--wine)_10%,var(--paper))] px-4 py-3 text-sm text-wine">{error}</p>}
      {!audienceReady && <p role="status" className="rounded-xl bg-[color-mix(in_srgb,var(--gold)_18%,var(--paper))] px-4 py-3 text-sm">The weekend views need one small database update (migration 050). Until then only planning is available, and nothing is shared.</p>}

      {planning && (
        <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-2xl border border-line bg-line text-sm" aria-label="Weekend readiness">
          {[
            [`${ready.planned} of ${events.length}`, "events fully planned"],
            [String(ready.noArrival), `booked vendor${ready.noArrival === 1 ? "" : "s"} without an arrival time`],
            [String(ready.noTime), `item${ready.noTime === 1 ? "" : "s"} without a time`],
          ].map(([n, l]) => (
            <div key={l} className="bg-paper px-4 py-3"><dt className="sr-only">{l}</dt><dd><b className="font-serif text-xl font-medium">{n}</b> <span className="text-ink-2">{l}</span></dd></div>
          ))}
        </dl>
      )}

      {keys.length === 0 && <p className="rounded-2xl border border-dashed border-line p-8 text-center text-sm text-ink-2">Nothing on the weekend yet. Add an event or a timeline moment, and give events a date so they land on the right day.</p>}

      {keys.map((k, di) => {
        const all = days.get(k) ?? [];
        const entries = all.filter((e) => visibleTo(view, e.audience));
        if (!planning && entries.length === 0) return null;
        const first = entries.find((e) => e.type === "event");
        const photo = first?.event?.photo_url || EVENT_PHOTOS[di % EVENT_PHOTOS.length];
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
              {entries.length === 0 && <li className="px-5 py-4 text-sm text-ink-2">Nothing yet.</li>}
              {entries.map((en) => {
                if (!planning) {
                  const ev = en.event;
                  return (
                    <li key={en.key} className="flex gap-4 px-5 py-4 sm:px-8">
                      <span className="w-24 shrink-0 pt-0.5 text-sm font-medium tabular-nums text-ink-2">{en.time || "Time to come"}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-serif text-xl leading-tight">{en.title}</span>
                        {(en.location || ev?.dress_code) && <span className="block text-sm text-ink-2">{[en.location, ev?.dress_code && `Dress: ${ev.dress_code}`].filter(Boolean).join(" · ")}</span>}
                        {ev?.description && <span className="block text-sm text-ink-2">{ev.description}</span>}
                      </span>
                    </li>
                  );
                }
                if (en.type === "moment" && en.moment) {
                  const m = en.moment;
                  const Icon = KIND_ICON[m.kind] ?? Clock;
                  return (
                    <li key={en.key} className="flex flex-wrap items-center gap-x-4 gap-y-2 bg-[color-mix(in_srgb,var(--sage)_10%,var(--paper))] px-5 py-3 sm:px-8">
                      <Icon className="h-5 w-5 shrink-0 text-sage-deep" strokeWidth={1.4} aria-hidden />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold">{m.title}{m.time && <span className="ml-2 font-normal text-ink-2">{m.time}</span>}</p>
                        {m.note && <p className="text-sm text-ink-2">{m.note}</p>}
                      </div>
                      <AudienceSelect en={en} />
                      <button onClick={() => setMomentDialog({ moment: m })} aria-label={`Edit ${m.title}`} className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink-2 hover:text-ink ${FOCUS_RING}`}><Pencil className="h-4 w-4" strokeWidth={1.5} aria-hidden /></button>
                    </li>
                  );
                }
                if (en.type === "day" || en.type === "arrival") {
                  return (
                    <li key={en.key} className="flex flex-wrap items-center gap-x-4 gap-y-2 bg-[color-mix(in_srgb,var(--surface-wine)_7%,var(--paper))] px-5 py-3 sm:px-8">
                      <Heart className="h-5 w-5 shrink-0 text-wine" strokeWidth={1.4} aria-hidden />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold">{en.title}{en.time ? <span className="ml-2 font-normal text-ink-2">{en.time}</span> : <span className="ml-2 font-normal text-wine">no time yet</span>}</p>
                        <p className="text-sm text-ink-2">{[en.sub, en.location].filter(Boolean).join(" · ")}</p>
                      </div>
                      <AudienceSelect en={en} />
                      {en.href && <Link href={en.href} className={`shrink-0 rounded px-2 py-3 text-sm font-medium text-green underline underline-offset-2 ${FOCUS_RING}`}>{en.type === "day" ? "Run-of-show" : "Vendor"}<span className="sr-only"> for {en.title}</span></Link>}
                    </li>
                  );
                }
                const ev = en.event!;
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
                  <li key={en.key} className="group relative grid md:grid-cols-[14rem_minmax(0,1fr)]">
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
                      <div className="relative z-10 mt-2"><AudienceSelect en={en} /></div>
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
