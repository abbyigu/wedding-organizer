"use client";

import { useConfirm } from "@/components/ConfirmProvider";
import Link from "next/link";
import { useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import NavBar from "@/components/NavBar";
import { blankWeddingDayEvent, type WeddingDayEvent } from "@/lib/wedding-day";

const FOCUS_RING = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-deep focus-visible:ring-offset-2 focus-visible:ring-offset-bg";

// What this page grows into once there's a confirmed venue and date to plan
// the day itself around — the master timeline (built below) is the first
// piece; the rest is future scope, not half-built placeholders.
const PLANNED_SECTIONS = [
  "Who's responsible for each moment",
  "Vendor arrival times",
  "Setup instructions",
  "Ceremony order",
  "Family-photo list",
  "Reception events",
  "Transportation timing",
  "Emergency contacts",
  "Printable run-of-show",
];

function ComingLater({ userName }: { userName: string }) {
  return (
    <div className="min-h-screen pb-20 lg:pl-56">
      <NavBar userName={userName} />
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="relative flex flex-wrap items-start justify-between gap-4 overflow-hidden">
          <div>
            <h1 className="font-serif text-3xl font-medium sm:text-4xl">Wedding Day</h1>
            <p className="mt-2 text-ink-2">Coming later — once your venue and date are locked in.</p>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/botanical-accent.webp" width={350} height={420} loading="lazy" decoding="async" alt="" aria-hidden className="pointer-events-none absolute -right-6 -top-12 hidden h-40 w-auto rotate-[8deg] opacity-30 sm:block" />
        </div>

        <div className="mt-6 rounded-2xl border border-line bg-paper p-6 shadow-sm">
          <p className="text-sm text-ink-2">
            The Planning Board manages everything leading up to the wedding. Wedding Day is different — it&apos;ll organize the sequence of the day itself, once there&apos;s a confirmed venue to plan it around:
          </p>
          <ul className="mt-4 grid grid-cols-1 gap-x-6 gap-y-2 text-sm text-ink-2 sm:grid-cols-2">
            <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 shrink-0 rounded-full bg-sage-deep" />Master timeline</li>
            {PLANNED_SECTIONS.map((s) => (
              <li key={s} className="flex items-center gap-2"><span className="h-1.5 w-1.5 shrink-0 rounded-full bg-sage-deep" />{s}</li>
            ))}
          </ul>
          <Link href="/venues" className={`mt-5 inline-block rounded-full bg-surface-sage-deep px-4 py-2 text-sm font-semibold text-white ${FOCUS_RING}`}>
            Go confirm a venue →
          </Link>
        </div>
      </div>
    </div>
  );
}

// Read from each booked vendor's own record (set when booking or under Edit details), never retyped here.
type DayVendor = { id: string; name: string; category: string; contact_name: string; phone: string; arrival_time: string; day_of_notes: string };

export default function WeddingDay({ initialEvents, userName, venueConfirmed, vendors = [] }: { initialEvents: WeddingDayEvent[]; userName: string; venueConfirmed: boolean; vendors?: DayVendor[] }) {
  const confirm = useConfirm();
  const [events, setEvents] = useState(initialEvents);
  const [error, setError] = useState("");
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const supabase = createClient();

  if (!venueConfirmed) return <ComingLater userName={userName} />;

  function scheduleSave(id: string, patch: Partial<WeddingDayEvent>) {
    setEvents((es) => es.map((e) => (e.id === id ? { ...e, ...patch } : e)));
    const key = id + Object.keys(patch)[0];
    clearTimeout(timers.current[key]);
    timers.current[key] = setTimeout(async () => {
      const { error } = await supabase.from("wedding_day_events").update(patch).eq("id", id);
      if (error) setError(error.message);
    }, 700);
  }

  async function addEvent() {
    setError("");
    const { data, error } = await supabase
      .from("wedding_day_events")
      .insert(blankWeddingDayEvent(events.length))
      .select()
      .single();
    if (error) setError(error.message);
    else if (data) setEvents((es) => [...es, data as WeddingDayEvent]);
  }

  async function removeEvent(id: string) {
    if (!(await confirm("Remove this moment?"))) return;
    setEvents((es) => es.filter((e) => e.id !== id));
    await supabase.from("wedding_day_events").delete().eq("id", id);
  }

  return (
    <div className="min-h-screen pb-20 lg:pl-56">
      <NavBar userName={userName} />
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="relative flex flex-wrap items-start justify-between gap-4 overflow-hidden">
          <div>
            <h1 className="font-serif text-3xl font-medium sm:text-4xl">Wedding Day</h1>
            <p className="mt-2 text-ink-2">The run of show, moment by moment.</p>
          </div>
          <button onClick={addEvent} className={`flex shrink-0 items-center gap-1.5 rounded-full bg-surface-sage-deep px-4 py-2.5 text-sm font-semibold text-white ${FOCUS_RING}`}>
            <Plus className="h-4 w-4" strokeWidth={2} aria-hidden />
            Add a moment
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/botanical-accent.webp" width={350} height={420} loading="lazy" decoding="async" alt="" aria-hidden className="pointer-events-none absolute -right-6 -top-12 hidden h-40 w-auto rotate-[8deg] opacity-30 sm:block" />
        </div>
        {error && <p className="mt-3 text-sm text-wine">{error}</p>}

        <div className="mt-6 flex flex-col gap-3">
          {events.length === 0 && (
            <p className="rounded-2xl border border-line bg-paper p-6 text-center text-sm text-ink-2 shadow-sm">
              Nothing scheduled yet — add the first moment of the day.
            </p>
          )}
          {events.map((ev, i) => (
            <div key={ev.id} className="flex gap-4 rounded-2xl border border-line bg-paper p-4 shadow-sm">
              <div className="flex flex-col items-center pt-1">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-sage-deep text-xs font-semibold text-white">{i + 1}</span>
                {i < events.length - 1 && <span className="mt-1 w-px flex-1 bg-line" />}
              </div>
              <div className="flex-1 pb-1">
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    defaultValue={ev.time}
                    onChange={(e) => scheduleSave(ev.id, { time: e.target.value })}
                    placeholder="Time (e.g. 2:00 PM)"
                    className="w-32 shrink-0 rounded border border-transparent bg-transparent px-1 py-0.5 text-sm font-semibold text-sage-deep outline-none focus:border-line focus:bg-bg"
                  />
                  <input
                    defaultValue={ev.title}
                    onChange={(e) => scheduleSave(ev.id, { title: e.target.value })}
                    className="min-w-0 flex-1 rounded border border-transparent bg-transparent px-1 py-0.5 font-serif text-lg font-medium outline-none focus:border-line focus:bg-bg"
                  />
                  <button onClick={() => removeEvent(ev.id)} aria-label={`Remove ${ev.title}`} className={`shrink-0 rounded-full p-2.5 text-ink-2 hover:bg-bg hover:text-wine ${FOCUS_RING}`}>
                    <Trash2 className="h-4 w-4" strokeWidth={1.5} aria-hidden />
                  </button>
                </div>
                <input
                  defaultValue={ev.location}
                  onChange={(e) => scheduleSave(ev.id, { location: e.target.value })}
                  placeholder="Location"
                  className="mt-0.5 w-full rounded border border-transparent bg-transparent px-1 py-0.5 text-sm text-ink-2 outline-none focus:border-line focus:bg-bg"
                />
                <textarea
                  defaultValue={ev.notes}
                  onChange={(e) => scheduleSave(ev.id, { notes: e.target.value })}
                  placeholder="Notes…"
                  rows={1}
                  className="mt-0.5 w-full resize-none rounded border border-transparent bg-transparent px-1 py-0.5 text-sm text-ink-2 outline-none focus:border-line focus:bg-bg"
                />
              </div>
            </div>
          ))}
        </div>

        {vendors.length > 0 && (
          <section aria-labelledby="vendor-arrivals" className="mt-10">
            <h2 id="vendor-arrivals" className="font-serif text-2xl font-medium">Vendor arrivals</h2>
            <ul className="mt-3 divide-y divide-line rounded-2xl border border-line bg-paper shadow-sm">
              {vendors.map((v) => (
                <li key={v.id}>
                  <Link href={`/vendors/${v.id}`} className={`flex flex-wrap items-baseline gap-x-4 gap-y-0.5 rounded-2xl p-4 hover:bg-bg ${FOCUS_RING}`}>
                    <span className="w-28 shrink-0 text-sm font-semibold text-sage-deep">{v.arrival_time || "Time not set"}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">{v.name} <span className="font-normal text-ink-2">· {v.category}</span></span>
                      {(v.contact_name || v.phone) && <span className="block text-sm text-ink-2">{[v.contact_name, v.phone].filter(Boolean).join(" · ")}</span>}
                      {v.day_of_notes && <span className="block text-sm text-ink-2">{v.day_of_notes}</span>}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
