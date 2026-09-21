import type { PlanningTask } from "@/lib/planning-tasks";

// Classic wedding-planning lead times. A milestone's tasks are the Planning
// Board tasks in its categories — edit `categories` to re-route what shows up.
export type TimelineMilestone = {
  months: number; // opens this many months before the wedding; 0 = the final month
  title: string;
  items: { label: string; icon: string }[];
  categories: string[];
  note?: string;
};

export const MILESTONES: TimelineMilestone[] = [
  { months: 24, title: "The big start", items: [{ label: "Book your venue", icon: "venue" }], categories: ["Venue"], note: "Start with the place — everything else follows." },
  {
    months: 18,
    title: "Build your team",
    items: [
      { label: "Photography", icon: "camera" },
      { label: "Stationery", icon: "mail" },
      { label: "Cake", icon: "cake" },
      { label: "Floristry", icon: "flower" },
    ],
    categories: ["Photography", "Stationery", "Food", "Décor"],
  },
  {
    months: 12,
    title: "Your look",
    items: [
      { label: "Bridal gown", icon: "shirt" },
      { label: "Hair & makeup", icon: "sparkles" },
      { label: "Wedding rings", icon: "gem" },
    ],
    categories: ["Attire"],
  },
  { months: 9, title: "The wedding party", items: [{ label: "Suits", icon: "shirt" }, { label: "Bridesmaids", icon: "users" }], categories: ["Ceremony"] },
  { months: 6, title: "Family looks", items: [{ label: "Mother of the bride", icon: "heart" }, { label: "Mother of the groom", icon: "heart" }], categories: ["Guests"] },
  { months: 3, title: "The finishing touches", items: [{ label: "Gifts", icon: "gift" }, { label: "Final details", icon: "list" }], categories: ["Budget", "DIY", "Other"] },
  { months: 0, title: "Relax & enjoy", items: [], categories: [], note: "Everything is coming together." },
];

export type MilestoneState = "upcoming" | "due" | "behind" | "done" | "empty" | "final";

export const monthsLeft = (daysToGo: number) => daysToGo / 30.44;

export function milestoneState(m: TimelineMilestone, tasks: PlanningTask[], daysToGo: number, currentMonths: number) {
  const related = tasks.filter((t) => m.categories.includes(t.category));
  const open = related.filter((t) => t.status !== "done");
  const isOpen = monthsLeft(daysToGo) <= (m.months === 0 ? 1 : m.months);
  let state: MilestoneState;
  if (!isOpen) state = "upcoming";
  else if (m.months === 0) state = "final";
  else if (related.length === 0) state = "empty";
  else if (open.length === 0) state = "done";
  else state = m.months === currentMonths ? "due" : "behind";
  return { related, open, state, opensIn: Math.max(1, Math.ceil(monthsLeft(daysToGo) - (m.months === 0 ? 1 : m.months))) };
}

// The most recently opened milestone (smallest `months` still >= monthsLeft), or null before the first.
export function currentMilestoneMonths(daysToGo: number): number | null {
  const left = monthsLeft(daysToGo);
  const opened = MILESTONES.filter((m) => left <= (m.months === 0 ? 1 : m.months));
  return opened.length ? opened[opened.length - 1].months : null;
}

// 0..1 along the 24m → ♡ axis, interpolated between the milestone stops.
export function axisPosition(daysToGo: number): number {
  const stops = [...MILESTONES.map((m) => m.months === 0 ? 1 : m.months), 0];
  const left = monthsLeft(daysToGo);
  if (left >= stops[0]) return 0;
  for (let i = 0; i < stops.length - 1; i++) {
    if (left <= stops[i] && left >= stops[i + 1]) return (i + (stops[i] - left) / (stops[i] - stops[i + 1])) / (stops.length - 1);
  }
  return 1;
}
