export type DiyStatus = "idea" | "in_progress" | "done";
export type DiyProject = {
  id: string;
  title: string;
  category: string;
  status: DiyStatus;
  materials: string;
  cost_estimate: number | null;
  notes: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export const DIY_STATUS_ORDER: DiyStatus[] = ["idea", "in_progress", "done"];

export const DIY_STATUS_LABELS: Record<DiyStatus, string> = {
  idea: "Idea",
  in_progress: "In progress",
  done: "Done",
};

export function blankDiyProject(status: DiyStatus, sortOrder: number): Partial<DiyProject> {
  return { title: "New project", category: "Other", status, materials: "", cost_estimate: null, notes: "", sort_order: sortOrder };
}
