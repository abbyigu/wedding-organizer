export type TaskStatus = "ideas" | "todo" | "in_progress" | "waiting" | "decision_needed" | "done";
export type Assignee = "ariel" | "fred" | "together";
export type Priority = "normal" | "high";
export type WeddingDayHandoff = { location?: string; setup?: string; person?: string; vendor?: string; ready_by?: string };

export type PlanningTask = {
  id: string;
  title: string;
  category: string;
  notes: string;
  assigned_to: Assignee;
  status: TaskStatus;
  priority: Priority;
  due_date: string | null;
  effort: string;
  estimated_cost: number | null;
  sort_order: number;
  diy_project_id: string | null;
  // Timeline fields (migration 034) — absent until it has been run.
  start_date?: string | null;
  period?: string | null;
  template_key?: string | null;
  date_manual?: boolean;
  suggested_for?: string | null;
  tags?: string[];
  actual_cost?: number | null;
  vendor_id?: string | null;
  wedding_day?: WeddingDayHandoff;
  created_at: string;
  updated_at: string;
};

export const STATUS_ORDER: TaskStatus[] = ["ideas", "todo", "in_progress", "waiting", "decision_needed", "done"];

export const STATUS_LABELS: Record<TaskStatus, string> = {
  ideas: "Ideas",
  todo: "To do",
  in_progress: "In progress",
  waiting: "Waiting",
  decision_needed: "Decision needed",
  done: "Done",
};

export const CATEGORIES = [
  "Venue",
  "Vendors",
  "Budget",
  "Guests",
  "Travel & Stay",
  "Wedding Party",
  "Attire",
  "Décor & Florals",
  "DIY",
  "Stationery",
  "Food & Drink",
  "Ceremony",
  "Reception",
  "Photography",
  "Music",
  "Beauty",
  "Registry",
  "Rehearsal Dinner",
  "Welcome Party",
  "Brunch",
  "Wedding Day",
  "Other",
] as const;

// Real / Faux / Mixed / DIY / Rental / Vendor / Venue Included — for décor and florals.
export const TAGS = ["Real", "Faux", "Mixed", "DIY", "Rental", "Vendor", "Venue Included"] as const;

// Soft accents only — a category is a small dot and a word, never a coloured card.
const CATEGORY_COLORS: Record<string, string> = {
  Venue: "var(--sage-deep)",
  Vendors: "var(--wood)",
  Budget: "var(--green)",
  Guests: "var(--gold)",
  "Travel & Stay": "var(--wood)",
  "Wedding Party": "var(--wine)",
  Attire: "var(--wood)",
  "Décor & Florals": "var(--wine)",
  DIY: "var(--green)",
  Stationery: "var(--gold)",
  "Food & Drink": "var(--wine)",
  Ceremony: "var(--gold)",
  Reception: "var(--sage-deep)",
  Photography: "var(--sage-deep)",
  Music: "var(--gold)",
  Beauty: "var(--wine)",
  Registry: "var(--sage)",
  "Rehearsal Dinner": "var(--wood)",
  "Welcome Party": "var(--gold)",
  Brunch: "var(--sage)",
  "Wedding Day": "var(--wine)",
  Other: "var(--sage)",
};

export function categoryColor(category: string): string {
  return CATEGORY_COLORS[category] ?? "var(--sage)";
}

export function blankTask(status: TaskStatus, over: Partial<PlanningTask> = {}): Partial<PlanningTask> {
  return {
    title: "New task",
    category: "Other",
    notes: "",
    assigned_to: "together",
    status,
    priority: "normal",
    due_date: null,
    effort: "",
    estimated_cost: null,
    sort_order: 0,
    ...over,
  };
}

export function partnerOf(name: string): "ariel" | "fred" {
  return name.trim().toLowerCase() === "ariel" ? "fred" : "ariel";
}

export function isDueSoon(dueDate: string | null): boolean {
  if (!dueDate) return false;
  const days = (new Date(dueDate + "T00:00:00").getTime() - Date.now()) / 86400000;
  return days >= 0 && days <= 7;
}

export function formatDueDate(dateStr: string, withYear = false): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", ...(withYear && { year: "numeric" }) });
}

export function formatMonthYear(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", { month: "short", year: "numeric" });
}
