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
  };
}
