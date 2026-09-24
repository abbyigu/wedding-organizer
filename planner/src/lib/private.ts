// Private space. Everything here is owner-only at the database: a partner can't read these tables at all.
// What a partner can ever see comes through narrow database functions (teasers, revealed surprises, anonymised
// budget and Wedding Day lines), never through these rows.
export const NOTE_CATEGORIES = ["Vows", "Gift Ideas", "Thoughts", "Wedding Day", "Honeymoon", "To Remember", "Other"] as const;
export const LINK_AREAS = ["", "Budget", "Planning Board", "Wedding Day", "Honeymoon", "Events"] as const;

export type PrivateNote = {
  id: string;
  owner_id: string;
  title: string;
  body: string;
  category: string;
  kind: "note" | "writing";
  pinned: boolean;
  cover_path: string | null;
  linked_area: string;
  created_at: string;
  updated_at: string;
};

export type SurpriseStatus = "idea" | "planning" | "ready" | "revealed";
export type RevealMethod = "manual" | "date" | "event";
export type BudgetMode = "hidden" | "amount" | "after_reveal";
export type DayMode = "private" | "anonymized" | "reveal";
export type CheckItem = { id: string; text: string; done: boolean };

export type Surprise = {
  id: string;
  owner_id: string;
  owner_name: string;
  recipient_name: string;
  title: string;
  details: string;
  cover_path: string | null;
  status: SurpriseStatus;
  reveal_method: RevealMethod;
  reveal_on: string | null;
  reveal_time: string | null;
  reveal_event: string;
  teaser: boolean;
  revealed: boolean;
  revealed_at: string | null;
  budget: number | null;
  budget_mode: BudgetMode;
  checklist: CheckItem[];
  notes: string;
  day_time: string;
  day_mode: DayMode;
  linked_area: string;
  created_at: string;
  updated_at: string;
};

export type Teaser = { id: string; owner_name: string; opens_on: string | null };
export type RevealedSurprise = { id: string; owner_name: string; title: string; message: string; cover_path: string | null; revealed_on: string };
export type EventRef = { id: string; title: string; event_date: string | null };

export const SURPRISE_STATUS_ORDER: SurpriseStatus[] = ["idea", "planning", "ready", "revealed"];
export const SURPRISE_STATUSES: Record<SurpriseStatus, string> = { idea: "Idea", planning: "Planning", ready: "Ready", revealed: "Revealed" };
export const BUDGET_MODE_LABELS: Record<BudgetMode, string> = { hidden: "Hide completely from the shared budget", amount: "Show the amount as “Private expense”", after_reveal: "Show the amount now, and the details after the reveal" };
export const DAY_MODE_LABELS: Record<DayMode, string> = { private: "Private: only I see it", anonymized: "Anonymised: they see “Private item”", reveal: "Reveal: they see “Private item”, then the details after the reveal" };
export const REVEAL_METHOD_LABELS: Record<RevealMethod, string> = { manual: "When I reveal it", date: "On a date and time", event: "When a wedding event arrives" };

export const wordCount = (s: string) => (s.trim() ? s.trim().split(/\s+/).length : 0);

// Québec time, which is what the database uses to decide a reveal.
export const torontoToday = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Toronto" });
export const torontoNow = () => new Date().toLocaleString("sv-SE", { timeZone: "America/Toronto" }).slice(0, 16).replace(" ", "T");

export function eventDate(s: Pick<Surprise, "reveal_event">, events: EventRef[], weddingDate: string | null): string | null {
  return s.reveal_event === "wedding-day" ? weddingDate : events.find((e) => e.id === s.reveal_event)?.event_date ?? null;
}

// Mirrors the database rule, for the owner's own screen. The database is what actually decides who sees what.
export function isRevealed(s: Surprise, events: EventRef[], weddingDate: string | null): boolean {
  if (s.revealed) return true;
  if (s.reveal_method === "date" && s.reveal_on) return `${s.reveal_on}T${(s.reveal_time ?? "00:00").slice(0, 5)}` <= torontoNow();
  if (s.reveal_method === "event") {
    const d = eventDate(s, events, weddingDate);
    return d != null && d <= torontoToday();
  }
  return false;
}

export function shortDate(d: string | null | undefined) {
  if (!d) return "";
  return new Date(d.length > 10 ? d : d + "T12:00").toLocaleDateString("en-CA", { month: "short", day: "numeric" });
}

export function revealLabel(s: Surprise, events: EventRef[], weddingDate: string | null): string {
  if (s.reveal_method === "date") return s.reveal_on ? `${shortDate(s.reveal_on)}${s.reveal_time ? ` at ${s.reveal_time.slice(0, 5)}` : ""}` : "Date to choose";
  if (s.reveal_method === "event") {
    const name = s.reveal_event === "wedding-day" ? "Wedding day" : events.find((e) => e.id === s.reveal_event)?.title ?? "Event to choose";
    const d = eventDate(s, events, weddingDate);
    return d ? `${name}, ${shortDate(d)}` : name;
  }
  return "When you reveal it";
}

export function blankNote(kind: PrivateNote["kind"] = "note", category = "Thoughts"): Partial<PrivateNote> {
  return { title: kind === "writing" ? "Untitled writing" : "New note", body: "", kind, category, pinned: false, linked_area: "" };
}

export function blankSurprise(ownerName: string, recipient: string): Partial<Surprise> {
  return { owner_name: ownerName, recipient_name: recipient, title: "New surprise", details: "", status: "idea", reveal_method: "manual", teaser: false, revealed: false, budget_mode: "hidden", checklist: [], notes: "", day_time: "", day_mode: "private", linked_area: "" };
}
