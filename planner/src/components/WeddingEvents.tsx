"use client";

import { useRef, useState } from "react";
import { ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Guest } from "@/lib/guests";
import {
  blankWeddingEvent,
  EVENT_GUEST_STATUS_LABELS,
  EVENT_GUEST_STATUS_ORDER,
  type EventGuest,
  type EventGuestStatus,
  type WeddingEvent,
} from "@/lib/wedding-events";

const FOCUS_RING = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-deep focus-visible:ring-offset-2 focus-visible:ring-offset-bg";

export default function WeddingEvents({
  initialEvents,
  initialEventGuests,
  guests,
}: {
  initialEvents: WeddingEvent[];
  initialEventGuests: EventGuest[];
  guests: Guest[];
}) {
  const [events, setEvents] = useState(initialEvents);
  const [eventGuests, setEventGuests] = useState(initialEventGuests);
  const [error, setError] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const supabase = createClient();

  function scheduleSave(id: string, patch: Partial<WeddingEvent>) {
    setEvents((es) => es.map((e) => (e.id === id ? { ...e, ...patch } : e)));
    const key = id + Object.keys(patch)[0];
    clearTimeout(timers.current[key]);
    timers.current[key] = setTimeout(async () => {
      const { error } = await supabase.from("wedding_events").update(patch).eq("id", id);
      if (error) setError(error.message);
    }, 700);
  }

  async function addEvent() {
    setError("");
    const { data, error } = await supabase.from("wedding_events").insert(blankWeddingEvent(events.length)).select().single();
    if (error) setError(error.message);
    else if (data) setEvents((es) => [...es, data as WeddingEvent]);
  }

  async function removeEvent(id: string) {
    if (!confirm("Remove this event?")) return;
    setEvents((es) => es.filter((e) => e.id !== id));
    await supabase.from("wedding_events").delete().eq("id", id);
  }

  async function setGuestStatus(eventId: string, guestId: string, status: EventGuestStatus) {
    const existing = eventGuests.find((eg) => eg.event_id === eventId && eg.guest_id === guestId);
    if (existing) {
      setEventGuests((egs) => egs.map((eg) => (eg.id === existing.id ? { ...eg, status } : eg)));
      await supabase.from("event_guests").update({ status }).eq("id", existing.id);
    } else {
      const { data, error } = await supabase
        .from("event_guests")
        .insert({ event_id: eventId, guest_id: guestId, status })
        .select()
        .single();
      if (error) setError(error.message);
      else if (data) setEventGuests((egs) => [...egs, data as EventGuest]);
    }
  }

  function statusFor(eventId: string, guestId: string): EventGuestStatus {
    return eventGuests.find((eg) => eg.event_id === eventId && eg.guest_id === guestId)?.status ?? "invited";
  }

  function countsFor(eventId: string) {
    const forEvent = eventGuests.filter((eg) => eg.event_id === eventId);
    return {
      invited: forEvent.length,
      attending: forEvent.filter((eg) => eg.status === "attending").length,
    };
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-2">Every wedding-related event, and who&apos;s invited.</p>
        <button onClick={addEvent} className={`flex shrink-0 items-center gap-1.5 rounded-full bg-sage-deep px-4 py-2 text-sm font-semibold text-white ${FOCUS_RING}`}>
          <Plus className="h-4 w-4" strokeWidth={2} aria-hidden />
          Add event
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-wine">{error}</p>}

      <div className="mt-4 flex flex-col gap-3">
        {events.length === 0 && (
          <p className="rounded-2xl border border-line bg-paper p-6 text-center text-sm text-ink-2 shadow-sm">
            Nothing yet — add the rehearsal dinner, welcome drinks, ceremony, reception, or anything else on the calendar.
          </p>
        )}
        {events.map((ev) => {
          const open = openId === ev.id;
          const counts = countsFor(ev.id);
          return (
            <div key={ev.id} className="overflow-hidden rounded-2xl border border-line bg-paper shadow-sm">
              <div className="flex flex-wrap items-start gap-3 p-4">
                <button
                  onClick={() => setOpenId(open ? null : ev.id)}
                  aria-label={open ? "Collapse guest list" : "Manage guest list"}
                  className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-ink-2 hover:bg-bg ${FOCUS_RING}`}
                >
                  {open ? <ChevronDown className="h-4 w-4" strokeWidth={1.5} aria-hidden /> : <ChevronRight className="h-4 w-4" strokeWidth={1.5} aria-hidden />}
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      defaultValue={ev.title}
                      onChange={(e) => scheduleSave(ev.id, { title: e.target.value })}
                      className="min-w-0 flex-1 rounded border border-transparent bg-transparent px-1 py-0.5 font-serif text-lg font-medium outline-none focus:border-line focus:bg-bg"
                    />
                    <button onClick={() => removeEvent(ev.id)} aria-label={`Remove ${ev.title}`} className={`shrink-0 rounded-full p-1 text-ink-2 hover:bg-bg hover:text-wine ${FOCUS_RING}`}>
                      <Trash2 className="h-4 w-4" strokeWidth={1.5} aria-hidden />
                    </button>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <input
                      type="date"
                      defaultValue={ev.event_date ?? ""}
                      onChange={(e) => scheduleSave(ev.id, { event_date: e.target.value || null })}
                      className="rounded border border-line bg-bg px-2 py-1 text-xs"
                    />
                    <input
                      defaultValue={ev.time}
                      onChange={(e) => scheduleSave(ev.id, { time: e.target.value })}
                      placeholder="Time"
                      className="w-24 rounded border border-line bg-bg px-2 py-1 text-xs"
                    />
                    <input
                      defaultValue={ev.location}
                      onChange={(e) => scheduleSave(ev.id, { location: e.target.value })}
                      placeholder="Location"
                      className="w-40 rounded border border-line bg-bg px-2 py-1 text-xs"
                    />
                    <input
                      defaultValue={ev.dress_code}
                      onChange={(e) => scheduleSave(ev.id, { dress_code: e.target.value })}
                      placeholder="Dress code"
                      className="w-32 rounded border border-line bg-bg px-2 py-1 text-xs"
                    />
                    <span className="text-xs font-semibold text-ink-2">
                      {counts.attending} attending · {counts.invited} responded
                    </span>
                  </div>
                </div>
              </div>

              {open && (
                <div className="border-t border-line">
                  <div className="max-h-80 overflow-y-auto">
                    {guests.map((g) => (
                      <div key={g.id} className="flex items-center justify-between gap-2 border-t border-line px-4 py-2 first:border-t-0">
                        <span className="min-w-0 truncate text-sm font-semibold text-ink">{g.name}</span>
                        <select
                          value={statusFor(ev.id, g.id)}
                          onChange={(e) => setGuestStatus(ev.id, g.id, e.target.value as EventGuestStatus)}
                          className="shrink-0 rounded-full border border-line bg-bg px-2.5 py-1 text-xs font-semibold"
                        >
                          {EVENT_GUEST_STATUS_ORDER.map((s) => (
                            <option key={s} value={s}>{EVENT_GUEST_STATUS_LABELS[s]}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
