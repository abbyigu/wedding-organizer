export type PrivateNote = {
  id: string;
  owner_id: string;
  title: string;
  body: string;
  created_at: string;
  updated_at: string;
};

export type SurpriseStatus = "idea" | "planning" | "ready" | "done";

export type Surprise = {
  id: string;
  owner_id: string;
  owner_name: string;
  title: string;
  details: string;
  status: SurpriseStatus;
  reveal_on: string | null;
  revealed: boolean;
  created_at: string;
  updated_at: string;
};

// The pipeline a surprise moves through while you're planning it.
export const SURPRISE_STATUS_ORDER: SurpriseStatus[] = ["idea", "planning", "ready", "done"];

export const SURPRISE_STATUSES: Record<SurpriseStatus, string> = {
  idea: "Idea",
  planning: "Planning",
  ready: "Ready",
  done: "Done",
};

export function blankNote(): Partial<PrivateNote> {
  return { title: "New note", body: "" };
}

export function blankSurprise(ownerName: string): Partial<Surprise> {
  return { owner_name: ownerName, title: "New surprise", details: "", status: "idea", reveal_on: null, revealed: false };
}
