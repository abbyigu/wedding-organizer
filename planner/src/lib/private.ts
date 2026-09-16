export type PrivateNote = {
  id: string;
  owner_id: string;
  title: string;
  body: string;
  created_at: string;
  updated_at: string;
};

export type Surprise = {
  id: string;
  owner_id: string;
  owner_name: string;
  title: string;
  details: string;
  reveal_on: string | null;
  revealed: boolean;
  created_at: string;
  updated_at: string;
};

export function blankNote(): Partial<PrivateNote> {
  return { title: "New note", body: "" };
}

export function blankSurprise(ownerName: string): Partial<Surprise> {
  return { owner_name: ownerName, title: "New surprise", details: "", reveal_on: null, revealed: false };
}
