export type TaskStatus = "ideas" | "todo" | "in_progress" | "waiting" | "decision_needed" | "done";
export type Assignee = "ariel" | "fred" | "together";
export type Priority = "normal" | "high";

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
  "Guests",
  "Food",
  "Attire",
  "Travel",
  "Décor",
  "Budget",
  "Stationery",
  "Ceremony",
  "Photography",
  "Lodging",
  "Other",
] as const;

const CATEGORY_COLORS: Record<string, string> = {
  Venue: "var(--sage)",
  Guests: "var(--gold)",
  Food: "var(--wine)",
  Attire: "var(--wood)",
  Travel: "var(--gold)",
  Décor: "var(--wine)",
  Budget: "var(--green)",
  Stationery: "var(--wood)",
  Ceremony: "var(--gold)",
  Photography: "var(--sage-deep)",
  Lodging: "var(--wood)",
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

export function formatDueDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
