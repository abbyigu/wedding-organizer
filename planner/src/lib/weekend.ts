import { parseMinutes, type TimelineMoment, type WeddingEvent } from "@/lib/wedding-events";

// One timeline, four ways of looking at it. Each item lives in its own table (events, timeline moments, the
// Wedding Day run-of-show, vendor arrival times) and carries an audience. A view only ever reads the fields
// that are safe for that audience: never notes, budgets, guest counts or tasks.
export type Audience = "all" | "party" | "vendors" | "private";
export type WeekendView = "planning" | "guest" | "party" | "vendor";

export const AUDIENCE_LABEL: Record<Audience, string> = { all: "Everyone", party: "Wedding party", vendors: "Vendors", private: "Just us" };
export const AUDIENCE_ORDER: Audience[] = ["all", "party", "vendors", "private"];

export const VIEWS: { key: WeekendView; label: string; sees: string }[] = [
  { key: "planning", label: "Planning", sees: "Everything, including notes, budgets and who's coming." },
  { key: "guest", label: "Guest", sees: "Only what's shared with everyone: times, places and dress code." },
  { key: "party", label: "Wedding party", sees: "What's shared with everyone, plus the wedding party." },
  { key: "vendor", label: "Vendors", sees: "What's shared with everyone, plus vendors, and each vendor's arrival time." },
];

export function visibleTo(view: WeekendView, a: Audience): boolean {
  if (view === "planning") return true;
  if (a === "all") return true;
  return (view === "party" && a === "party") || (view === "vendor" && a === "vendors");
}

export type DayItem = { id: string; time: string; title: string; location: string; audience?: Audience };
export type Arrival = { id: string; name: string; category: string; arrival_time: string };

export type WeekendEntry = {
  key: string;
  type: "event" | "moment" | "day" | "arrival";
  at: number;
  time: string;
  title: string;
  audience: Audience;
  table: "wedding_events" | "timeline_moments" | "wedding_day_events" | null;
  id: string;
  event?: WeddingEvent;
  moment?: TimelineMoment;
  location?: string;
  href?: string;
  sub?: string;
};

// Group by real date. Wedding-day items and vendor arrivals belong to the wedding date.
export function buildDays(o: { events: WeddingEvent[]; moments: TimelineMoment[]; dayItems: DayItem[]; arrivals: Arrival[]; weddingDate: string | null; hasEventAudience: boolean; hasMomentAudience: boolean }) {
  const days = new Map<string, WeekendEntry[]>();
  const push = (d: string, e: WeekendEntry) => days.set(d, [...(days.get(d) ?? []), e]);
  const wed = o.weddingDate ?? "tbd";
  for (const ev of o.events) push(ev.event_date ?? "tbd", { key: `e-${ev.id}`, type: "event", at: parseMinutes(ev.time), time: ev.time, title: ev.title, audience: o.hasEventAudience ? ((ev as WeddingEvent & { audience?: Audience }).audience ?? "all") : "private", table: "wedding_events", id: ev.id, event: ev, location: ev.location });
  for (const m of o.moments) push(m.moment_date, { key: `m-${m.id}`, type: "moment", at: parseMinutes(m.time), time: m.time, title: m.title, audience: o.hasMomentAudience ? ((m as TimelineMoment & { audience?: Audience }).audience ?? "private") : "private", table: "timeline_moments", id: m.id, moment: m });
  for (const d of o.dayItems) push(wed, { key: `d-${d.id}`, type: "day", at: parseMinutes(d.time), time: d.time, title: d.title, audience: d.audience ?? "private", table: "wedding_day_events", id: d.id, location: d.location, href: "/wedding-day", sub: "Wedding Day" });
  for (const a of o.arrivals) push(wed, { key: `a-${a.id}`, type: "arrival", at: parseMinutes(a.arrival_time), time: a.arrival_time, title: `${a.name} arrives`, audience: "vendors", table: null, id: a.id, href: `/vendors/${a.id}`, sub: a.category });
  for (const list of days.values()) list.sort((x, y) => x.at - y.at);
  const keys = [...days.keys()].sort((a, b) => (a === "tbd" ? 1 : b === "tbd" ? -1 : a.localeCompare(b)));
  return { days, keys };
}
