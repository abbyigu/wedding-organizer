"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { CalendarDays, Check, ChevronRight, CircleDollarSign, CloudSun, MapPin, Shirt, Sparkles, Store, Users, Utensils } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import NavBar from "@/components/NavBar";
import type { Guest } from "@/lib/guests";
import type { Vendor } from "@/lib/vendors";
import { EVENT_GUEST_STATUS_LABELS, EVENT_GUEST_STATUS_ORDER, EVENT_INVITE_CATEGORIES, type EventGuest, type EventGuestStatus, type WeddingEvent } from "@/lib/wedding-events";
import { fmt } from "@/lib/venues";

const FOCUS_RING = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wine focus-visible:ring-offset-2 focus-visible:ring-offset-bg";
const FIELD = `mt-1 w-full rounded-xl border border-line bg-bg/70 px-3 py-2.5 text-sm text-ink transition-colors placeholder:text-ink-2/60 hover:border-gold focus:border-wine focus:outline-none ${FOCUS_RING}`;
const LABEL = "text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-2";

function prettyDate(value: string | null) {
  if (!value) return "Date to be decided";
  return new Intl.DateTimeFormat("en-CA", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T12:00:00Z`));
}

export default function EventDetail({ initialEvent, initialEventGuests, guests, vendors, userName }: { initialEvent: WeddingEvent; initialEventGuests: EventGuest[]; guests: Guest[]; vendors: Vendor[]; userName: string }) {
  const [event, setEvent] = useState(initialEvent);
  const [eventGuests, setEventGuests] = useState(initialEventGuests);
  const [error, setError] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const supabase = createClient();

  function scheduleSave(patch: Partial<WeddingEvent>) {
    setEvent((current) => ({ ...current, ...patch }));
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
      const { data, error } = await supabase.from("event_guests").insert({ event_id: event.id, guest_id: guestId, status }).select().single();
      if (error) setError(error.message);
      else if (data) setEventGuests((egs) => [...egs, data as EventGuest]);
    }
  }

  function statusFor(guestId: string): EventGuestStatus {
    return eventGuests.find((eg) => eg.guest_id === guestId)?.status ?? "invited";
  }

  const inviteCategories = EVENT_INVITE_CATEGORIES[event.key ?? ""];
  const invitedGuests = inviteCategories ? guests.filter((g) => inviteCategories.includes(g.category)) : guests;
  const attending = eventGuests.filter((eg) => eg.status === "attending").length;
  const declined = eventGuests.filter((eg) => eg.status === "not_attending").length;
  const responded = attending + declined;
  const responsePercent = invitedGuests.length ? Math.min(100, Math.round((responded / invitedGuests.length) * 100)) : 0;
  const vendor = vendors.find((v) => v.id === event.vendor_id);
  const progress = [Boolean(event.event_date && event.time), Boolean(event.menu.trim()), Boolean(event.vendor_id), event.budget_estimate != null];
  const completeCount = progress.filter(Boolean).length;

  return (
    <div className="min-h-screen pb-20 lg:pl-56">
      <NavBar userName={userName} />
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-9 lg:px-10">
        <div className="mb-5 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.13em] text-ink-2">
          <Link href="/guests/events" className="transition-colors hover:text-wine">Events</Link>
          <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          <span className="text-wine">{event.title}</span>
        </div>

        <section className="relative overflow-hidden rounded-[1.75rem] border border-line bg-[linear-gradient(125deg,color-mix(in_srgb,var(--wine)_88%,#32141c),color-mix(in_srgb,var(--wood)_65%,var(--wine)))] px-6 py-8 text-white shadow-sm sm:px-10 sm:py-11">
          <div className="pointer-events-none absolute -right-12 -top-16 h-64 w-64 rounded-full border border-white/15" />
          <div className="pointer-events-none absolute -right-2 top-4 h-40 w-40 rounded-full border border-gold/50" />
          <Sparkles className="pointer-events-none absolute right-8 top-8 h-8 w-8 text-gold/80" strokeWidth={1.25} aria-hidden />
          <div className="relative max-w-3xl">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-white/70">Wedding weekend</p>
            <input aria-label="Event title" value={event.title} onChange={(e) => scheduleSave({ title: e.target.value })} className="w-full rounded-lg border border-transparent bg-transparent px-0 font-serif text-4xl font-medium text-white outline-none placeholder:text-white/50 focus:border-white/25 focus:bg-black/10 sm:text-6xl" />
            <p className="mt-3 max-w-2xl font-serif text-lg text-white/85 sm:text-xl">{event.notes.trim() || "A thoughtful gathering for the people sharing this weekend with you."}</p>
            <div className="mt-7 flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold text-white/90">
              <span className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-gold" aria-hidden />{prettyDate(event.event_date)}{event.time ? ` · ${event.time}` : ""}</span>
              <span className="flex items-center gap-2"><MapPin className="h-4 w-4 text-gold" aria-hidden />{event.location || "Location to be decided"}</span>
              <span className="flex items-center gap-2"><Users className="h-4 w-4 text-gold" aria-hidden />{invitedGuests.length} guests</span>
            </div>
          </div>
        </section>

        {error && <p role="alert" className="mt-3 rounded-xl border border-wine/30 bg-wine/10 px-4 py-3 text-sm text-wine">{error}</p>}

        <section aria-label="Event progress" className="grid grid-cols-2 border-b border-line py-5 sm:grid-cols-4">
          {[["Date & place", progress[0]], ["Menu", progress[1]], ["Vendor", progress[2]], ["Budget", progress[3]]].map(([label, done], index) => (
            <div key={String(label)} className={`flex items-center gap-3 px-3 py-2 sm:px-5 ${index > 0 ? "sm:border-l sm:border-line" : ""}`}>
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${done ? "bg-surface-sage-deep text-white" : "border border-line bg-paper text-ink-2"}`}>
                {done ? <Check className="h-4 w-4" strokeWidth={2} aria-hidden /> : <span className="text-xs">{index + 1}</span>}
              </span>
              <div><p className="font-serif text-sm font-medium">{label}</p><p className="text-[11px] text-ink-2">{done ? "Ready" : "Needs attention"}</p></div>
            </div>
          ))}
        </section>

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.55fr)_minmax(290px,.75fr)]">
          <div className="space-y-8">
            <section>
              <div className="mb-4 flex items-end justify-between gap-4 border-b border-gold/70 pb-3">
                <div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-wine">The essentials</p><h2 className="mt-1 font-serif text-3xl">Plan the gathering</h2></div>
                <span className="text-xs text-ink-2">{completeCount} of 4 ready</span>
              </div>
              <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
                <label><span className={LABEL}>Date</span><input type="date" value={event.event_date ?? ""} onChange={(e) => scheduleSave({ event_date: e.target.value || null })} className={FIELD} /></label>
                <label><span className={LABEL}>Time</span><input value={event.time} onChange={(e) => scheduleSave({ time: e.target.value })} placeholder="6:30 PM" className={FIELD} /></label>
                <label><span className={LABEL}>Location</span><input value={event.location} onChange={(e) => scheduleSave({ location: e.target.value })} placeholder="Venue or neighbourhood" className={FIELD} /></label>
                <label><span className={LABEL}>Dress code</span><input value={event.dress_code} onChange={(e) => scheduleSave({ dress_code: e.target.value })} placeholder="Relaxed garden party" className={FIELD} /></label>
                <label><span className={LABEL}>Capacity</span><input type="number" value={event.capacity ?? ""} onChange={(e) => scheduleSave({ capacity: e.target.value === "" ? null : +e.target.value })} placeholder="Number of guests" className={FIELD} /></label>
                <label><span className={LABEL}>Vendor</span><select value={event.vendor_id ?? ""} onChange={(e) => scheduleSave({ vendor_id: e.target.value || null })} className={FIELD}><option value="">No vendor linked</option>{vendors.map((v) => <option key={v.id} value={v.id}>{v.name} — {v.category}</option>)}</select></label>
              </div>
              {vendor && (vendor.contact_name || vendor.phone || vendor.email) && <p className="mt-3 text-xs text-ink-2">{[vendor.contact_name, vendor.phone, vendor.email].filter(Boolean).join(" · ")}</p>}
            </section>

            <section className="grid gap-5 sm:grid-cols-2">
              <div className="rounded-2xl border border-line bg-paper p-5 shadow-sm">
                <div className="mb-3 flex items-center gap-2"><Utensils className="h-4 w-4 text-wine" aria-hidden /><h2 className="font-serif text-xl">Menu</h2></div>
                <textarea value={event.menu} onChange={(e) => scheduleSave({ menu: e.target.value })} rows={6} placeholder="Courses, dietary options, drinks…" className={FIELD} />
              </div>
              <div className="rounded-2xl border border-line bg-paper p-5 shadow-sm">
                <div className="mb-3 flex items-center gap-2"><CircleDollarSign className="h-4 w-4 text-wine" aria-hidden /><h2 className="font-serif text-xl">Budget</h2></div>
                <div className="flex items-center gap-2"><span className="text-ink-2">$</span><input aria-label="Event budget estimate" type="number" value={event.budget_estimate ?? ""} onChange={(e) => scheduleSave({ budget_estimate: e.target.value === "" ? null : +e.target.value })} className="w-36 rounded-xl border border-line bg-bg/70 px-3 py-2.5 text-sm" />{event.budget_estimate != null && <span className="text-xs text-ink-2">{fmt(event.budget_estimate)}</span>}</div>
                <textarea aria-label="Budget notes" value={event.budget_notes} onChange={(e) => scheduleSave({ budget_notes: e.target.value })} rows={3} placeholder="What is included in this estimate?" className={FIELD} />
              </div>
            </section>

            <section>
              <div className="mb-3 flex items-center gap-2"><Sparkles className="h-4 w-4 text-wine" aria-hidden /><h2 className="font-serif text-2xl">Notes & atmosphere</h2></div>
              <textarea value={event.notes} onChange={(e) => scheduleSave({ notes: e.target.value })} rows={5} placeholder="The feeling, plan, reminders, and details you do not want to lose…" className={FIELD} />
            </section>
          </div>

          <aside className="space-y-7 lg:border-l lg:border-line lg:pl-8">
            <section>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-wine">At a glance</p>
              <h2 className="mt-1 font-serif text-3xl">Event snapshot</h2>
              <div className="mt-4 divide-y divide-line">
                {[[Users, "RSVP", `${attending} attending`, `${responded} of ${invitedGuests.length} responded`], [CircleDollarSign, "Budget", event.budget_estimate == null ? "Not set" : fmt(event.budget_estimate), event.budget_notes || "Add what this estimate includes"], [Store, "Vendor", vendor?.name || "Not linked", vendor?.category || "Choose from booked vendors"], [CloudSun, "Backup plan", event.location || "Not planned", "Keep rain and travel in mind"], [Shirt, "Dress code", event.dress_code || "Not set", "Share this with guests later"]].map(([Icon, label, value, note]) => {
                  const IconComponent = Icon as typeof Users;
                  return <div key={String(label)} className="grid grid-cols-[28px_1fr] gap-3 py-4"><IconComponent className="mt-0.5 h-4 w-4 text-wine" strokeWidth={1.6} aria-hidden /><div><p className="text-xs font-semibold text-ink-2">{String(label)}</p><p className="font-serif text-lg">{String(value)}</p><p className="line-clamp-2 text-xs text-ink-2">{String(note)}</p></div></div>;
                })}
              </div>
            </section>

            <section className="border-t border-gold/70 pt-6">
              <div className="flex items-end justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-wine">Guest list</p><h2 className="mt-1 font-serif text-2xl">Who&apos;s invited</h2></div><span className="text-xs text-ink-2">{responsePercent}% replied</span></div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-line"><div className="h-full rounded-full bg-surface-sage-deep transition-all" style={{ width: `${responsePercent}%` }} /></div>
              {inviteCategories && <p className="mt-3 text-xs text-ink-2">For {inviteCategories.map((c) => c.toLowerCase()).join(", ")}.</p>}
              <div className="mt-4 max-h-[28rem] divide-y divide-line overflow-y-auto pr-1">
                {invitedGuests.map((guest) => <div key={guest.id} className="flex items-center justify-between gap-3 py-2.5"><span className="min-w-0 truncate text-sm font-semibold">{guest.name}</span><select aria-label={`RSVP status for ${guest.name}`} value={statusFor(guest.id)} onChange={(e) => setGuestStatus(guest.id, e.target.value as EventGuestStatus)} className={`max-w-32 shrink-0 rounded-full border border-line bg-bg px-2.5 py-1 text-xs font-semibold ${FOCUS_RING}`}>{EVENT_GUEST_STATUS_ORDER.map((status) => <option key={status} value={status}>{EVENT_GUEST_STATUS_LABELS[status]}</option>)}</select></div>)}
                {invitedGuests.length === 0 && <p className="py-4 text-sm text-ink-2">Add guests on the Guests page first.</p>}
              </div>
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}
