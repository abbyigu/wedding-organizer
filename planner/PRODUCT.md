# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: Ariel and Fred, the couple, planning their own wedding together. They are the only two people the app's auth model treats as "the couple" — `auth-names.ts` and the partner-labeling logic hardcode exactly this pair.

Secondary: occasional access for a few helpers — a parent, a planner, or a wedding party member who needs to see or contribute to specific parts of the plan. This is confirmed as intended usage, but the app currently has no distinct helper role or scoped permissions; every authenticated user has full shared access today (see Capabilities and Constraints).

## Product Purpose

A single shared source of truth for planning the wedding end to end: venue, budget, guests, vendors, the wedding party, registry, every satellite event (welcome party, rehearsal dinner, brunch, wedding day itself), and the joint decisions along the way. Nothing should fall through the cracks between now and the wedding.

It's also meant to hold up afterward as a keepsake — a record of what was decided, who came, and how the day came together — not just a checklist that goes stale once the wedding is over.

## Positioning

Not a commercial or multi-couple product. Its distinguishing mechanism is that it's built directly around this specific wedding — real guests, real vendors, real venue options, real budget lines — rather than being a generic templated planner. Data shown is always real data pulled from Supabase; the app deliberately never invents counts, dates, or percentages when a section has no data yet (an established, load-bearing convention — see the Dashboard rework).

## Operating Context

Core workflows, each with its own page: Venue decision (`/decide/venue`) and the generic multi-decision framework (`/decide`, `/decide/[id]`) for joint choices beyond venue; Budget (`/budget`, `/budget/builder`, `/budget/payments`); Guests (`/guests/list`, `/rsvp`, `/seating`, `/travel`, `/website`, `/communications`); Vendors (`/vendors`, `/vendors/booked`); Wedding Party (`/wedding-party`); Registry (`/registry`); dedicated satellite-event pages (`/events/[key]` for welcome-party, rehearsal-dinner, brunch) sharing data with the generic Wedding Events tool; Wedding Day (`/wedding-day`); Inspiration/Idea Board (`/ideas`); DIY Projects (`/diy`); Planning Board (`/board`); and the Dashboard (`/`) as the whole-wedding overview linking out to every page above.

Both partners plan asynchronously and together — rating venues privately before revealing, voting on decisions, tracking who's confirmed what — rather than in one sitting.

## Capabilities and Constraints

- Auth is Supabase Auth; any authenticated user currently has full read/write access to shared data (RLS policy is `auth.role() = 'authenticated')`, not scoped per-user). Helper access today means "give them a login," not a restricted view — there is no partial-access mode yet. Flagged as an open gap given the confirmed "us + a few helpers" audience, not something to silently build without being asked.
- Wedding date and guest capacity are **not yet confirmed real values** — `DEFAULT_BUDGET_SETTINGS.wedding_date` ("2029-09-08") and `GUEST_CAPACITY` (102) in `src/lib/venues.ts` are placeholders/fallbacks in code, not the real date or cap. Treat both as undecided until the user sets them.
- Deployed on Vercel at the-wedding-room.vercel.app; Next.js 16 (App Router, Turbopack) + TypeScript + Tailwind v4 + Supabase (Postgres, Auth, RLS).

## Brand Commitments

Product name: "Our Wedding Room." Voice is warm and personal, written for the two of them specifically (greeting copy, partner-labeling, etc.) rather than a generic SaaS tone.

## Evidence on Hand

All content is the couple's real planning data (guests, vendors, budget lines, venues, events) stored in Supabase — no fabricated testimonials, sample data, or placeholder content ships in the product. The one exception is the two placeholder constants noted above (wedding date, guest cap), which future work must not treat as real.

## Product Principles

1. One shared source of truth, not separate per-person to-do lists — every page reflects the same underlying data both partners see.
2. Never invent numbers, dates, or percentages — a page with no data yet gets a gentle setup prompt, not a fabricated stat.
3. Built for exactly this wedding, not a generic templated planner — content and structure should keep reflecting Ariel and Fred's actual plan.
4. Helper access should stay additive and clearly scoped when it's built out — it must not blur or override the couple's own joint decision-making (ratings, votes, final choices).
5. Should remain worth returning to after the wedding as a record, not just a pre-wedding checklist that goes stale.
