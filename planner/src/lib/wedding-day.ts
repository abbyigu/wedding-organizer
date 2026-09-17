export type WeddingDayEvent = {
  id: string;
  time: string;
  title: string;
  location: string;
  notes: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export function blankWeddingDayEvent(sortOrder: number): Partial<WeddingDayEvent> {
  return { time: "", title: "New moment", location: "", notes: "", sort_order: sortOrder };
}
