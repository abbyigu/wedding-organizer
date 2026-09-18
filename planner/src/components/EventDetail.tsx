"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import NavBar from "@/components/NavBar";
import type { Guest } from "@/lib/guests";
import type { Vendor } from "@/lib/vendors";
import {
  EVENT_GUEST_STATUS_LABELS,
  EVENT_GUEST_STATUS_ORDER,
  EVENT_INVITE_CATEGORIES,
  type EventGuest,
  type EventGuestStatus,
  type WeddingEvent,
} from "@/lib/wedding-events";
import { fmt } from "@/lib/venues";

const FOCUS_RING = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-deep focus-visible:ring-offset-2 focus-visible:ring-offset-bg";
const FIELD = "mt-1 w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm";
const LABEL = "text-xs font-semibold uppercase tracking-wide text-ink-2";

export default function EventDetail({
  initialEvent,
  initialEventGuests,
  guests,
  vendors,
  userName,
}: {
  initialEvent: WeddingEvent;
  initialEventGuests: EventGuest[];
  guests: Guest[];
  vendors: Vendor[];
  userName: string;
}) {
  const [event, setEvent] = useState(initialEvent);
  const [eventGuests, setEventGuests] = useState(initialEventGuests);
  const [error, setError] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const supabase = createClient();

  function scheduleSave(patch: Partial<WeddingEvent>) {
    setEvent((e) => ({ ...e, ...patch }));
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const { error } = await supabase.from("wedding_events").update(patch).eq("id", event.id);
      if (error) setError(error.message);
    }, 700);
  }

  async function setGuestStatus(guestId: string, status: EventGuestStatus) {
    const existing = eventGuests.find((eg) => eg.guest_id === guestId);
    if (existing) {
      setEventGuests((egs) => egs.map((eg) => (eg.id === existing.id ? { ...eg, status } : eg)));
      await supabase.from("event_guests").update({ status }).eq("id", existing.id);
    } else {
      const { data, error } = await supabase
        .from("event_guests")
        .insert({ event_id: event.id, guest_id: guestId, status })
        .select()
        .single();
      if (error) setError(error.message);
      else if (data) setEventGuests((egs) => [...egs, data as EventGuest]);
    }
  }

  function statusFor(guestId: string): EventGuestStatus {
    return eventGuests.find((eg) => eg.guest_id === guestId)?.status ?? "invited";
  }

  const attending = eventGuests.filter((eg) => eg.status === "attending").length;
  const vendor = vendors.find((v) => v.id === event.vendor_id);
  const inviteCategories = EVENT_INVITE_CATEGORIES[event.key ?? ""];
  const invitedGuests = inviteCategories ? guests.filter((g) => inviteCategories.includes(g.category)) : guests;

  return (
    <div className="min-h-screen pb-20 lg:pl-56">
      <NavBar userName={userName} />
      <div className="mx-auto max-w-3xl px-4 py-8">
        <input
          defaultValue={event.title}
          onChange={(e) => scheduleSave({ title: e.target.value })}
          className="w-full rounded border border-transparent bg-transparent px-1 py-0.5 font-serif text-3xl font-medium outline-none focus:border-line focus:bg-bg sm:text-4xl"
        />
        <p className="mt-2 text-ink-2">
          {attending} attending · {eventGuests.length} responded of {invitedGuests.length} guests
        </p>
        {error && <p className="mt-2 text-sm text-wine">{error}</p>}

        <div className="mt-6 grid grid-cols-1 gap-4 rounded-2xl border border-line bg-paper p-5 shadow-sm sm:grid-cols-2">
          <div>
            <label className={LABEL}>Date</label>
            <input type="date" defaultValue={event.event_date ?? ""} onChange={(e) => scheduleSave({ event_date: e.target.value || null })} className={FIELD} />
          </div>
          <div>
            <label className={LABEL}>Time</label>
            <input defaultValue={event.time} onChange={(e) => scheduleSave({ time: e.target.value })} className={FIELD} />
          </div>
          <div>
            <label className={LABEL}>Location</label>
            <input defaultValue={event.location} onChange={(e) => scheduleSave({ location: e.target.value })} className={FIELD} />
          </div>
          <div>
            <label className={LABEL}>Dress code</label>
            <input defaultValue={event.dress_code} onChange={(e) => scheduleSave({ dress_code: e.target.value })} className={FIELD} />
          </div>
          <div>
            <label className={LABEL}>Capacity</label>
            <input
              type="number"
              defaultValue={event.capacity ?? ""}
              onChange={(e) => scheduleSave({ capacity: e.target.value === "" ? null : +e.target.value })}
              className={FIELD}
            />
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-line bg-paper p-5 shadow-sm">
          <h3 className="mb-3 font-semibold">Menu</h3>
          <textarea
            defaultValue={event.menu}
            onChange={(e) => scheduleSave({ menu: e.target.value })}
            rows={3}
            placeholder="Courses, dietary options, drinks…"
            className={FIELD}
          />
        </div>

        <div className="mt-4 rounded-2xl border border-line bg-paper p-5 shadow-sm">
          <h3 className="mb-3 font-semibold">Vendor</h3>
          <select
            value={event.vendor_id ?? ""}
            onChange={(e) => scheduleSave({ vendor_id: e.target.value || null })}
            className={FIELD}
          >
            <option value="">No vendor linked</option>
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>{v.name} — {v.category}</option>
            ))}
          </select>
          {vendor && (vendor.contact_name || vendor.phone || vendor.email) && (
            <p className="mt-2 text-sm text-ink-2">
              {[vendor.contact_name, vendor.phone, vendor.email].filter(Boolean).join(" · ")}
            </p>
          )}
          <Link href="/vendors/booked" className="mt-2 inline-block text-sm font-semibold text-sage-deep">
            Manage booked vendors →
          </Link>
        </div>

        <div className="mt-4 rounded-2xl border border-line bg-paper p-5 shadow-sm">
          <h3 className="font-semibold">Budget</h3>
          <p className="mb-3 text-xs text-ink-2">A rough estimate for this event — separate from the Budget Builder&apos;s totals.</p>
          <div className="flex items-center gap-2">
            <span className="text-ink-2">$</span>
            <input
              type="number"
              defaultValue={event.budget_estimate ?? ""}
              onChange={(e) => scheduleSave({ budget_estimate: e.target.value === "" ? null : +e.target.value })}
              className="w-32 rounded-lg border border-line bg-bg px-3 py-2 text-sm"
            />
            {event.budget_estimate != null && <span className="text-sm text-ink-2">({fmt(event.budget_estimate)})</span>}
          </div>
          <textarea
            defaultValue={event.budget_notes}
            onChange={(e) => scheduleSave({ budget_notes: e.target.value })}
            placeholder="What's included in this estimate…"
            rows={2}
            className={FIELD}
          />
        </div>

        <div className="mt-4 rounded-2xl border border-line bg-paper p-5 shadow-sm">
          <h3 className="mb-3 font-semibold">Notes</h3>
          <textarea defaultValue={event.notes} onChange={(e) => scheduleSave({ notes: e.target.value })} rows={3} className={FIELD} />
        </div>

        <div className="mt-4 rounded-2xl border border-line bg-paper p-5 shadow-sm">
          <h3 className="font-semibold">Who&apos;s invited</h3>
          {inviteCategories && (
            <p className="mb-2 mt-1 text-xs text-ink-2">Limited to {inviteCategories.map((c) => c.toLowerCase()).join(", ")}.</p>
          )}
          <div className="mt-3 flex flex-col divide-y divide-line">
            {invitedGuests.map((g) => (
              <div key={g.id} className="flex items-center justify-between gap-2 py-2 first:pt-0 last:pb-0">
                <span className="min-w-0 truncate text-sm font-semibold text-ink">{g.name}</span>
                <select
                  value={statusFor(g.id)}
                  onChange={(e) => setGuestStatus(g.id, e.target.value as EventGuestStatus)}
                  className={`shrink-0 rounded-full border border-line bg-bg px-2.5 py-1 text-xs font-semibold ${FOCUS_RING}`}
                >
                  {EVENT_GUEST_STATUS_ORDER.map((s) => (
                    <option key={s} value={s}>{EVENT_GUEST_STATUS_LABELS[s]}</option>
                  ))}
                </select>
              </div>
            ))}
            {invitedGuests.length === 0 && <p className="py-2 text-sm text-ink-2">Add guests on the Guests page first.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
