export type DiyStatus = "idea" | "materials_needed" | "making" | "finished";
export type DiyOwner = "ariel" | "fred" | "together" | "helper";

export type ChecklistItem = { text: string; done: boolean };

export type DiyProject = {
  id: string;
  title: string;
  category: string;
  status: DiyStatus;
  materials: string;
  cost_estimate: number | null;
  notes: string;
  sort_order: number;
  reference_image: string;
  owner: DiyOwner;
  quantity: number | null;
  materials_checklist: ChecklistItem[];
  cost_actual: number | null;
  time_estimate: string;
  deadline: string | null;
  instructions_url: string;
  progress_photos: string[];
  related_area: string;
  idea_pin_id: string | null;
  // Absent until migration 043 has been run.
  description?: string;
  qty_done?: number;
  hours_estimate?: number | null;
  start_date?: string | null;
  is_favourite?: boolean;
  finished_at?: string | null;
  created_at: string;
  updated_at: string;
};

export const DIY_STATUS_ORDER: DiyStatus[] = ["idea", "materials_needed", "making", "finished"];

export const DIY_STATUS_LABELS: Record<DiyStatus, string> = {
  idea: "Idea",
  materials_needed: "Materials needed",
  making: "Making",
  finished: "Finished",
};

export const DIY_OWNER_ORDER: DiyOwner[] = ["ariel", "fred", "together", "helper"];

export const DIY_OWNER_LABELS: Record<DiyOwner, string> = {
  ariel: "Ariel",
  fred: "Fred",
  together: "Together",
  helper: "Helper",
};

export function blankDiyProject(status: DiyStatus, sortOrder: number): Partial<DiyProject> {
  return {
    title: "New project",
    category: "Other",
    status,
    materials: "",
    cost_estimate: null,
    notes: "",
    sort_order: sortOrder,
    reference_image: "",
    owner: "together",
    quantity: null,
    materials_checklist: [],
    cost_actual: null,
    time_estimate: "",
    deadline: null,
    instructions_url: "",
    progress_photos: [],
    related_area: "Other",
    idea_pin_id: null,
  };
}

export type MaterialStatus = "need" | "purchased" | "owned";
export const MATERIAL_STATUS_LABEL: Record<MaterialStatus, string> = { need: "Need to buy", purchased: "Purchased", owned: "Already owned" };

export type DiyMaterial = {
  id: string;
  project_id: string;
  name: string;
  qty: number;
  unit: string;
  unit_price: number;
  status: MaterialStatus;
  source: string;
  notes: string;
  sort_order: number;
};

export const materialTotal = (m: Pick<DiyMaterial, "qty" | "unit_price">) => (m.qty || 0) * (m.unit_price || 0);

// One project's money. With a materials list, the list is the truth (already-owned items cost nothing new);
// without one, the older hand-entered estimate/actual still counts.
export function projectCost(p: Pick<DiyProject, "cost_estimate" | "cost_actual">, mats: DiyMaterial[]) {
  if (mats.length > 0) {
    const estimated = mats.filter((m) => m.status !== "owned").reduce((t, m) => t + materialTotal(m), 0);
    const spent = mats.filter((m) => m.status === "purchased").reduce((t, m) => t + materialTotal(m), 0);
    return { estimated, spent, remaining: Math.max(0, estimated - spent), projected: estimated, fromMaterials: true };
  }
  const spent = p.cost_actual ?? 0;
  const estimated = p.cost_estimate ?? p.cost_actual ?? 0;
  return { estimated, spent, remaining: Math.max(0, estimated - spent), projected: p.cost_actual ?? p.cost_estimate ?? 0, fromMaterials: false };
}

// 0-1. Quantity made beats checklist steps when a quantity is set.
export function progressOf(p: Pick<DiyProject, "status" | "quantity" | "qty_done" | "materials_checklist">): number {
  if (p.status === "finished") return 1;
  if (p.quantity && p.quantity > 0) return Math.min(1, (p.qty_done ?? 0) / p.quantity);
  const steps = p.materials_checklist;
  return steps.length ? steps.filter((s) => s.done).length / steps.length : 0;
}

export function hoursOf(p: Pick<DiyProject, "hours_estimate" | "time_estimate">): number {
  if (p.hours_estimate != null) return p.hours_estimate;
  const m = p.time_estimate?.match(/(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hour|hours)\b/i);
  return m ? Number(m[1]) : 0;
}

export const DIY_AREAS = ["Wedding Party", "Reception", "Ceremony", "Stationery", "Décor & Florals", "Guest Experience", "Food & Drink", "Wedding Day", "Other"];
