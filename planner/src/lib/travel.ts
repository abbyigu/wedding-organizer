export type HotelBlock = {
  id: string;
  name: string;
  location: string;
  rate: number | null;
  booking_deadline: string | null;
  rooms_reserved: number;
  rooms_available: number;
  min_nights: number;
  booking_link: string;
  notes: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export function formatDueDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function blankHotelBlock(sortOrder: number): Partial<HotelBlock> {
  return {
    name: "New hotel block",
    location: "",
    rate: null,
    booking_deadline: null,
    rooms_reserved: 0,
    rooms_available: 0,
    min_nights: 1,
    booking_link: "",
    notes: "",
    sort_order: sortOrder,
  };
}
