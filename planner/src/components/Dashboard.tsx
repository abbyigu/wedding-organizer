"use client";

import Link from "next/link";
import { useMemo, useRef, useState, type ComponentType } from "react";
import {
  CalendarClock,
  CalendarDays,
  CalendarHeart,
  ChevronRight,
  Clock,
  Coffee,
  Crown,
  Gift,
  Hammer,
  Handshake,
  Heart,
  Images,
  Landmark,
  ListChecks,
  PartyPopper,
  Users,
  Wallet,
  Wine,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import NavBar from "@/components/NavBar";
import { BUDGET_CEILING, GUEST_CAPACITY, calcVenue, fmt, type Assumptions, type Venue } from "@/lib/venues";
import { blankCustomTask, nextVenueAction, type ActionItem, type CustomTask } from "@/lib/dashboard";
import { blankEvent, EVENT_TYPES, EVENT_TYPE_ORDER, formatEventDate, type UpcomingEvent } from "@/lib/events";

const CARD_TRANSITION = "transition hover:-translate-y-0.5 hover:shadow-md motion-reduce:transition-none motion-reduce:transform-none";
const FOCUS_RING = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-deep focus-visible:ring-offset-2 focus-visible:ring-offset-bg";

export type OverviewCard = { key: string; title: string; status: string; href: string };

const CARD_ICON: Record<string, ComponentType<{ className?: string; strokeWidth?: number }>> = {
  "welcome-party": PartyPopper,
  "rehearsal-dinner": Wine,
  "wedding-day": CalendarHeart,
  brunch: Coffee,
  guests: Users,
  "wedding-party": Crown,
  vendors: Handshake,
  registry: Gift,
  venue: Landmark,
  inspiration: Images,
  diy: Hammer,
};

function MiniCard({ card }: { card: OverviewCard }) {
  const Icon = CARD_ICON[card.key] ?? Landmark;
  const featuredVenue = venues.find((v) => v.is_final) ?? venues.find((v) => v.is_favourite) ?? venues.find((v) => v.status === "finalist") ?? venues[0];
  const venuePhoto = featuredVenue?.photos?.[0]?.path ?? "";
  const heroPhoto = venues.flatMap((v) => v.photos ?? []).find((p) => p.path)?.path ?? venuePhoto;
  const journeyPct = Math.round(((Math.max(1, roadmap.step) - 1) / Math.max(1, roadmap.totalSteps - 1)) * 100);
  const nextThree = nextMoveQueue.slice(0, 3);

  return (
    <div className="min-h-screen bg-bg pb-16 lg:pl-56">
      <NavBar userName={userName} />
      <main className="mx-auto max-w-[1540px] px-5 py-5 lg:px-8">
        {error && <p className="mb-3 text-sm text-wine">{error}</p>}

        <section className="grid items-stretch gap-7 xl:grid-cols-[0.72fr_1.45fr]">
          <div className="flex flex-col justify-center py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.30em] text-ink-2">Good morning, Ariel &amp; Fred</p>
            <h1 className="mt-4 max-w-[560px] font-serif text-[clamp(3.4rem,5vw,5.7rem)] font-medium leading-[0.88] tracking-[-0.045em] text-ink">
              Your wedding<br />is taking shape
            </h1>
            <div className="mt-6 flex items-end gap-5">
              <div>
                <p className="font-serif text-4xl text-ink">{daysUntilWedding} days</p>
                <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.32em] text-ink-2">until your wedding day</p>
              </div>
              <span className="pb-1 font-serif text-5xl italic text-gold">♡</span>
            </div>
            <Link href={nextMove?.href ?? "/board"} className={`mt-7 inline-flex w-fit items-center gap-5 rounded-full bg-surface-sage-deep px-8 py-3.5 font-serif text-lg text-white ${FOCUS_RING}`}>
              Continue planning <span>→</span>
            </Link>
          </div>

          <div className="relative min-h-[360px] overflow-hidden rounded-[18px] bg-[color-mix(in_srgb,var(--sage)_18%,var(--paper))] xl:min-h-[410px]">
            {heroPhoto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={heroPhoto} alt="" className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <div className="absolute inset-0 bg-[linear-gradient(135deg,color-mix(in_srgb,var(--wine)_18%,var(--paper)),color-mix(in_srgb,var(--gold)_24%,var(--paper)),color-mix(in_srgb,var(--sage)_30%,var(--paper)))]" />
            )}
            <div className="absolute right-6 top-7 rotate-[-7deg] text-right font-serif text-2xl italic leading-tight text-white drop-shadow">
              Good things<br />are worth<br />planning for.
            </div>
            <div className="absolute bottom-5 right-5 bg-paper/90 px-8 py-3 text-center text-[10px] font-semibold uppercase tracking-[0.28em] text-ink-2 shadow-sm">
              Same love<br />brighter days
            </div>
          </div>
        </section>

        <section className="mt-5 border-b border-line pb-7">
          <div className="flex items-end justify-between">
            <h2 className="font-serif text-3xl font-medium">Next three steps</h2>
            <Link href="/board" className="text-[10px] font-semibold uppercase tracking-[0.22em] text-wine">View all tasks →</Link>
          </div>
          <div className="mt-4 grid gap-2 md:grid-cols-3">
            {nextThree.map((item, i) => (
              <Link key={item.title} href={item.href} className={`group flex items-center gap-5 border-r border-line py-2 pr-5 last:border-r-0 ${FOCUS_RING}`}>
                <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full font-serif text-xl text-white ${i === 0 ? "bg-surface-wine" : i === 1 ? "bg-[color-mix(in_srgb,var(--wine)_62%,white)]" : "bg-[color-mix(in_srgb,var(--gold)_75%,var(--wine))]"}`}>{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ink">{item.title}</p>
                  <p className="mt-0.5 truncate text-sm text-ink-2">{item.description}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-wine opacity-0 transition group-hover:opacity-100" />
              </Link>
            ))}
          </div>
        </section>

        <section className="py-7">
          <h2 className="font-serif text-3xl font-medium">Your wedding journey</h2>
          <div className="relative mt-6 grid grid-cols-5 gap-3">
            <div className="absolute left-[9%] right-[9%] top-6 h-px bg-line" />
            <div className="absolute left-[9%] top-6 h-px bg-surface-sage-deep" style={{ width: `${Math.min(82, journeyPct * 0.82)}%` }} />
            {[
              ["Dream", "Complete", "✓"],
              ["Decide", "In progress", `${Math.max(1, Math.min(99, journeyPct))}%`],
              ["Build", "Upcoming", "□"],
              ["Coordinate", "Upcoming", "♧"],
              ["Wedding Day", "Coming soon", "♡"],
            ].map(([label, state, icon], i) => (
              <div key={label} className="relative z-10 text-center">
                <span className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full border bg-paper font-serif text-base ${i === 0 ? "border-sage-deep bg-surface-sage-deep text-white" : i === 1 ? "border-[5px] border-wine text-wine" : "border-line text-ink-2"}`}>{icon}</span>
                <p className="mt-2 font-serif text-lg">{label}</p>
                <p className={`text-[9px] font-semibold uppercase tracking-[0.22em] ${i === 1 ? "text-wine" : "text-ink-2"}`}>{state}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid overflow-hidden rounded-[18px] border border-line bg-paper lg:grid-cols-4">
          <div className="border-b border-line p-6 lg:border-b-0 lg:border-r">
            <div className="flex items-center justify-between"><h3 className="font-serif text-xl">Guest List</h3><Link href="/guests" className="text-xs text-wine">View list →</Link></div>
            <div className="mt-5 flex items-center gap-5">
              <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-full border-[14px] border-[color-mix(in_srgb,var(--sage)_75%,var(--paper))] bg-paper text-center">
                <span><b className="block font-serif text-2xl">{guestTotal}</b><small>guests</small></span>
              </div>
              <div className="text-sm text-ink-2"><p><b className="text-ink">{guestAdults}</b> adults</p><p className="mt-2"><b className="text-ink">{guestKids}</b> kids</p></div>
            </div>
          </div>

          <div className="border-b border-line p-6 lg:border-b-0 lg:border-r">
            <div className="flex items-center justify-between"><h3 className="font-serif text-xl">Budget</h3><Link href="/budget" className="text-xs text-wine">View details →</Link></div>
            <p className="mt-6 font-serif text-4xl">{stats.lowest}</p>
            <p className="text-sm text-ink-2">of {fmt(BUDGET_CEILING)}</p>
            <div className="mt-4 h-3 overflow-hidden rounded-full bg-bg"><div className="h-full rounded-full bg-surface-sage-deep" style={{ width: `${budgetPct}%` }} /></div>
            <p className="mt-5 font-serif text-xl italic text-sage-deep">Right on track!</p>
          </div>

          <div className="border-b border-line p-6 lg:border-b-0 lg:border-r">
            <div className="flex items-center justify-between"><h3 className="font-serif text-xl">Upcoming Milestones</h3><Link href="/board" className="text-xs text-wine">View all →</Link></div>
            <div className="mt-5 space-y-3">
              {nextMoveQueue.slice(0, 5).map((item, i) => (
                <Link key={item.title} href={item.href} className="flex items-center gap-3 text-sm">
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${i % 3 === 0 ? "bg-surface-wine" : i % 3 === 1 ? "bg-[color-mix(in_srgb,var(--gold)_85%,var(--wine))]" : "bg-surface-sage-deep"}`} />
                  <span className="truncate">{item.title}</span>
                </Link>
              ))}
            </div>
          </div>

          <div className="p-6">
            <div className="flex items-center justify-between"><h3 className="font-serif text-xl">Venue</h3><Link href="/venues" className="text-xs text-wine">View details →</Link></div>
            {venuePhoto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={venuePhoto} alt={featuredVenue?.name ?? "Venue"} className="mt-4 h-28 w-full rounded-xl object-cover" />
            ) : (
              <div className="mt-4 flex h-28 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--sage)_18%,var(--paper))]"><Landmark className="h-8 w-8 text-sage-deep" /></div>
            )}
            <p className="mt-3 font-serif text-xl">{featuredVenue?.name ?? "Still dreaming"}</p>
            <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-ink-2">{featuredVenue?.location ?? "Explore your venue shortlist"}</p>
          </div>
        </section>
      </main>
    </div>
  );
}
